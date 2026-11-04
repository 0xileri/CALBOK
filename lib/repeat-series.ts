import {randomUUID} from 'node:crypto';
import {db,capture,hash,listReceipts,type Receipt} from './db';
import {profileOutcome} from './caller-profiles';
import {automaticMemoryStatus,memorySubmissionInFlight} from './automatic-memory';
import {automaticRecall,memoryHistory,verifiedRecallReview} from './receipt-recall';
import {memoryGroupProgress} from './integration-proof';
import {configuration} from './providers';
import {finishSeries,type RepeatSeries} from './repeat-series-store';
import {lockAgainSeed} from './lock-again';
type Actor={id:string;role:string};
function owner(actor:Actor){return actor.id==='operator'&&actor.role==='operator';}
export function startRepeatSeries(actor:Actor,seedId:string,count:number,requestId:string){
 if(!owner(actor))return {status:403,message:'Owner access required.'};
 if(!Number.isInteger(count)||count<1||count>10)return {status:400,message:'Choose 1–10 additional locks.'};
 const prior=db().prepare('SELECT * FROM repeat_series WHERE owner_id=? AND request_id=?').get(actor.id,requestId) as RepeatSeries|undefined;
 if(prior)return prior.seed_id===seedId&&prior.target_count===count?{status:200,seriesId:prior.id,message:'Series already confirmed.'}:{status:409,message:'Confirmation was already used for different terms.'};
 const history=memoryHistory(actor.id),seed=history.receipts.find(row=>row.id===seedId);
 if(!seed||!['1h','4h'].includes(seed.horizon)||!lockAgainSeed(seed)||!history.completed.some(p=>p.prediction_id===seedId))return {status:409,message:'A verified settled 1h or 4h receipt with confirmed Mainnet memory is required.'};
 const settings=automaticMemoryStatus();
 if(!settings.available||!settings.enabled)return {status:409,message:'Enable the worker and automatic Mainnet memory before starting a series.'};
 const group=JSON.stringify([seed.caller.trim().toLowerCase(),seed.asset,seed.direction,seed.horizon]),id='RS-'+randomUUID(),now=new Date().toISOString();
 const database=db();database.exec('BEGIN IMMEDIATE');
 try{
  if(database.prepare("SELECT 1 FROM repeat_series WHERE owner_id=? AND group_key=? AND status='active'").get(actor.id,group)){database.exec('ROLLBACK');return {status:409,message:'This group already has an active series.'};}
  database.prepare('INSERT INTO repeat_series(id,owner_id,request_id,group_key,seed_id,current_id,target_count,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').run(id,actor.id,requestId,group,seedId,seedId,count,now,now);
  database.prepare('INSERT INTO audit_events VALUES (?,?,?,?,?)').run(randomUUID(),id,'repeat_series_confirmed',hash(JSON.stringify({seedId,count,owner:actor.id})),now);
  database.exec('COMMIT');return {status:200,seriesId:id,message:'Series confirmed. The worker will lock each step only after the prior verified settlement and memory.'};
 }catch(error){database.exec('ROLLBACK');throw error;}
}
export function stopRepeatSeries(actor:Actor,id:string){
 if(!owner(actor))return {status:403,message:'Owner access required.'};
 if(!db().prepare('SELECT 1 FROM repeat_series WHERE id=? AND owner_id=?').get(id,actor.id))return {status:404,message:'Series not found.'};
 finishSeries(id,'OWNER_STOPPED');return {status:200,message:'Future scheduled locks stopped. Existing locked receipts keep their approved normal flow.'};
}
export function repeatSeriesProgress(actor:Actor){
 if(!owner(actor))return [];
 const history=memoryHistory(actor.id),groups=memoryGroupProgress(history.receipts,history.completed);
 return (db().prepare('SELECT * FROM repeat_series WHERE owner_id=? ORDER BY created_at DESC LIMIT 100').all(actor.id) as RepeatSeries[]).map(series=>{
  const current=history.receipts.find(r=>r.id===series.current_id)!,seed=history.receipts.find(r=>r.id===series.seed_id)!;
  const group=groups.find(g=>g.caller.trim().toLowerCase()===seed.caller.trim().toLowerCase()&&g.asset===seed.asset&&g.direction===seed.direction&&g.horizon===seed.horizon);
  return {...series,caller:seed.caller,asset:seed.asset,direction:seed.direction,horizon:seed.horizon,memories:group?.count||0,winRate:group?.winRate??null,nextDeadline:current&&!current.outcome?current.deadline:null};
 });
}
function currentFailure(receipt:Receipt){
 const price=db().prepare('SELECT last_error FROM settlement_jobs WHERE prediction_id=?').get(receipt.id);
 if(price?.last_error&&!['EXIT_CANDLE_NOT_FINALIZED','TATUM_CANDLE_NOT_YET_AVAILABLE'].includes(String(price.last_error)))return 'PRICE_PROVIDER_FAILURE';
 const memory=db().prepare('SELECT * FROM memory_jobs WHERE prediction_id=?').get(receipt.id);
 if(memory&&(['failed','uncertain','manual_review','retryable','manual_retryable'].includes(String(memory.status))||memory.error))return 'MEMORY_FAILURE';
 if(memory?.status==='queued'&&!memory.job_id&&!memorySubmissionInFlight(receipt.id))return 'MEMORY_ACCEPTANCE_UNCONFIRMED';
 return null;
}
type Recall=typeof automaticRecall;
async function confirmRecall(series:RepeatSeries,receipt:Receipt,recall:Recall){
 const database=db();
 const saved=database.prepare('SELECT review,created_at FROM recall_proofs WHERE owner_id=? AND prediction_id=? ORDER BY created_at DESC,rowid DESC LIMIT 1').get(series.owner_id,receipt.id);
 if(saved){let review;try{review=verifiedRecallReview(receipt,series.owner_id,JSON.parse(String(saved.review)),String(saved.created_at));}catch{review=null;}if(!review){finishSeries(series.id,'RECALL_UNCONFIRMED');return false;}database.prepare("UPDATE repeat_series_steps SET recall_state='done' WHERE prediction_id=?").run(receipt.id);if(review?.priority==='caution')finishSeries(series.id,'CAUTION_TRIGGERED');return true;}
 const step=database.prepare('SELECT recall_state,recall_started_at FROM repeat_series_steps WHERE prediction_id=?').get(receipt.id);
 if(!step||!['pending','running'].includes(String(step.recall_state))){finishSeries(series.id,step?.recall_state==='failed'?'RECALL_FAILED':'RECALL_UNCONFIRMED');return false;}
 if(step.recall_state==='running'){
  if(Date.now()-Date.parse(String(step.recall_started_at))>180000)finishSeries(series.id,'RECALL_UNCONFIRMED');
  return false;
 }
 if(!database.prepare("UPDATE repeat_series_steps SET recall_state='running',recall_started_at=? WHERE prediction_id=? AND recall_state='pending'").run(new Date().toISOString(),receipt.id).changes)return false;
 try{
  const review=await recall(series.owner_id,receipt.id);
  if(!review)return false; // Another automatic recall may be in flight; recover its saved proof next tick.
  database.prepare("UPDATE repeat_series_steps SET recall_state='done' WHERE prediction_id=?").run(receipt.id);
  if(review.priority==='caution')finishSeries(series.id,'CAUTION_TRIGGERED');
  return true;
 }catch{database.prepare("UPDATE repeat_series_steps SET recall_state='failed' WHERE prediction_id=?").run(receipt.id);finishSeries(series.id,'RECALL_FAILED');return false;}
}
/** At most one new scheduled lock per worker invocation; no synthetic provider data or timestamps. */
export async function repeatSeriesTick(recall:Recall=automaticRecall){
 const rows=db().prepare("SELECT * FROM repeat_series WHERE status='active' ORDER BY created_at,id").all() as RepeatSeries[];
 for(const series of rows){
  if(!configuration().walrus||!configuration().mainnet||process.env.CALBOK_WORKER_ENABLED!=='true'){finishSeries(series.id,'CONFIGURATION_UNAVAILABLE');continue;}
  if(!automaticMemoryStatus().enabled){finishSeries(series.id,'AUTO_MEMORY_PAUSED');continue;}
  const current=listReceipts(series.owner_id).find(r=>r.id===series.current_id)!;
  const failure=currentFailure(current);if(failure){finishSeries(series.id,failure);continue;}
  if(series.created_count>0){
   if(!await confirmRecall(series,current,recall))continue;
   if(db().prepare('SELECT status FROM repeat_series WHERE id=?').get(series.id)?.status!=='active')continue;
  }
  if(profileOutcome(current)==='unverified'){finishSeries(series.id,'SETTLEMENT_UNVERIFIED');continue;}
  if(!['won','lost','neutral'].includes(profileOutcome(current)))continue;
  const completed=memoryHistory(series.owner_id).completed.find(p=>p.prediction_id===current.id);
  if(!completed){if(db().prepare("SELECT 1 FROM memory_jobs WHERE prediction_id=? AND status='done'").get(current.id))finishSeries(series.id,'MEMORY_PROOF_UNCONFIRMED');continue;}
  if(series.created_count>=series.target_count){finishSeries(series.id,'COUNT_REACHED','completed');continue;}
  if(Date.parse(completed.completed_at)>=Date.now())continue;
  const seed=lockAgainSeed(current)!;
  let id:string;
  try{id=capture(seed.fields as Parameters<typeof capture>[0],series.owner_id,undefined,undefined,current.id,true,{seriesId:series.id,step:series.created_count+1,count:series.target_count,scheduledBy:'operator'});}
  catch(error){if(error instanceof Error&&['SERIES_CHANGED','SERIES_MEMORY_NOT_READY'].includes(error.message))continue;finishSeries(series.id,'LOCK_FAILED');continue;}
  const receipt=listReceipts(series.owner_id).find(r=>r.id===id)!;
  await confirmRecall(series,receipt,recall);
  return;
 }
}
