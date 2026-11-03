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
const {automaticMemoryStatus,automaticMemoryTick,rememberReceipt,reconcileMemory,resolveMemoryReview,setAutomaticMemory}=await import('../lib/automatic-memory');
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
    let firstKey: string | undefined;
    const result=await rememberReceipt(first,'operator',true,fake({remember:async(_text,options)=>{
      firstKey=typeof options==='object'?options.idempotencyKey:undefined;
      assert.ok(firstKey);
      throw new TypeError('Test fetch failed',{cause:refused});}}));
    assert.equal(result.status,503);
    assert.equal(job(first.id)?.status,'retryable');
    assert.equal(automaticMemoryStatus().used,0);

    let submits=0, polls=0;
    const accepted=fake({
      remember:async(_text,options)=>{
        assert.deepEqual(options,{idempotencyKey:firstKey});
        submits++;return {job_id:'test-job-1',status:'pending'};},
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
    }));
    assert.equal(recovered.status,200);
    assert.equal(job(second.id)?.status,'manual_review');
    assert.equal(job(second.id)?.job_id,null);
    assert.equal(job(second.id)?.blob_id,'recovered-blob');
    const owner={id:'operator',role:'operator',email:'owner@example.test'};
    assert.equal(resolveMemoryReview(second.id,'link','recovered-blob',{...owner,role:'user'}).status,403);
    assert.equal(resolveMemoryReview(second.id,'link','wrong-blob',owner).status,409);
    assert.equal(resolveMemoryReview(second.id,'link','recovered-blob',owner).status,200);
    assert.equal(resolveMemoryReview(second.id,'fail','recovered-blob',owner).status,409);
    assert.equal(job(second.id)?.status,'done');
    assert.equal(job(second.id)?.job_id,null);
    const resolution=db().prepare('SELECT * FROM memory_review_resolutions WHERE prediction_id=?').get(second.id);
    assert.equal(resolution?.resolved_by,owner.email);
    assert.equal(resolution?.resolved_at,job(second.id)?.completed_at);
    assert.equal(resolution?.decision,'link');
    assert.equal(db().prepare('SELECT 1 FROM memory_completion_proofs WHERE prediction_id=?').get(second.id),undefined);

    const third=verified('manual timeout');
    await rememberReceipt(third,'operator',false,fake({remember:async()=>{throw new Error('Test timeout');}}));
    assert.equal(job(third.id)?.status,'uncertain');
    db().prepare("UPDATE memory_jobs SET status='running',job_id='failed-job' WHERE prediction_id=?").run(third.id);
    const missing=await reconcileMemory(third,fake({getRememberStatus:async id=>({job_id:id,status:'not_found'})}));
    assert.equal(missing.status,202);
    assert.equal(job(third.id)?.job_id,'failed-job');
    await reconcileMemory(third,fake({getRememberStatus:async id=>({job_id:id,status:'failed'})}));
    assert.equal(job(third.id)?.status,'manual_retryable');
    assert.equal(job(third.id)?.job_id,null);

    await testReconciledRefund();
    await automaticMemoryTick(fake({}));
    assert.equal(job(third.id)?.status,'manual_retryable');
    const manualRetry=await rememberReceipt(third,'operator',false,fake({
      remember:async()=>({job_id:'manual-retry',status:'pending'}),
      waitForRememberJob:async id=>({id,job_id:id,blob_id:'manual-retry-blob',owner:'test-owner',namespace:'test'})
    }));
    assert.equal(manualRetry.status,200);

    const rejected=verified('owner rejects matching blob');
    await rememberReceipt(rejected,'operator',true,fake({remember:async()=>{throw new Error('Test timeout');}}));
    db().prepare("UPDATE memory_jobs SET status='manual_review',blob_id='candidate' WHERE prediction_id=?").run(rejected.id);
    const before=automaticMemoryStatus().used;
    assert.equal(resolveMemoryReview(rejected.id,'fail','candidate',owner).status,200);
    assert.equal(job(rejected.id)?.status,'manual_retryable');
    assert.equal(job(rejected.id)?.blob_id,null);
    assert.equal(automaticMemoryStatus().used,before-1);
    const failure=db().prepare('SELECT decision,resolved_by,resolved_at FROM memory_review_resolutions WHERE prediction_id=?').get(rejected.id);
    assert.equal(failure?.decision,'fail');
    assert.equal(failure?.resolved_by,owner.email);
    assert.ok(Number.isFinite(Date.parse(String(failure?.resolved_at))));
    await testManualPolling();
  } finally {
    db().close();
  }
});

async function testReconciledRefund() {
  const receipt=verified('automatic reconciliation refund');
  const keys: unknown[]=[];
  const submit=fake({remember:async(_text,options)=>{
    keys.push(options);
    return {job_id:'refund-job',status:'pending'};
  }});
  await rememberReceipt(receipt,'operator',true,submit);
  const budget=automaticMemoryStatus().used;
  await reconcileMemory(receipt,fake({getRememberStatus:async id=>({job_id:id,status:'failed'})}));
  assert.equal(automaticMemoryStatus().used,budget-1);
  assert.equal(job(receipt.id)?.status,'retryable');
  await automaticMemoryTick(submit);
  assert.equal(job(receipt.id)?.status,'running');
  assert.equal(automaticMemoryStatus().used,budget);
  assert.equal(keys.length,2);
  assert.notDeepEqual(keys[0],keys[1]);
  await reconcileMemory(receipt,fake({getRememberStatus:async id=>({job_id:id,status:'done',blob_id:'refund-blob'})}));
}

async function testManualPolling() {
  setAutomaticMemory(false);
  const receipt=verified('manual pending');
  const started=await rememberReceipt(receipt,'operator',false,fake({
    remember:async()=>({job_id:'manual-job',status:'pending'}),
    waitForRememberJob:async()=>{throw new Error('Test confirmation timeout');}
  }));
  assert.equal(started.status,202);
  const budget=automaticMemoryStatus().used;
  let polls=0;
  const provider=fake({getRememberStatus:async id=>{
    assert.equal(id,'manual-job');
    polls++;
    return polls===1 ? {job_id:id,status:'not_found'} : {job_id:id,status:'done',blob_id:'manual-blob'};
  }});
  const now=Date.now();
  await automaticMemoryTick(provider,()=>now);
  assert.equal(job(receipt.id)?.status,'running');
  assert.equal(job(receipt.id)?.job_id,'manual-job');
  await automaticMemoryTick(provider,()=>now+30_000);
  assert.equal(polls,1);
  await automaticMemoryTick(provider,()=>now+60_000);
  assert.equal(polls,2);
  assert.equal(job(receipt.id)?.blob_id,'manual-blob');
  assert.equal(automaticMemoryStatus().used,budget);
}
