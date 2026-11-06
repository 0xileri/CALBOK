/** Read-only proof observer, with explicitly confirmed normal prospective locks only.
 * Never loads .env files, touches SQLite, settles calls, submits memories or resolves jobs.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import type {Receipt} from '../lib/db';
import type {MemoryJob} from '../lib/memory-ledger';
import type {IntegrationProof} from '../lib/integration-proof';
import type {RecallReview} from '../lib/recall-types';

const ORIGIN='https://calbok.xyz';
const GROUP={caller:'@CryptoKaleo',asset:'BTC',direction:'bearish' as const,horizon:'15m' as const};
const POLL_MS=5*60_000;
const LOCK_CAP=7;
let OUTPUT=resolve('docs/proof/caution-loop-2026-11.md');
let followUp: {id:string;baseline:string[]}|undefined;
type Workspace={settlement?:{jobs:{prediction_id:string;status:string;updated_at:string}[]};receipts:Receipt[];memoryJobs:MemoryJob[];recallReviews:Record<string,RecallReview>};
type Series={id:string;caller:string;asset:string;direction:string;horizon:string;status:string;stop_reason:string|null;seed_id:string;current_id:string;target_count:number;created_count:number};
type Snapshot={workspace:Workspace;proof:IntegrationProof;series:Series[]};
type Recorded={id:string;settledAt:string|null;lockedAt:string;deadline:string;outcome:string|null;returnPct:string|null;provider:string|null;exitFinalizedAt:string|null;settlementObservedAt:string|null;memoryStatus:string;jobId:string|null;blobId:string|null;completedAt:string|null;confirmed:boolean};
type Intent={text:string;attemptedAt:string;id?:string};
type State={runId:string;startedAt:string;checkedAt:string;status:string;reason:string;commands:string[];series:Series[];receipts:Recorded[];confirmed:number;scored:number;wins:number;losses:number;winRate:string|null;seed?:Intent;finalLock?:Intent;review?:RecallReview;groupRecalls?:Record<string,RecallReview>;stages?:IntegrationProof['stages']};
const sameGroup=(row:typeof GROUP|Receipt|Series)=>row.caller.trim().toLowerCase()===GROUP.caller.toLowerCase()&&row.asset===GROUP.asset&&row.direction===GROUP.direction&&row.horizon===GROUP.horizon;
function groupHistory({workspace,proof}:Snapshot,before=Infinity){
 const receipts=new Map(workspace.receipts.filter(sameGroup).map(r=>[r.id,r]));
 const jobs=new Map(workspace.memoryJobs.map(j=>[j.prediction_id,j]));
 const validSettlements=new Set(proof.settlements.filter(r=>r.method==='directional-open-v1').map(r=>r.receiptId));
 const usedJobs=new Set<string>(),usedBlobs=new Set<string>();
 const confirmed=proof.completed.filter(p=>{
  const job=jobs.get(p.prediction_id);
  if(!receipts.has(p.prediction_id)||!validSettlements.has(p.prediction_id)||p.network!=='mainnet'||job?.status!=='done'||!p.job_id||!p.blob_id||job.job_id!==p.job_id||job.blob_id!==p.blob_id||job.completed_at!==p.completed_at||!Number.isFinite(Date.parse(p.completed_at))||Date.parse(p.completed_at)>=before||usedJobs.has(p.job_id)||usedBlobs.has(p.blob_id))return false;
  usedJobs.add(p.job_id);usedBlobs.add(p.blob_id);return true;
 });
 const scored=confirmed.flatMap(p=>{const r=receipts.get(p.prediction_id)!;return ['won','lost'].includes(r.outcome||'')?[r]:[];});
 const wins=scored.filter(r=>r.outcome==='won').length,losses=scored.length-wins;
 return {confirmed,scored,wins,losses,winRate:scored.length?(wins/scored.length*100).toFixed(1):null,qualifies:scored.length>=5&&wins*100<40*scored.length};
}
function groupLockCount(snapshot:Snapshot){
 return snapshot.workspace.receipts.filter(row=>sameGroup(row)&&!followUp?.baseline.includes(row.id)).length;
}
function ensureLockBudget(snapshot:Snapshot,kind:'seed'|'finalLock'){
 if(groupLockCount(snapshot)>=LOCK_CAP)throw Error('Approved seven-call cap reached; no extra lock.');
 if(kind==='finalLock'&&snapshot.series.some(s=>sameGroup(s)&&s.status==='active'))throw Error('Stop the matching active series before the final lock.');
}
function utc(value:string|null){return value?new Date(value).toISOString():'not exposed';}
function lagos(value:string|null){return value?new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Lagos',dateStyle:'medium',timeStyle:'long',hour12:false}).format(new Date(value)):'not exposed';}
function safeCell(value:unknown){return String(value??'—').replaceAll('|','\\|').replace(/[\r\n]/g,' ');}
async function loadState():Promise<State>{
 try{const text=await readFile(OUTPUT,'utf8'),match=text.match(/<!-- proof-state -->\n```json\n([\s\S]*?)\n```/);if(!match)throw Error('Existing proof has no checkpoint; refusing to overwrite it.');return JSON.parse(match[1]) as State;}
 catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;return {runId:randomUUID(),startedAt:new Date().toISOString(),checkedAt:new Date().toISOString(),status:'observing',reason:'No result asserted.',commands:[],series:[],receipts:[],confirmed:0,scored:0,wins:0,losses:0,winRate:null};}
}
async function save(state:State){
 const rows=state.receipts.map(r=>`| ${r.id} | ${utc(r.lockedAt)} / ${lagos(r.lockedAt)} | ${utc(r.deadline)} / ${lagos(r.deadline)} | ${utc(r.settledAt)} / ${lagos(r.settledAt)} | ${safeCell(r.outcome)} | ${safeCell(r.returnPct)} | ${safeCell(r.provider)} | ${r.memoryStatus}${r.confirmed?' (Mainnet confirmed)':''} | ${safeCell(r.blobId)} | ${utc(r.completedAt)} / ${lagos(r.completedAt)} |`).join('\n');
 const text=`# CALBOK caution-loop proof — November 2026\n\nGroup: **@CryptoKaleo / BTC / bearish / 15m**. Owner-confirmed scheduled repeat predictions; these are not new organic posts by the named caller. No backdating, fabricated prices or hand-inserted records.\n\nApproved cap: **seven calls total**, including the seed and any conditional final caution-check lock. The existing series is capped at six additional locks and can stop early; an eighth lock is forbidden. The observer never settles calls, writes memories or changes provider settings. Its timer is set to five minutes; actual observation timestamps are recorded, and host suspension or delayed execution is not backfilled with invented intermediate checks.\n\nChecked: ${utc(state.checkedAt)}; ${lagos(state.checkedAt)}.\n\nStatus: **${state.status}**. ${state.reason}\n\nConfirmed Mainnet memories: **${state.confirmed}**. Verified scored memories: **${state.scored}** (${state.wins} won / ${state.losses} lost). Win rate: **${state.winRate===null?'undefined (no scored history)':state.winRate+'%'}**.\n\nSeries: ${state.series.length?state.series.map(s=>s.id+' ('+s.status+', '+s.created_count+'/'+s.target_count+' additional locks; '+(s.stop_reason||'no stop reason')+')').join('; '):'No matching series observed.'}\n\n## Real receipt evidence\n\n| Receipt | Locked UTC / Lagos | Deadline UTC / Lagos | Settled UTC / Lagos (done job) | Outcome | Return % | Provider | Memory state | Walrus blob ID | Completed UTC / Lagos |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n${rows||'| No matching 15m receipts observed | — | — | — | — | — | — | — | — | — |'}\n\nSettlement time is the existing done settlement job’s updated_at, recorded by the normal worker in the same transaction using the same completion timestamp as settlements.settled_at. The raw settlements.settled_at column is not separately exposed. The checkpoint also distinguishes first polling observation and finalized exit-candle time; no observation time is substituted for a settlement time. Neutral results do not count toward the five scored observations. Only Mainnet completion proofs matched to done jobs and reproduced SQL settlements count.\n\n## Recall and warning\n\n${state.finalLock?.id?'Final prospective receipt: '+state.finalLock.id+'.':'No final caution-check lock recorded.'}\n\n${state.review?(state.review.priority==='caution'?'Warning text: **Caution: matching calls have a low win rate.** '+state.review.contextual.rate+'% won across '+state.review.contextual.total+' matching calls. Open Proof details to inspect the cited results.\n\n':'No caution banner: server priority '+state.review.priority+'.\n\n')+'Server review (contains SQL receipt/job/blob citations, no raw memory text):\n\n```json\n'+JSON.stringify(state.review,null,2)+'\n```':'No verified caution review recorded. '+state.reason}\n\nWarning wording, when present above, is reconstructed from the existing components/caution-notice.tsx and the actual returned review; no banner is asserted without verified caution proof.\n\n## Existing group recall citations\n\nThese are the actual receipt-keyed reviews returned by /api/workspace, not substitutes for the conditional final target. No raw memory text is included.\n\n${state.groupRecalls&&Object.keys(state.groupRecalls).length?'```json\n'+JSON.stringify(state.groupRecalls,null,2)+'\n```':'No stored group recall yet.'}\n\n## Exact commands used\n\n`+state.commands.map(c=>'```powershell\n'+c+'\n```').join('\n\n')+'\n\nObserver child commands inherit the Railway-injected parent environment. Commands reference CALBOK_ADMIN_TOKEN only through the process environment; no credential values are stored. Every API request includes Authorization and Origin. No local .env file is loaded.\n\n## Machine-readable checkpoint (safe to resume)\n\n<!-- proof-state -->\n```json\n'+JSON.stringify(state,null,2)+'\n```\n';
 await mkdir(dirname(OUTPUT),{recursive:true});await writeFile(OUTPUT,text,'utf8');
}
function client(token:string,transport:typeof fetch=fetch){return async<T>(path:string,payload?:unknown):Promise<T>=>{
 if(!['/api/workspace','/api/integration-proof','/api/repeat-series'].includes(path))throw Error('Endpoint is outside this observer’s allowlist.');
 if(payload!==undefined&&path!=='/api/workspace')throw Error('Observer only permits normal prospective lock writes.');
 const r=await transport(ORIGIN+path,{method:payload===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,Origin:ORIGIN,'Content-Type':'application/json'},...(payload===undefined?{}:{body:JSON.stringify(payload)}),signal:AbortSignal.timeout(120_000),redirect:'error'});
 if(!r.ok)throw Error(`Production ${path} returned HTTP ${r.status}; no automatic resubmission.`);
 return await r.json() as T;
 };}
function observe(state:State,snapshot:Snapshot){
 const at=new Date().toISOString(),history=groupHistory(snapshot),prior=new Map(state.receipts.map(r=>[r.id,r]));
 state.checkedAt=at;state.series=snapshot.series.filter(sameGroup);state.stages=snapshot.proof.stages;
 state.groupRecalls=Object.fromEntries(snapshot.workspace.receipts.filter(sameGroup).flatMap(r=>snapshot.workspace.recallReviews[r.id]?[[r.id,snapshot.workspace.recallReviews[r.id]]]:[]));
 state.confirmed=history.confirmed.length;state.scored=history.scored.length;state.wins=history.wins;state.losses=history.losses;state.winRate=history.winRate;
 state.receipts=snapshot.workspace.receipts.filter(sameGroup).sort((a,b)=>a.locked_at.localeCompare(b.locked_at)).map(r=>{
  const settled=snapshot.proof.settlements.find(s=>s.receiptId===r.id),job=snapshot.workspace.memoryJobs.find(j=>j.prediction_id===r.id);
  const doneJob=snapshot.workspace.settlement?.jobs.find(j=>j.prediction_id===r.id&&j.status==='done');
  const record:Recorded={id:r.id,settledAt:settled&&doneJob?.updated_at&&Number.isFinite(Date.parse(doneJob.updated_at))?doneJob.updated_at:null,lockedAt:r.locked_at,deadline:r.deadline,outcome:settled?.outcome??r.outcome,returnPct:settled?.returnPct??null,provider:settled?.provider??null,exitFinalizedAt:settled?new Date(settled.exit.closeTime).toISOString():null,settlementObservedAt:prior.get(r.id)?.settlementObservedAt||(settled?at:null),memoryStatus:job?.status||'no job',jobId:job?.job_id||null,blobId:job?.blob_id||null,completedAt:job?.completed_at||null,confirmed:history.confirmed.some(p=>p.prediction_id===r.id)};
  console.log(JSON.stringify(record));return record;
 });
 console.log(JSON.stringify({at,confirmed:state.confirmed,scored:state.scored,wins:state.wins,losses:state.losses,winRate:state.winRate,series:state.series.map(s=>({id:s.id,status:s.status,reason:s.stop_reason}))}));
 return history;
}
async function main(){
 const args=new Set(process.argv.slice(2));
 if(args.has('--self-test')){await selfTest();return;}
 for(const arg of args)if(!['--inspect','--once','--prepare-seed','--wait-for-seed','--confirm-owner-lock','--follow-series'].includes(arg))throw Error('Unknown option.');
 const token=process.env.CALBOK_ADMIN_TOKEN;if(!token)throw Error('Set CALBOK_ADMIN_TOKEN in the process environment; no .env file is read.');
 if(args.has('--follow-series')){
  const run=JSON.parse(await readFile('data/final-proof-series.json','utf8'));
  if(!/^RS-[a-f0-9-]{36}$/.test(run.id)||!Array.isArray(run.baseline)||!run.baseline.every((id:unknown)=>typeof id==='string'&&/^CB-[a-f0-9-]{36}$/.test(id)))throw Error('Invalid series checkpoint.');
  followUp={id:run.id,baseline:run.baseline};
  OUTPUT=resolve('data/caution-loop-follow-up.md');
 }
 const api=client(token),state=await loadState();
 const runner=process.execArgv.includes('tsx')?'node --import tsx':'npx.cmd --yes @railway/cli run --service calbok --environment production --no-local -- npx.cmd tsx';
 const command=runner+' scripts/prove-caution-loop.ts'+(args.size?' '+[...args].join(' '):'');
 if(!state.commands.includes(command))state.commands.push(command);
 if(['caution-proven','threshold-not-met','recall-not-proven'].includes(state.status)&&!args.has('--inspect')){console.log(JSON.stringify({status:state.status,reason:state.reason,receiptId:state.finalLock?.id,proof:OUTPUT}));return;}
 const get=async():Promise<Snapshot>=>{const [workspace,proof,series]=await Promise.all([api<Workspace>('/api/workspace'),api<IntegrationProof>('/api/integration-proof'),api<{series:Series[]}>('/api/repeat-series')]);return {workspace,proof,series:series.series};};
 const lock=async(kind:'seed'|'finalLock',snapshot:Snapshot)=>{
  const existing=state[kind];
  if(existing){const found=snapshot.workspace.receipts.find(r=>r.text===existing.text&&sameGroup(r));if(found){existing.id=found.id;return found.id;}throw Error('An earlier lock attempt has no confirmed receipt; manual review required. No automatic resubmission.');}
  if(!args.has('--confirm-owner-lock'))throw Error('A prospective owner lock requires --confirm-owner-lock.');
  ensureLockBudget(snapshot,kind);
  const reference=snapshot.workspace.receipts.find(r=>r.caller===GROUP.caller&&r.asset===GROUP.asset&&r.direction===GROUP.direction);
  if(!reference)throw Error('No existing matching caller/asset/direction source to reference.');
  const text=`Owner-confirmed prospective repeat prediction, not a new caller post. BTC lower after 15 minutes. Proof run ${state.runId}; ${kind}.`;
  state[kind]={text,attemptedAt:new Date().toISOString()};await save(state);
  const result=await api<{id:string;review?:RecallReview}>('/api/workspace',{...GROUP,text,sourceUrl:reference.source_url,visibility:'private'});
  if(!result.id)throw Error('Lock response contained no receipt ID; acceptance uncertain.');
  state[kind]!.id=result.id;state.status=kind==='seed'?'seed-locked':'final-lock-confirmed';if(result.review)state.review=result.review;await save(state);return result.id;
 };
 while(true){
  const snapshot=await get(),history=observe(state,snapshot);
  const tracked=followUp?snapshot.series.find(s=>s.id===followUp?.id&&sameGroup(s)):undefined;
  if(followUp&&!tracked)throw Error('Approved series missing from the exact group.');
  if(args.has('--inspect')){if(!['caution-proven','threshold-not-met','recall-not-proven','lock-budget-exhausted'].includes(state.status)){state.status='inspected';state.reason=snapshot.workspace.receipts.some(sameGroup)?'Read-only inspection of the real 15m group; no writes performed by this inspection.':'No 15m seed exists. The series requires a normal prospective seed and verified Mainnet completion first.';}await save(state);return;}
  if(args.has('--prepare-seed')){
   if(history.confirmed.length||snapshot.workspace.receipts.some(sameGroup)){state.reason='A 15m receipt already exists; no additional seed submitted.';await save(state);return;}
   await lock('seed',snapshot);state.reason='One explicitly confirmed 15m seed locked normally; waiting for the worker is required.';await save(state);return;
  }
  if(args.has('--wait-for-seed')){
   if(history.confirmed.length){state.status='seed-ready';state.reason='Verified 15m seed and Mainnet memory confirmed; series may now be started through the existing route.';await save(state);return;}
   if(!snapshot.workspace.receipts.some(sameGroup)){state.status='blocked';state.reason='No 15m seed exists. The existing series route requires one.';await save(state);return;}
  }else if(history.confirmed.length>=5&&(!followUp||history.qualifies||tracked?.status!=='active')){
   if(!history.qualifies){state.status='threshold-not-met';state.reason=`No final call locked: ${history.scored.length} scored memories, ${history.wins} won / ${history.losses} lost, win rate ${history.winRate??'undefined'}%. Caution requires at least five wins/losses and a rate strictly below 40%.`;await save(state);return;}
   if(state.series.some(s=>s.status==='active')){state.status='ready-for-owner-stop';state.reason='Five confirmed memories qualify. Stop the active series through its existing owner route before the single final lock, to preserve the approved seven-call cap.';await save(state);return;}
   if(groupLockCount(snapshot)>=LOCK_CAP&&!state.finalLock){state.status='lock-budget-exhausted';state.reason='Seven group calls already exist; no eighth call will be locked.';await save(state);return;}
   const fresh=await get(),eligible=groupHistory(fresh,Date.now());
   if(!eligible.qualifies){observe(state,fresh);state.status='threshold-not-met';state.reason='Fresh pre-lock history no longer qualifies; no lock submitted.';await save(state);return;}
   const id=await lock('finalLock',fresh),after=await get();observe(state,after);
   const receipt=after.workspace.receipts.find(r=>r.id===id);if(!receipt)throw Error('Locked receipt not visible; no replacement will be created.');
   const review=after.workspace.recallReviews[id]||state.review;state.review=review;
   const valid=new Map(groupHistory(after,Date.parse(receipt.locked_at)).confirmed.map(p=>[p.prediction_id,p]));
   const cited=review?.sqlCitation.rows||[];
   const citationsValid=cited.length>=5&&new Set(cited.map(c=>c.receiptId)).size===cited.length&&cited.every(c=>{const p=valid.get(c.receiptId);return p?.job_id===c.jobId&&p.blob_id===c.blobId&&p.completed_at===c.completedAt;});
   const adapted=after.proof.recalls.some(r=>r.receiptId===id&&r.adapted);
   state.status=review?.priority==='caution'&&Number(review.contextual.rate)<40&&review.contextual.total>=5&&citationsValid&&adapted?'caution-proven':'recall-not-proven';
   state.reason=state.status==='caution-proven'?'Existing server recall and replayable proof confirm caution with pre-lock SQL receipt/job/blob citations.':'One normal final lock exists, but verified recall/caution proof is incomplete. No substitute lock or invented warning was created.';
   await save(state);return;
  }else if(!args.has('--wait-for-seed')&&!state.series.some(s=>s.status==='active')){
   state.status='blocked';state.reason='No active exact-group series and fewer than five confirmed memories. Existing series requires a verified 15m seed; no horizon was changed.';await save(state);return;
  }
  const failed=snapshot.workspace.memoryJobs.find(j=>snapshot.workspace.receipts.some(r=>r.id===j.prediction_id&&sameGroup(r))&&['failed','uncertain','manual_review','retryable','manual_retryable'].includes(j.status));
  if(failed){state.status='blocked';state.reason=`Memory job ${failed.prediction_id} needs review (${failed.status}); no resubmission attempted.`;await save(state);return;}
  state.status='observing';state.reason='Waiting for actual settlement and confirmed Mainnet memory. Poll interval: five minutes.';await save(state);
  if(args.has('--once'))return;
  await new Promise(resolve=>setTimeout(resolve,POLL_MS));
 }
}
async function selfTest(){
 assert.equal(POLL_MS,300_000);assert.equal(LOCK_CAP,7);
 const fixture=(outcomes:string[])=>{
  const receipts=outcomes.map((outcome,i)=>({...GROUP,id:'TEST-'+i,outcome})) as Receipt[];
  const completed=receipts.map((r,i)=>({prediction_id:r.id,job_id:'TEST-JOB-'+i,blob_id:'TEST-BLOB-'+i,network:'mainnet',completed_at:'2026-11-01T00:00:00.000Z'}));
  return {workspace:{receipts,memoryJobs:completed.map(p=>({...p,status:'done'})),recallReviews:{}},proof:{completed,settlements:receipts.map(r=>({receiptId:r.id,method:'directional-open-v1'}))},series:[]} as unknown as Snapshot;
 };
 assert.equal(groupHistory(fixture(['lost','lost','lost','lost','won'])).qualifies,true);
 assert.equal(groupHistory(fixture(['lost','lost','lost','won','won'])).qualifies,false);
 assert.equal(groupHistory(fixture(['lost','lost','lost','neutral','neutral'])).qualifies,false);
 assert.equal(groupHistory(fixture(['lost','lost','lost','lost'])).qualifies,false);
 assert.equal(groupHistory(fixture(['lost','lost','lost','lost','won']),Date.parse('2026-11-01T00:00:00Z')).confirmed.length,0);
 const other=fixture(['lost']);other.workspace.receipts[0].horizon='1h';assert.equal(groupHistory(other).confirmed.length,0);
 const mismatch=fixture(['lost']);mismatch.workspace.memoryJobs[0].blob_id='WRONG';assert.equal(groupHistory(mismatch).confirmed.length,0);
 const duplicate=fixture(['lost','lost']);duplicate.proof.completed[1]=duplicate.proof.completed[0];assert.equal(groupHistory(duplicate).confirmed.length,1);
 assert.throws(()=>ensureLockBudget(fixture(Array(7).fill('lost')),'finalLock'),/seven-call cap/);
 assert.doesNotThrow(()=>ensureLockBudget(fixture(Array(6).fill('lost')),'finalLock'));
 const active=fixture(Array(5).fill('lost'));active.series=[{...GROUP,status:'active'} as Series];assert.throws(()=>ensureLockBudget(active,'finalLock'),/Stop the matching active series/);
 const pending=fixture(['lost']);pending.workspace.memoryJobs[0].status='running';assert.equal(groupHistory(pending).confirmed.length,0);
 const offNetwork=fixture(['lost']);offNetwork.proof.completed[0].network='testnet';assert.equal(groupHistory(offNetwork).confirmed.length,0);
 const token='SYNTHETIC_SELF_TEST_ONLY';let checked=false;
 const fakeFetch:typeof fetch=async(url,options)=>{assert.equal(url,ORIGIN+'/api/workspace');assert.equal(options?.method,'POST');assert.equal(new Headers(options?.headers).get('Authorization'),'Bearer '+token);assert.equal(new Headers(options?.headers).get('Origin'),ORIGIN);checked=true;return Response.json({id:'TEST'});};
 await client(token,fakeFetch)('/api/workspace',{...GROUP});assert.equal(checked,true);
 await assert.rejects(()=>client(token,fakeFetch)('/api/actions',{action:'remember'}));
 await assert.rejects(()=>client(token,fakeFetch)('/api/repeat-series',{action:'start'}));
 const failedFetch:typeof fetch=async()=>new Response('not printed',{status:503});await assert.rejects(()=>client(token,failedFetch)('/api/workspace'),/HTTP 503/);
 console.log('PASS: observer group, threshold, strict completion time, neutral exclusion, deduplication, auth headers and write allowlist self-tests. Synthetic fixtures never reach production.');
}
main().catch(error=>{const token=process.env.CALBOK_ADMIN_TOKEN;const message=error instanceof Error?error.message:'Proof observer failed.';console.error(token?message.replaceAll(token,'[REDACTED]'):message);process.exitCode=1;});
