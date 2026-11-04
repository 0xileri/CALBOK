import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

process.env.CALBOK_DB_PATH=join(mkdtempSync(join(tmpdir(),'calbok-memory-queue-')),'test.sqlite');
process.env.MEMWAL_PRIVATE_KEY='test-only';
process.env.MEMWAL_ACCOUNT_ID='test-only';
process.env.MEMWAL_NETWORK='mainnet';
process.env.CALBOK_WORKER_ENABLED='true';

const {capture,db,listReceipts}=await import('../lib/db');
const {automaticMemoryStatus,automaticMemoryTick,rememberReceipt,reconcileMemory,setAutomaticMemory,backfillSettledMemories,queueSettledMemory}=await import('../lib/automatic-memory');
type Factory=NonNullable<Parameters<typeof rememberReceipt>[3]>;
type Client=Awaited<ReturnType<Factory>>;
function fake(overrides: Partial<Client>): Factory {
  const unexpected=async()=>{throw new Error('Unexpected provider call');};
  return async()=>({remember:unexpected,waitForRememberJob:unexpected,getRememberStatus:unexpected,recall:unexpected,listMemories:unexpected,...overrides});
}
function verified(label:string,outcome:'won'|'lost'|'neutral'='lost') {
  const id=capture({caller:'TEST',text:'SYNTHETIC RECOVERY TEST '+label,asset:'BTC',direction:'bullish',horizon:'1h',sourceUrl:''});
  const row=listReceipts('operator').find(receipt=>receipt.id===id)!;
  const candle=(openTime:number,open:string)=>({openTime,closeTime:openTime+60_000,open,high:'120',low:'80',close:open,hash:'a'.repeat(64)});
  const evidence={asset:'BTC',provider:'Tatum',outcome,returnPct:outcome==='lost'?'-10.00000000':outcome==='won'?'10.00000000':'0.00000000',entry:candle(Date.parse(row.locked_at),'100'),exit:candle(Date.parse(row.deadline),outcome==='lost'?'90':outcome==='won'?'110':'100')};
  db().prepare('INSERT INTO settlements VALUES (?,?,?,?,?)').run(id,outcome,JSON.stringify(evidence),'directional-open-v1',new Date().toISOString());
  return listReceipts('operator').find(receipt=>receipt.id===id)!;
}
function job(id:string) {
  return db().prepare('SELECT * FROM memory_jobs WHERE prediction_id=?').get(id);
}
test('operator default, backfill, duplicate protection, dispatch throttle, failure backoff and budget',async(t)=>{
 try {
  assert.equal(automaticMemoryStatus().enabled,true);
  const first=verified('queue one');verified('queue two','won');verified('queue neutral','neutral');
  backfillSettledMemories();backfillSettledMemories();queueSettledMemory(first);
  assert.equal(db().prepare('SELECT COUNT(*) n FROM automatic_memory_queue').get()?.n,3);
  setAutomaticMemory(false);let submits=0;
  const accepted=fake({remember:async()=>({job_id:'job-'+(++submits),status:'pending'}),getRememberStatus:async id=>({job_id:id,status:'pending'})});
  await automaticMemoryTick(accepted);assert.equal(submits,0);
  setAutomaticMemory(true);const now=Date.now();
  await automaticMemoryTick(accepted,()=>now);await automaticMemoryTick(accepted,()=>now);
  assert.equal(submits,1);
  await automaticMemoryTick(accepted,()=>now+1000);assert.equal(submits,1);
  const running=listReceipts('operator').find(r=>job(r.id)?.status==='running')!;
  await reconcileMemory(running,fake({getRememberStatus:async id=>({job_id:id,status:'failed'})}));
  assert.equal(automaticMemoryStatus().used,0);
  assert.equal(job(running.id)?.status,'retryable');
  assert.ok(Date.parse(String(db().prepare('SELECT due_at FROM automatic_memory_queue WHERE prediction_id=?').get(running.id)?.due_at))>now);
  // Exhaustion stays manual-only even though the global budget was refunded.
  db().prepare('UPDATE automatic_memory_queue SET failures=7,due_at=? WHERE prediction_id=?').run(new Date(0).toISOString(),running.id);
  await rememberReceipt(running,'operator',true,accepted);
  await reconcileMemory(running,fake({getRememberStatus:async id=>({job_id:id,status:'failed'})}));
  assert.equal(job(running.id)?.status,'manual_retryable');
  for(let i=0;i<12;i++)verified('budget '+i);
  for(let i=1;i<240;i++)await automaticMemoryTick(accepted,()=>now+i*60000);
  assert.equal(automaticMemoryStatus().used,10);
  assert.equal(submits,12); // two refunded failures, then ten budgeted writes
  assert.equal(job(running.id)?.status,'manual_retryable');
  const completion=verified('completion recall');
  t.mock.timers.enable({apis:['Date'],now:Date.now()+60000});
  const target=capture({caller:'TEST',text:'SYNTHETIC NEXT CALL FOR RECALL',asset:'BTC',direction:'bullish',horizon:'1h',sourceUrl:''});
  t.mock.timers.reset();
  let recalls=0;
  await rememberReceipt(completion,'operator',false,fake({
    remember:async()=>({job_id:'completion-job',status:'pending'}),
    waitForRememberJob:async id=>({id,job_id:id,blob_id:'completion-blob',owner:'test-owner',namespace:'test'}),
    recall:async()=>{recalls++;return {results:[{blob_id:'completion-blob',text:JSON.stringify({predictionId:completion.id}),distance:0}],total:1};}
  }));
  assert.equal(recalls,1,'Confirmed completion triggers owner recall immediately');
  assert.ok(db().prepare('SELECT 1 FROM recall_proofs WHERE prediction_id=?').get(target));
  backfillSettledMemories();
  await automaticMemoryTick(accepted,()=>now+99999999);
  assert.equal(recalls,1,'Completed jobs and existing recall proofs are not duplicated');
 }finally{db().close();}
});

