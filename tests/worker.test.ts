import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
const directory=mkdtempSync(join(tmpdir(),'calbok-worker-test-'));
process.env.CALBOK_DB_PATH=join(directory,'worker.sqlite');
const {db,capture,hash,listReceipts}=await import('../lib/db');
const {runSettlement,workerTick}=await import('../lib/settlement-worker');
const {ProviderError}=await import('../lib/providers');
const now=Math.floor(Date.now()/60_000)*60_000;
const clock=()=>now;
function due() {
  const id=`CB-${randomUUID()}`,deadline=now-120_000,locked=deadline-86400_000;
  db().prepare('INSERT INTO predictions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,'SYNTHETIC WORKER TEST','BTC','bullish','24h','Synthetic test only','',new Date(locked).toISOString(),new Date(deadline).toISOString(),id,hash(id),'test','{}');
  return {id,locked,deadline};
}
const prices=async(_asset:string,boundary:number)=>[{openTime:boundary,closeTime:boundary+60_000,open:boundary<now-86400_000?'100':'110',high:'120',low:'90',close:'110',hash:'test-only'}];

test('durable worker: deadlines, overlapping checks, retries, pause, and lease recovery',async()=>{
  try {
    const future=capture({caller:'SYNTHETIC FUTURE TEST',text:'Synthetic future test only',asset:'BTC',direction:'bullish',horizon:'24h',sourceUrl:''});
    let calls=0;
    const futureResult=await runSettlement(future,{clock,fetchCandles:async()=>{calls++;return [];}});
    assert.match(futureResult.message,/deadline/);assert.equal(calls,0);

    const {logInbox}=await import('../lib/call-inbox');
    const claim={caller:'TEST OWNER',text:'Synthetic promotion test',asset:'BTC',direction:'bullish',horizon:'24h',sourceUrl:''} as const;
    const logged=logInbox('operator',{...claim,requestId:randomUUID()});
    assert.throws(()=>capture(claim,'another-owner',undefined,logged.id),/INBOX_NOT_FOUND/);
    const promoted=capture(claim,'operator',undefined,logged.id);
    const promotedReceipt=listReceipts('operator').find(row=>row.id===promoted)!;
    assert.equal(promotedReceipt.inbox_id,logged.id);
    assert.equal(Date.parse(promotedReceipt.deadline)-Date.parse(promotedReceipt.locked_at),86_400_000);

    const first=due();
    let release!:()=>void;
    const gate=new Promise<void>(resolve=>{release=resolve;});
    const pending=runSettlement(first.id,{clock,fetchCandles:async(asset,boundary)=>{calls++;await gate;return prices(asset,boundary);}});
    const overlap=await runSettlement(first.id,{clock,force:true,fetchCandles:prices});
    assert.match(overlap.message,/already running/);assert.equal(calls,2);
    release();assert.equal((await pending).result?.outcome,'won');
    await runSettlement(first.id,{clock,force:true,fetchCandles:prices});
    assert.equal(db().prepare('SELECT COUNT(*) n FROM settlements WHERE prediction_id=?').get(first.id)?.n,1);
    assert.equal(db().prepare("SELECT COUNT(*) n FROM audit_events WHERE entity_id=? AND action='prediction_settled'").get(first.id)?.n,1);

    const failed=due();
    const fail=async()=>{throw new ProviderError('TEST_PROVIDER_DOWN');};
    await runSettlement(failed.id,{clock,fetchCandles:fail});
    const job=db().prepare('SELECT * FROM settlement_jobs WHERE prediction_id=?').get(failed.id)!;
    assert.equal(job.status,'retry');assert.equal(job.attempts,1);assert.ok(Date.parse(String(job.next_attempt_at))>now);
    let unexpected=0;
    await runSettlement(failed.id,{clock,fetchCandles:async()=>{unexpected++;return [];}});assert.equal(unexpected,0);
    for(let i=1;i<8;i++)await runSettlement(failed.id,{clock,force:true,fetchCandles:fail});
    assert.equal(db().prepare('SELECT status FROM settlement_jobs WHERE prediction_id=?').get(failed.id)?.status,'paused');
    await workerTick({clock,fetchCandles:async()=>{unexpected++;return [];}});assert.equal(unexpected,0,'Paused and future jobs must not spend provider reads');
    await runSettlement(failed.id,{clock,force:true,fetchCandles:prices});
    assert.equal(db().prepare('SELECT status FROM settlement_jobs WHERE prediction_id=?').get(failed.id)?.status,'done');

    const expired=due();let time=now;
    let unblock!:()=>void;const hold=new Promise<void>(resolve=>{unblock=resolve;});
    const stale=runSettlement(expired.id,{clock:()=>time,fetchCandles:async(a,b)=>{await hold;return prices(a,b);}});
    time+=121_000;
    const recovered=await runSettlement(expired.id,{clock:()=>time,fetchCandles:prices});
    assert.equal(recovered.result?.outcome,'won');
    unblock();assert.match((await stale).message,/lease expired/);
    assert.equal(db().prepare('SELECT COUNT(*) n FROM settlements WHERE prediction_id=?').get(expired.id)?.n,1);

    const missing=due();await runSettlement(missing.id,{clock,fetchCandles:async()=>[]});
    assert.equal(db().prepare('SELECT COUNT(*) n FROM settlements WHERE prediction_id=?').get(missing.id)?.n,0);
    assert.equal(db().prepare('SELECT last_error FROM settlement_jobs WHERE prediction_id=?').get(missing.id)?.last_error,'PRICE_COVERAGE_UNAVAILABLE');
    const connection=new DatabaseSync(process.env.CALBOK_DB_PATH!);
    assert.equal(connection.prepare('SELECT status FROM settlement_jobs WHERE prediction_id=?').get(missing.id)?.status,'retry');connection.close();
    const crashed=due();
    db().prepare("INSERT INTO settlement_jobs(prediction_id,status,attempts,next_attempt_at,lease_token,lease_until,updated_at) VALUES (?,'running',8,?,'crashed',?,?)").run(crashed.id,new Date(now-180_000).toISOString(),new Date(now-1).toISOString(),new Date(now-180_000).toISOString());
    await runSettlement(crashed.id,{clock,fetchCandles:async()=>{throw new Error('Must not read after the crash recovery limit');}});
    assert.equal(db().prepare('SELECT status,last_error FROM settlement_jobs WHERE prediction_id=?').get(crashed.id)?.last_error,'LEASE_RECOVERY_LIMIT_REACHED');
    db().prepare("UPDATE settlement_jobs SET status='paused' WHERE prediction_id=?").run(missing.id);
    const batch=Array.from({length:4},()=>due());let batchCalls=0;
    const counted=async(asset:string,boundary:number)=>{batchCalls++;return prices(asset,boundary);};
    await workerTick({clock:()=>now+61_000,fetchCandles:counted});
    assert.equal(batchCalls,6,'One tick must process at most three receipts / six candle reads');
    assert.equal(batch.filter(row=>db().prepare('SELECT outcome FROM settlements WHERE prediction_id=?').get(row.id)).length,3);
    await workerTick({clock:()=>now+61_000,fetchCandles:counted});
    assert.equal(batchCalls,6,'Another instance cannot spend a second batch within the same minute');
    await workerTick({clock:()=>now+122_000,fetchCandles:counted});
    assert.equal(batchCalls,8);assert.equal(batch.filter(row=>db().prepare('SELECT outcome FROM settlements WHERE prediction_id=?').get(row.id)).length,4);
    assert.equal(db().prepare('SELECT COUNT(*) n FROM memory_jobs').get()?.n,0,'Settlement must never submit a memory write');
  } finally {db().close();assert.ok(resolve(directory).startsWith(resolve(tmpdir())+sep));rmSync(directory,{recursive:true,force:true});}
});
