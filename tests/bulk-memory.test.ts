import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

process.env.CALBOK_DB_PATH=join(mkdtempSync(join(tmpdir(),'calbok-bulk-memory-')),'test.sqlite');
process.env.MEMWAL_PRIVATE_KEY='test-only';
process.env.MEMWAL_ACCOUNT_ID='test-only';
process.env.MEMWAL_NETWORK='mainnet';
process.env.CALBOK_WORKER_ENABLED='true';

const {capture,db,listReceipts}=await import('../lib/db');
const {automaticMemoryStatus,automaticMemoryTick,setAutomaticMemory,backfillSettledMemories,rememberAllSettled}=await import('../lib/automatic-memory');
type Factory=NonNullable<Parameters<typeof import('../lib/automatic-memory').rememberReceipt>[3]>;
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

process.env.CALBOK_ADMIN_TOKEN='SYNTHETIC_BULK_MEMORY_ADMIN_32_CHARS';
process.env.CALBOK_PUBLIC_ORIGIN='https://calbok.example';
const {createSession}=await import('../lib/auth');
const {GET,POST}=await import('../app/api/automatic-memory/route');
test('32 settlements with eight existing jobs expose 24 queued; owner approval drains the backlog once at the same rate',async()=>{
 try{
  const receipts=Array.from({length:32},(_,i)=>verified('bulk '+i));automaticMemoryStatus();
  for(const receipt of receipts.slice(0,8)){
   db().prepare("INSERT INTO memory_jobs(prediction_id,namespace,status,job_id,blob_id) VALUES (?,'test','done',?,?)").run(receipt.id,'prior-job-'+receipt.id,'prior-blob-'+receipt.id);
   db().prepare('INSERT INTO automatic_memory_attempts VALUES (?,?)').run(receipt.id,new Date().toISOString());
  }
  backfillSettledMemories();backfillSettledMemories();setAutomaticMemory(false);
  assert.equal(automaticMemoryStatus().queued,24);assert.equal(automaticMemoryStatus().limit,10);
  assert.equal(db().prepare('SELECT COUNT(*) n FROM automatic_memory_queue').get()?.n,24);
  assert.equal(rememberAllSettled({id:'other',role:'operator'}).status,403);
  const owner=createSession({id:'operator',role:'operator',email:null}),member=createSession({id:'member',role:'user',email:'member@example.test'});
  const request=(token?:string,origin='https://calbok.example')=>new Request('https://calbok.example/api/automatic-memory',{method:'POST',headers:{origin,'Content-Type':'application/json',...(token?{cookie:'calbok_session='+token}:{})},body:JSON.stringify({action:'remember-all'})});
  assert.equal((await POST(request())).status,403);assert.equal((await POST(request(member))).status,403);assert.equal((await POST(request(owner,'https://evil.example'))).status,403);
  assert.equal((await GET(new Request('https://calbok.example/api/automatic-memory'))).status,403);
  const approved=await(await POST(request(owner))).json();assert.equal(approved.limit,32);assert.equal(approved.queued,24);assert.equal(approved.enabled,true);
  assert.equal((await(await POST(request(owner))).json()).limit,32,'Repeated approval cannot inflate the budget');
  assert.equal(db().prepare('SELECT COUNT(*) n FROM memory_jobs').get()?.n,8,'Approval queues work without submitting provider writes');
  let writes=0;const factory=fake({remember:async()=>({job_id:'bulk-job-'+(++writes),status:'pending'}),getRememberStatus:async id=>({job_id:id,status:'done',blob_id:'bulk-blob-'+id})});
  const now=Date.now();for(let i=0;i<100;i++)await automaticMemoryTick(factory,()=>now+i*60000);
  assert.equal(writes,24);assert.equal(automaticMemoryStatus().used,32);assert.equal(automaticMemoryStatus().queued,0);
  assert.equal(db().prepare('SELECT COUNT(*) n FROM memory_jobs').get()?.n,32);
  assert.equal(db().prepare("SELECT COUNT(*) n FROM memory_jobs WHERE status='done'").get()?.n,32);
  assert.equal(rememberAllSettled({id:'operator',role:'operator'}).status,200);assert.equal(automaticMemoryStatus().limit,32);
 }finally{db().close();}
});
