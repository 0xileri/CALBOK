import {reserveUserBudget,UserLimitError} from './user-limits';
import {repeatSeriesTick} from './repeat-series';
import {stopSeriesForReceipt} from './repeat-series-store';
import {exitCandleFinalizedAt} from './settlement-timing';
import {coinbaseCandles} from './coinbase-pricing';
import {binanceCandles} from './binance-pricing';
import {entryPriceTick} from './entry-price';
import {automaticRecall} from './receipt-recall';
import {automaticMemoryTick,queueSettledMemory,backfillSettledMemories} from './automatic-memory';
import {randomUUID} from 'node:crypto';
import {db,hash,listReceipts,ownerOf} from './db';
import {METHOD,settle,type Candle} from './domain';
import {assetCandles,ProviderError} from './providers';
import {parseGmgnAssetId} from './assets';

const LEASE_MS=120_000,MAX_ATTEMPTS=8;
export type SettlementJob={prediction_id:string;status:string;attempts:number;next_attempt_at:string;lease_until:string|null;last_error:string|null;updated_at:string;first_checked_at:string|null};
type Options={runSeries?:()=>Promise<void>;force?:boolean;clock?:()=>number;fetchCandles?:(asset:string,boundary:number)=>Promise<Candle[]>};
export function syncSettlementJobs(now=Date.now()) {
  db().prepare(`INSERT OR IGNORE INTO settlement_jobs(prediction_id,next_attempt_at,updated_at)
    SELECT p.id,p.deadline,? FROM predictions p
    LEFT JOIN settlements s ON s.prediction_id=p.id WHERE s.prediction_id IS NULL`).run(new Date(now).toISOString());
  db().prepare(`UPDATE settlement_jobs SET next_attempt_at=(SELECT p.deadline FROM predictions p WHERE p.id=prediction_id) WHERE status='queued' AND attempts=0 AND next_attempt_at>(SELECT p.deadline FROM predictions p WHERE p.id=prediction_id)`).run();
  db().prepare(`UPDATE settlement_jobs SET status='done',lease_token=NULL,lease_until=NULL,last_error=NULL,updated_at=?
    WHERE status!='done' AND EXISTS(SELECT 1 FROM settlements s WHERE s.prediction_id=settlement_jobs.prediction_id)`).run(new Date(now).toISOString());
  db().prepare(`UPDATE settlement_jobs SET status='paused',lease_token=NULL,lease_until=NULL,last_error='LEASE_RECOVERY_LIMIT_REACHED',updated_at=?
    WHERE status='running' AND attempts>=? AND lease_until<=?`).run(new Date(now).toISOString(),MAX_ATTEMPTS,new Date(now).toISOString());
}
export async function runSettlement(id:string,{force=false,clock=Date.now,fetchCandles=assetCandles}:Options={}):Promise<{message:string;error?:string;result?:ReturnType<typeof settle>}> {
  const receipt=listReceipts().find(row=>row.id===id);
  if(!receipt)return {message:'Receipt not found.'};
  const now=clock(),iso=new Date(now).toISOString();
  if(receipt.outcome){db().prepare("UPDATE settlement_jobs SET status='done',lease_token=NULL,lease_until=NULL,last_error=NULL,updated_at=? WHERE prediction_id=?").run(iso,id);return {message:'This receipt already has an immutable settlement.'};}
  if(now<Date.parse(receipt.deadline))return {message:'Pending: the deadline and exit candle have not finalized.'};
  syncSettlementJobs(now);
  const finalizedAt=exitCandleFinalizedAt(Date.parse(receipt.deadline));
  if(now<finalizedAt){
    db().prepare(`UPDATE settlement_jobs SET first_checked_at=COALESCE(first_checked_at,?),status='retry',next_attempt_at=?,last_error='EXIT_CANDLE_NOT_FINALIZED',updated_at=?
      WHERE prediction_id=? AND (status IN ('queued','retry') OR ?=1) AND (lease_until IS NULL OR lease_until<=?)`)
      .run(iso,new Date(finalizedAt).toISOString(),iso,id,Number(force),iso);
    return {message:'Pending: deadline observed; waiting for the finalized exit candle.'};
  }
  const token=randomUUID();
  const job=db().prepare(`UPDATE settlement_jobs SET status='running',attempts=CASE WHEN status='paused' THEN 1 ELSE attempts+1 END,
    first_checked_at=COALESCE(first_checked_at,?),lease_token=?,lease_until=?,updated_at=? WHERE prediction_id=? AND (lease_until IS NULL OR lease_until<=?)
    AND (?=1 OR (status IN ('queued','retry','running') AND next_attempt_at<=?)) RETURNING attempts`).get(iso,token,new Date(now+LEASE_MS).toISOString(),iso,id,iso,force?1:0,iso) as {attempts:number}|undefined;
  if(!job)return {message:'Settlement is already running, awaiting its next retry, or paused for review.'};
  function defer(code:string) {
    if(code!=='TATUM_CANDLE_NOT_YET_AVAILABLE')stopSeriesForReceipt(id,'PRICE_PROVIDER_FAILURE');
    // Tatum is still inside its grace window (see TATUM_GRACE_MS): check again next minute
    // without spending an attempt. Backups take over once the window ends.
    if(code==='TATUM_CANDLE_NOT_YET_AVAILABLE'){
      const time=clock();
      db().prepare(`UPDATE settlement_jobs SET status='retry',attempts=MAX(0,attempts-1),next_attempt_at=?,lease_token=NULL,lease_until=NULL,last_error=?,updated_at=?
        WHERE prediction_id=? AND lease_token=?`).run(new Date(time+60_000).toISOString(),code,new Date(time).toISOString(),id,token);
      return {message:'Waiting for Tatum to publish the candle. A retry has been scheduled.',error:code};
    }
    const time=clock(),paused=['TATUM_PRICE_BOUNDARY_UNAVAILABLE','TATUM_STALE_CANDLE'].includes(code) || job!.attempts>=MAX_ATTEMPTS;
    db().prepare(`UPDATE settlement_jobs SET status=?,next_attempt_at=?,lease_token=NULL,lease_until=NULL,last_error=?,updated_at=?
      WHERE prediction_id=? AND lease_token=?`).run(paused?'paused':'retry',new Date(time+Math.min(3600_000,60_000*2**(job!.attempts-1))).toISOString(),code,new Date(time).toISOString(),id,token);
    return {message:paused?'Settlement needs manual review. Check provider coverage, then retry manually.':'Evidence unavailable. A retry has been scheduled.',error:code};
  }
  try {
    reserveUserBudget(ownerOf(receipt.id),'provider-reads',clock());
    let pair=await Promise.all([fetchCandles(receipt.asset,Date.parse(receipt.locked_at)),fetchCandles(receipt.asset,Date.parse(receipt.deadline))]);
    if(fetchCandles===assetCandles && pair[0][0]?.provider!==pair[1][0]?.provider && !parseGmgnAssetId(receipt.asset)) {
      // Compare like quotes from one venue; never mix Coinbase USD and Binance USDT.
      if(!pair.some(rows=>rows[0]?.provider==='Binance')) {
        try {pair=await Promise.all([coinbaseCandles(receipt.asset,Date.parse(receipt.locked_at)),coinbaseCandles(receipt.asset,Date.parse(receipt.deadline))]);}
        catch(error) {
          if(!(error instanceof ProviderError) || !['COINBASE_MARKET_UNSUPPORTED','COINBASE_BOUNDARY_UNAVAILABLE'].includes(error.code)) throw error;
        }
      }
      if(pair[0][0]?.provider!==pair[1][0]?.provider) pair=await Promise.all([binanceCandles(receipt.asset,Date.parse(receipt.locked_at)),binanceCandles(receipt.asset,Date.parse(receipt.deadline))]);
    }
    const candles=pair.flat();
    const result=settle(receipt.direction as 'bullish'|'bearish',Date.parse(receipt.locked_at),Date.parse(receipt.deadline),candles,clock());
    if(!['won','lost','neutral'].includes(result.outcome))return defer('PRICE_COVERAGE_UNAVAILABLE');
    if ((result.entry?.provider||'Tatum') !== (result.exit?.provider||'Tatum')) return defer('PRICE_PROVIDER_MISMATCH');
    const database=db(),completed=new Date(clock()).toISOString();
    database.exec('BEGIN IMMEDIATE');
    try {
      const owned=database.prepare('SELECT prediction_id FROM settlement_jobs WHERE prediction_id=? AND lease_token=? AND lease_until>?').get(id,token,completed);
      if(!owned){database.exec('ROLLBACK');return {message:'Settlement lease expired; the queued job will be recovered.'};}
      const evidence=JSON.stringify({...result,provider:parseGmgnAssetId(receipt.asset)?'GMGN':result.entry?.provider||'Tatum',asset:receipt.asset});
      const inserted=database.prepare('INSERT OR IGNORE INTO settlements VALUES (?,?,?,?,?)').run(id,result.outcome,evidence,METHOD,completed);
      if(inserted.changes)database.prepare('INSERT INTO audit_events VALUES (?,?,?,?,?)').run(randomUUID(),id,'prediction_settled',hash(evidence),completed);
      database.prepare("UPDATE settlement_jobs SET status='done',lease_token=NULL,lease_until=NULL,last_error=NULL,updated_at=? WHERE prediction_id=? AND lease_token=?").run(completed,id,token);
      database.exec('COMMIT');
    } catch(error){database.exec('ROLLBACK');throw error;}
    const settledReceipt=listReceipts().find(row=>row.id===id);
    if(settledReceipt) queueSettledMemory(settledReceipt);
    return {message:result.reason,result};
  } catch(error) {
    if(error instanceof UserLimitError){
      db().prepare("UPDATE settlement_jobs SET status='retry',attempts=MAX(0,attempts-1),next_attempt_at=?,lease_token=NULL,lease_until=NULL,last_error='ACCOUNT_PROVIDER_LIMIT',updated_at=? WHERE prediction_id=? AND lease_token=?")
        .run(new Date((Math.floor(clock()/3600_000)+1)*3600_000).toISOString(),new Date(clock()).toISOString(),id,token);
      return {message:error.message,error:'ACCOUNT_PROVIDER_LIMIT'};
    }
    const code=error instanceof ProviderError && /^[A-Z][A-Z0-9_]{0,80}$/.test(error.code)?error.code:'SETTLEMENT_PROVIDER_UNAVAILABLE';
    return defer(code);
  }
}

