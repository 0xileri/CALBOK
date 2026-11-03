import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

process.env.CALBOK_DB_PATH=join(mkdtempSync(join(tmpdir(),'calbok-memory-recovery-')),'test.sqlite');
process.env.MEMWAL_PRIVATE_KEY='test-only';
process.env.MEMWAL_ACCOUNT_ID='test-only';
process.env.MEMWAL_NETWORK='mainnet';
process.env.CALBOK_WORKER_ENABLED='true';

const {capture,db,listReceipts}=await import('../lib/db');
const {automaticMemoryStatus,automaticMemoryTick,rememberReceipt,reconcileMemory,setAutomaticMemory}=await import('../lib/automatic-memory');
type Factory=NonNullable<Parameters<typeof rememberReceipt>[3]>;
type Client=Awaited<ReturnType<Factory>>;
function fake(overrides: Partial<Client>): Factory {
  const unexpected=async()=>{throw new Error('Unexpected provider call');};
  return async()=>({remember:unexpected,waitForRememberJob:unexpected,getRememberStatus:unexpected,recall:unexpected,listMemories:unexpected,...overrides});
}
function verified(label:string) {
  const id=capture({caller:'TEST',text:'SYNTHETIC RECOVERY TEST '+label,asset:'BTC',direction:'bullish',horizon:'1h',sourceUrl:''});
  const row=listReceipts('operator').find(receipt=>receipt.id===id)!;
  const candle=(openTime:number,open:string)=>({openTime,closeTime:openTime+60_000,open,high:'120',low:'80',close:open,hash:'a'.repeat(64)});
  const evidence={asset:'BTC',provider:'Tatum',outcome:'lost',returnPct:'-10.00000000',entry:candle(Date.parse(row.locked_at),'100'),exit:candle(Date.parse(row.deadline),'90')};
  db().prepare('INSERT INTO settlements VALUES (?,?,?,?,?)').run(id,'lost',JSON.stringify(evidence),'directional-open-v1',new Date().toISOString());
  return listReceipts('operator').find(receipt=>receipt.id===id)!;
}
function job(id:string) {
  return db().prepare('SELECT * FROM memory_jobs WHERE prediction_id=?').get(id);
}
function emptyList() {
  return {memories:[],next_cursor:null,has_more:false,snapshot_version:1,deleted:[],must_resync:false};
}

test('failed submissions, reconciliation, and due polling preserve job identity and the automatic budget',async()=>{
  try {
    const first=verified('definite failure');
    automaticMemoryStatus();
    setAutomaticMemory(true);
    const refused=Object.assign(new Error('Test connect refused'),{code:'ECONNREFUSED',syscall:'connect'});
    const result=await rememberReceipt(first,'operator',true,fake({remember:async()=>{throw new TypeError('Test fetch failed',{cause:refused});}}));
    assert.equal(result.status,503);
    assert.equal(job(first.id)?.status,'retryable');
    assert.equal(automaticMemoryStatus().used,0);

    let submits=0, polls=0;
    const accepted=fake({
      remember:async()=>{submits++;return {job_id:'test-job-1',status:'pending'};},
      getRememberStatus:async id=>{polls++;return {job_id:id,status:polls===1?'pending':'done',...(polls===1?{}:{blob_id:'test-blob-1'})};}
    });
    const started=await rememberReceipt(first,'operator',true,accepted);
    assert.equal(started.status,202);
    assert.equal(polls,0);
    assert.equal(job(first.id)?.error,null);
    assert.equal(automaticMemoryStatus().used,1);
    const second=verified('uncertain missing ID');
    const now=Date.now();
    await automaticMemoryTick(accepted,()=>now);
    assert.equal(polls,1);
    assert.equal(submits,1);
    assert.equal(job(second.id),undefined);
    assert.equal(job(first.id)?.error,null);
    await automaticMemoryTick(fake({remember:async()=>({job_id:'',status:'pending'})}),()=>now+1000);
    assert.equal(job(second.id)?.status,'uncertain');
    assert.match(String(job(second.id)?.error),/uncertain/);
    assert.equal(automaticMemoryStatus().used,2);
    await automaticMemoryTick(accepted,()=>now+2000);
    assert.equal(polls,1);
    assert.equal(submits,1);
    await automaticMemoryTick(accepted,()=>now+60_000);
    assert.equal(polls,2);
    assert.equal(job(first.id)?.blob_id,'test-blob-1');
    assert.equal(job(first.id)?.status,'done');

    let attempts=0;
    assert.equal((await rememberReceipt(second,'operator',false,fake({remember:async()=>{attempts++;return {job_id:'duplicate',status:'pending'};}}))).status,409);
    assert.equal(attempts,0);
    assert.equal((await reconcileMemory(second,fake({recall:async()=>({results:[],total:0})}))).status,409);
    assert.equal(job(second.id)?.status,'uncertain');
    const namespace=String(job(second.id)?.namespace);
    const recovered=await reconcileMemory(second,fake({
      recall:async()=>({results:[{blob_id:'recovered-blob',text:JSON.stringify({predictionId:second.id}),distance:0}],total:1}),
      listMemories:async()=>({...emptyList(),memories:[{
        memory_id:'recovered-job',namespace_id:namespace,blob_id:'recovered-blob',created_at:new Date().toISOString(),
        updated_at:new Date().toISOString(),size:1,agent_id:null,package_id:null,status:'done',end_epoch:null,expires_at:null,importance:null
      }]}),
      getRememberStatus:async id=>({job_id:id,status:'done',blob_id:'recovered-blob'})
    }));
    assert.equal(recovered.status,200);
    assert.equal(job(second.id)?.job_id,'recovered-job');
    assert.equal(job(second.id)?.blob_id,'recovered-blob');

    const third=verified('manual timeout');
    await rememberReceipt(third,'operator',false,fake({remember:async()=>{throw new Error('Test timeout');}}));
    assert.equal(job(third.id)?.status,'uncertain');
    db().prepare("UPDATE memory_jobs SET status='running',job_id='failed-job' WHERE prediction_id=?").run(third.id);
    const missing=await reconcileMemory(third,fake({getRememberStatus:async id=>({job_id:id,status:'not_found'})}));
    assert.equal(missing.status,202);
    assert.equal(job(third.id)?.job_id,'failed-job');
    await reconcileMemory(third,fake({getRememberStatus:async id=>({job_id:id,status:'failed'})}));
    assert.equal(job(third.id)?.status,'retryable');
    assert.equal(job(third.id)?.job_id,null);
  } finally {
    db().close();
  }
});