/** One deployment migration: recover only the stale Tatum failures, once, without rewriting evidence. */
export function requeueStaleSettlementJobs(now=Date.now()) {
  const database=db();
  database.exec('CREATE TABLE IF NOT EXISTS settlement_recoveries (name TEXT PRIMARY KEY)');
  database.exec('BEGIN IMMEDIATE');
  try {
    const claimed=database.prepare("INSERT OR IGNORE INTO settlement_recoveries VALUES ('binance-fallback-v2')").run();
    if(claimed.changes) database.prepare(`UPDATE settlement_jobs SET status='retry',attempts=0,next_attempt_at=?,lease_token=NULL,lease_until=NULL,updated_at=?
      WHERE status='paused' AND last_error IN ('TATUM_STALE_CANDLE','TATUM_PRICE_BOUNDARY_UNAVAILABLE')
      AND NOT EXISTS(SELECT 1 FROM settlements s WHERE s.prediction_id=settlement_jobs.prediction_id)`)
      .run(new Date(now).toISOString(),new Date(now).toISOString());
    database.exec('COMMIT');
  } catch(error) {database.exec('ROLLBACK');throw error;}
}

export function settlementStatus() {
  const database=db();
  const heartbeat=database.prepare('SELECT heartbeat_at,last_error FROM worker_state WHERE id=1').get() as {heartbeat_at:string|null;last_error:string|null}|undefined;
  return {healthy:!!heartbeat?.heartbeat_at && Date.now()-Date.parse(heartbeat.heartbeat_at)<180_000,enabled:process.env.CALBOK_WORKER_ENABLED==='true',heartbeat:heartbeat||null,
    jobs:database.prepare('SELECT prediction_id,status,attempts,next_attempt_at,lease_until,last_error,updated_at,first_checked_at FROM settlement_jobs ORDER BY updated_at DESC LIMIT 100').all() as unknown as SettlementJob[]};
}

export function observeDueDeadlines(now=Date.now()){
  const iso=new Date(now).toISOString();
  // Acknowledge every due deadline cheaply, even when the bounded provider batch is full.
  db().prepare(`UPDATE settlement_jobs SET first_checked_at=COALESCE(first_checked_at,?)
      WHERE status IN ('queued','retry','running') AND next_attempt_at<=?
      AND EXISTS(SELECT 1 FROM predictions p LEFT JOIN prediction_owners o ON o.prediction_id=p.id
        WHERE p.id=settlement_jobs.prediction_id AND p.deadline<=? AND (COALESCE(o.owner_id,'operator')='operator' OR ?=1))`)
      .run(iso,iso,iso,process.env.CALBOK_USER_PROVIDER_ACCESS==='true'?1:0);
}

export async function workerTick({clock=Date.now,fetchCandles=assetCandles,runSeries=repeatSeriesTick}:Options={}) {
  const now=clock(),iso=new Date(now).toISOString(),owner=randomUUID(),database=db();
  database.prepare("INSERT OR IGNORE INTO worker_state(id,next_tick_at) VALUES (1,'1970-01-01T00:00:00.000Z')").run();
  const leader=database.prepare(`UPDATE worker_state SET owner=?,lease_until=?,next_tick_at=?,heartbeat_at=?,last_error=NULL
    WHERE id=1 AND (lease_until IS NULL OR lease_until<=?) AND next_tick_at<=? RETURNING id`).get(owner,new Date(now+LEASE_MS).toISOString(),new Date(now+60_000).toISOString(),iso,iso,iso);
  if(!leader)return;
  try {
    requeueStaleSettlementJobs(now);
    syncSettlementJobs(now);
    backfillSettledMemories();
    observeDueDeadlines(now);
    const due=database.prepare(`SELECT j.prediction_id FROM settlement_jobs j JOIN predictions p ON p.id=j.prediction_id
      LEFT JOIN settlements s ON s.prediction_id=p.id WHERE s.prediction_id IS NULL AND j.status IN ('queued','retry','running')
      AND j.next_attempt_at<=? AND (j.lease_until IS NULL OR j.lease_until<=?)
      AND p.deadline<=? AND (COALESCE((SELECT owner_id FROM prediction_owners WHERE prediction_id=p.id),'operator')='operator' OR ?=1) ORDER BY j.next_attempt_at,j.prediction_id LIMIT 3`).all(iso,iso,iso,process.env.CALBOK_USER_PROVIDER_ACCESS==='true'?1:0) as {prediction_id:string}[];
    for (const job of due) {
      const time = clock();
      const heartbeat = new Date(time).toISOString();
      const renewed = database.prepare('UPDATE worker_state SET lease_until=?,heartbeat_at=? WHERE id=1 AND owner=? AND lease_until>?')
        .run(new Date(time+LEASE_MS).toISOString(),heartbeat,owner,heartbeat);
      if (!renewed.changes) return;
      await runSettlement(job.prediction_id,{clock,fetchCandles});
    }
    if(process.env.CALBOK_WORKER_ENABLED==='true') {
      await entryPriceTick(clock,fetchCandles);
      await automaticMemoryTick();
      await runSeries();
      await automaticRecall('operator');
    }
  } catch {database.prepare("UPDATE worker_state SET last_error='WORKER_TICK_FAILED' WHERE id=1 AND owner=?").run(owner);}
  finally {database.prepare('UPDATE worker_state SET heartbeat_at=?,lease_until=NULL,owner=NULL WHERE id=1 AND owner=?').run(new Date(clock()).toISOString(),owner);}
}

export function startSettlementWorker() {
  const shared=globalThis as typeof globalThis & {calbokSettlementWorker?:ReturnType<typeof setInterval>};
  if(shared.calbokSettlementWorker)return;
  let running=false;
  const tick=async()=>{try{observeDueDeadlines();}catch{console.error('Settlement deadline observation failed.');return;}if(running)return;running=true;try{await workerTick();}catch{console.error('Settlement worker tick failed.');}finally{running=false;}};
  shared.calbokSettlementWorker=setInterval(()=>void tick(),60_000);
  shared.calbokSettlementWorker.unref();
  void tick();
}
