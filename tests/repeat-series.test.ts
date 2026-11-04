import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {MemoryJob} from '../lib/memory-ledger';
import type {CompletionProof,RecallProof} from '../lib/integration-proof';
import {RepeatSeriesStart} from '../components/repeat-series';
process.env.CALBOK_DB_PATH=join(mkdtempSync(join(tmpdir(),'calbok-repeat-series-')),'test.sqlite');
process.env.MEMWAL_PRIVATE_KEY='synthetic-test-only';process.env.MEMWAL_ACCOUNT_ID='synthetic-test-only';process.env.MEMWAL_NETWORK='mainnet';process.env.CALBOK_WORKER_ENABLED='true';
process.env.CALBOK_ADMIN_TOKEN='SYNTHETIC_SERIES_ADMIN_SECRET_32_CHARS';process.env.CALBOK_PUBLIC_ORIGIN='https://calbok.example';
const {db,capture,listReceipts}=await import('../lib/db');
const {runSettlement,workerTick}=await import('../lib/settlement-worker');
const {recordEntryPrice}=await import('../lib/entry-price');
const {normalizeTatumCandle,namespaceFor,ProviderError}=await import('../lib/providers');
const {rememberReceipt,automaticMemoryTick,automaticMemoryStatus,setAutomaticMemory,reconcileMemory}=await import('../lib/automatic-memory');
const {automaticRecall}=await import('../lib/receipt-recall');
const {integrationProof}=await import('../lib/integration-proof');
const {startRepeatSeries,stopRepeatSeries,repeatSeriesTick,repeatSeriesProgress}=await import('../lib/repeat-series');
const {seriesForReceipt}=await import('../lib/repeat-series-store');
const {scheduledRepeat,scheduledRepeatLabel}=await import('../lib/scheduled-repeat');
const {receiptSummary}=await import('../lib/receipt-export');
const {journalExport,journalCsv}=await import('../lib/journal');
const {createSession}=await import('../lib/auth');
const {GET,POST}=await import('../app/api/repeat-series/route');
const owner={id:'operator',role:'operator'};
const receipt=(id:string)=>listReceipts('operator').find(r=>r.id===id)!;
let clock=Date.UTC(2026,8,1);const payloads:Record<string,unknown>[]=[];
type ClientFactory=NonNullable<Parameters<typeof rememberReceipt>[3]>;
const client:ClientFactory=async namespace=>({
 remember:async text=>{const payload=JSON.parse(text);payloads.push(payload);return {job_id:'test-job-'+payload.predictionId,status:'pending'};},
 waitForRememberJob:async id=>({id,job_id:id,blob_id:'test-blob-'+id,owner:'test-owner',namespace}),
 getRememberStatus:async id=>({job_id:id,status:'done',blob_id:'test-blob-'+id}),
 recall:async()=>{const rows=listReceipts('operator').filter(r=>namespaceFor(r.caller)===namespace).flatMap(r=>{const job=db().prepare("SELECT blob_id FROM memory_jobs WHERE prediction_id=? AND status='done'").get(r.id);return job?.blob_id?[{text:JSON.stringify({predictionId:r.id}),blob_id:String(job.blob_id),distance:0}]:[];});return {results:rows,total:rows.length};},
 listMemories:async()=>{throw new Error('Unexpected list');}
});
const recall:typeof automaticRecall=(actor,id)=>automaticRecall(actor,id,client);
function prices(id:string,win=true){const r=receipt(id);return async(_asset:string,boundary:number)=>{const minute=Math.ceil(boundary/60000)*60000,open=boundary===Date.parse(r.locked_at)?'100':win?'110':'90';return [normalizeTatumCandle({openTime:minute,closeTime:minute+59999,open,high:'120',low:'80',close:open})];};}
function current(id:string){return db().prepare('SELECT * FROM repeat_series WHERE id=?').get(id)!;}
function currentStep(seriesId:string){return receipt(String(current(seriesId).current_id));}
const start=(seed:string,count:number)=>{const result=startRepeatSeries(owner,seed,count,randomUUID());assert.equal(result.status,200,JSON.stringify(result));return result.seriesId!;};
const cleanup=()=>{for(const row of db().prepare("SELECT id FROM repeat_series WHERE status='active'").all())stopRepeatSeries(owner,String(row.id));};
test('owner series uses the normal durable flow, bounded approvals, labels and fail-closed stopping',async(t)=>{
 const at=(time:number)=>{t.mock.timers.reset();clock=time;t.mock.timers.enable({apis:['Date'],now:time});};
 const advance=(ms=1000)=>at(clock+ms);
 async function settle(id:string,win=true){at(Date.parse(receipt(id).deadline)+120000);assert.equal((await runSettlement(id,{fetchCandles:prices(id,win)})).result?.outcome,win?'won':'lost');}
 async function remember(id:string,automatic=false){const result=await rememberReceipt(receipt(id),'operator',automatic,client);if(result.status===202){advance();assert.equal((await rememberReceipt(receipt(id),'operator',automatic,client)).status,200);}else assert.equal(result.status,200);}
 async function seed(label:string,horizon:'1h'|'4h'|'24h'='1h',win=true){advance(2*3600000);const id=capture({caller:'TEST '+label,asset:'BTC',direction:'bullish',horizon,text:'SYNTHETIC SERIES TEST '+label+' '+randomUUID(),sourceUrl:''});await settle(id,win);await remember(id);advance();return id;}
 async function newSeries(label:string,count=2){const id=await seed(label);const seriesId=start(id,count);advance();await repeatSeriesTick(recall);return seriesId;}
 try{
  at(clock);setAutomaticMemory(true);
  await t.test('owner-only confirmation, maximum count, allowed horizons and idempotent start',async()=>{
   const id=await seed('authorization');
   const operator=createSession({id:'operator',role:'operator',email:null}),member=createSession({id:'member',role:'user',email:'member@example.test'}),requestId=randomUUID();
   const req=(token?:string,input:unknown={action:'start',seedId:id,count:2,requestId,confirmed:true},origin='https://calbok.example')=>new Request('https://calbok.example/api/repeat-series',{method:'POST',headers:{origin,'Content-Type':'application/json',...(token?{cookie:'calbok_session='+token}:{})},body:JSON.stringify(input)});
   assert.equal((await GET(new Request('https://calbok.example/api/repeat-series'))).status,403);assert.equal((await POST(req())).status,403);assert.equal((await POST(req(member))).status,403);assert.equal((await POST(req(operator,undefined,'https://evil.example'))).status,403);
   for(const count of [0,11,1.5])assert.equal(startRepeatSeries(owner,id,count,randomUUID()).status,400);
   assert.equal((await POST(req(operator,{action:'start',seedId:id,count:2,requestId}))).status,400);
   const count=listReceipts().length,budget=automaticMemoryStatus().limit;
   const approved=await(await POST(req(operator))).json();assert.ok(approved.seriesId);assert.equal((await(await POST(req(operator))).json()).seriesId,approved.seriesId);assert.equal(listReceipts().length,count);assert.equal(automaticMemoryStatus().limit,budget);
   assert.equal(startRepeatSeries(owner,id,3,requestId).status,409);assert.equal(startRepeatSeries(owner,id,2,randomUUID()).status,409);
   assert.equal(stopRepeatSeries({id:'member',role:'user'},approved.seriesId).status,403);stopRepeatSeries(owner,approved.seriesId);assert.throws(()=>capture({caller:receipt(id).caller,asset:'BTC',direction:'bullish',horizon:'1h',text:receipt(id).text,sourceUrl:''},'operator',undefined,undefined,id,true,{seriesId:approved.seriesId,step:1,count:2,scheduledBy:'operator'}),/SERIES_CHANGED/);
   const four=await seed('four-hours','4h');const fourSeries=start(four,1);advance();await repeatSeriesTick(recall);const fourStep=currentStep(fourSeries);assert.equal(Date.parse(fourStep.deadline)-Date.parse(fourStep.locked_at),4*3600000);stopRepeatSeries(owner,fourSeries);await settle(fourStep.id);await remember(fourStep.id);
   const long=await seed('long','24h');assert.equal(startRepeatSeries(owner,long,1,randomUUID()).status,409);
   const row=receipt(id),job=db().prepare('SELECT * FROM memory_jobs WHERE prediction_id=?').get(id) as unknown as MemoryJob;
   assert.equal(renderToStaticMarkup(createElement(RepeatSeriesStart,{receipt:row,job,owner:false,onChanged:()=>undefined})), '');
   assert.match(renderToStaticMarkup(createElement(RepeatSeriesStart,{receipt:row,job,owner:true,onChanged:()=>undefined})),/Start repeat series/);
  });
  await t.test('worker locks once, waits for settlement AND memory, labels payloads, uses separate budget and finishes count',async()=>{
   const id=await seed('count');const seriesId=start(id,2),original=receipt(id).snapshot_hash,regularLimit=automaticMemoryStatus().limit;
   advance();const lockedAt=clock;
   await workerTick({fetchCandles:prices(id),runSeries:()=>repeatSeriesTick(recall)});
   const first=currentStep(seriesId);assert.equal(Date.parse(first.locked_at),lockedAt);assert.equal(Date.parse(first.deadline)-lockedAt,3600000);assert.equal(receipt(id).snapshot_hash,original);
   assert.equal(seriesForReceipt(first.id)?.id,seriesId);assert.equal(scheduledRepeat(first)?.step,1);assert.match(JSON.stringify(journalExport([first])),/owner_scheduled_repeat|scheduled repeat by owner/);assert.match(journalCsv([first]),/scheduled repeat by owner/);assert.match(scheduledRepeatLabel(first)!,new RegExp(seriesId));assert.match(receiptSummary(first),/scheduled repeat by owner/);
   await Promise.all([repeatSeriesTick(recall),repeatSeriesTick(recall)]);assert.equal(current(seriesId).created_count,1);
   await settle(first.id);await repeatSeriesTick(recall);assert.equal(current(seriesId).created_count,1);
   db().prepare('INSERT INTO automatic_memory_budget VALUES (1,0) ON CONFLICT(id) DO UPDATE SET write_limit=0').run();
   const submitted=await rememberReceipt(receipt(first.id),'operator',true,client);assert.equal(submitted.status,202);await repeatSeriesTick(recall);assert.equal(current(seriesId).created_count,1);
   advance();await rememberReceipt(receipt(first.id),'operator',true,client);
   const payload=payloads.find(p=>p.predictionId===first.id)!;assert.equal(payload.sourceKind,'owner_scheduled_repeat');assert.match(String(payload.originLabel),new RegExp(seriesId));assert.deepEqual(payload.scheduledRepeat,{seriesId,step:1,count:2,scheduledBy:'operator'});
   assert.equal(automaticMemoryStatus().used,0);assert.equal(automaticMemoryStatus().seriesUsed,1);assert.equal(automaticMemoryStatus().limit,0);
   await repeatSeriesTick(recall);assert.equal(current(seriesId).created_count,1,'equal completion and lock timestamps do not qualify');
   advance(15*60000);const secondLock=clock;await repeatSeriesTick(recall);const second=currentStep(seriesId);assert.equal(current(seriesId).created_count,2);assert.equal(Date.parse(second.locked_at),secondLock);
   await settle(second.id);await remember(second.id,true);advance();await repeatSeriesTick(recall);assert.equal(current(seriesId).status,'completed');assert.equal(current(seriesId).stop_reason,'COUNT_REACHED');
   const count=listReceipts().length;await repeatSeriesTick(recall);assert.equal(listReceipts().length,count);
   const progress=repeatSeriesProgress(owner).find(s=>s.id===seriesId)!;assert.equal(progress.memories,3);assert.equal(progress.created_count,2);assert.equal(progress.nextDeadline,null);
   db().prepare('UPDATE automatic_memory_budget SET write_limit=?').run(regularLimit);
  });
  await t.test('Stop wins over concurrent recall; restart recovers proof without locking duplicate steps',async()=>{
   const seriesId=await newSeries('restart');const first=currentStep(seriesId),count=listReceipts().length;
   const reopened=new DatabaseSync(process.env.CALBOK_DB_PATH!);assert.equal(reopened.prepare('SELECT created_count FROM repeat_series WHERE id=?').get(seriesId)?.created_count,1);reopened.close();
   db().prepare("UPDATE repeat_series_steps SET recall_state='running' WHERE prediction_id=?").run(first.id);
   await repeatSeriesTick(async()=>{throw new Error('Stored recall must be recovered without a provider request');});assert.equal(listReceipts().length,count);assert.equal(current(seriesId).status,'active');
   stopRepeatSeries(owner,seriesId);await repeatSeriesTick(recall);assert.equal(listReceipts().length,count);
   assert.throws(()=>capture({caller:first.caller,asset:first.asset,direction:'bullish',horizon:'1h',text:first.text,sourceUrl:''},'operator',undefined,undefined,first.id,true,{seriesId,step:2,count:2,scheduledBy:'operator'}),/VERIFIED_PRIOR|COMPLETED_MEMORY|SERIES_CHANGED/);
   const seedId=await seed('stop-race'),race=start(seedId,2);let release!:()=>void;const gate=new Promise<void>(r=>{release=r;});
   const inFlight=repeatSeriesTick(async(actor,id)=>{await gate;return recall(actor,id);});await Promise.resolve();await repeatSeriesTick(recall);assert.equal(current(race).created_count,1);const raceCount=listReceipts().length;stopRepeatSeries(owner,race);release();await inFlight;await repeatSeriesTick(recall);assert.equal(listReceipts().length,raceCount);assert.equal(current(race).stop_reason,'OWNER_STOPPED');
  });
  await t.test('entry, settlement, memory and recall failures stop future locks and never automatically resubmit',async()=>{
   const entry=await newSeries('entry-failure');const entryId=currentStep(entry).id;at(Date.parse(receipt(entryId).locked_at)+120000);await recordEntryPrice(entryId,async()=>{throw new ProviderError('TEST_PRICE_FAILURE');});assert.equal(current(entry).status,'stopped');
   const price=await newSeries('settlement-failure');const priceId=currentStep(price).id;at(Date.parse(receipt(priceId).deadline)+120000);await runSettlement(priceId,{fetchCandles:async()=>{throw new ProviderError('TEST_PRICE_FAILURE');}});assert.equal(current(price).status,'stopped');
   const memory=await newSeries('memory-failure');const memoryId=currentStep(memory).id;await settle(memoryId);
   const refused=Object.assign(new Error('SYNTHETIC refused'),{code:'ECONNREFUSED',syscall:'connect'});let writes=0;
   const factory:ClientFactory=async ns=>({...await client(ns),remember:async()=>{writes++;throw new TypeError('SYNTHETIC connect failure',{cause:refused});}});
   await rememberReceipt(receipt(memoryId),'operator',true,factory);assert.equal(current(memory).status,'stopped');assert.equal(db().prepare('SELECT status FROM memory_jobs WHERE prediction_id=?').get(memoryId)?.status,'manual_retryable');
   await automaticMemoryTick(factory);await repeatSeriesTick(recall);assert.equal(writes,1);
   const pending=await newSeries('terminal-memory-failure');const pendingId=currentStep(pending).id;await settle(pendingId);await rememberReceipt(receipt(pendingId),'operator',true,client);
   await reconcileMemory(receipt(pendingId),async ns=>({...await client(ns),getRememberStatus:async job_id=>({job_id,status:'failed'})}));assert.equal(current(pending).status,'stopped');assert.equal(db().prepare('SELECT status FROM memory_jobs WHERE prediction_id=?').get(pendingId)?.status,'manual_retryable');
   const recallSeed=await seed('recall-failure'),failed=start(recallSeed,2);advance();await repeatSeriesTick(async()=>{throw new Error('SYNTHETIC recall failure');});assert.equal(current(failed).stop_reason,'RECALL_FAILED');
  });
  await t.test('neutral settlements complete memory and advance the series without inflating the five scored samples',async()=>{
   const seriesId=await newSeries('neutral');const first=currentStep(seriesId);at(Date.parse(first.deadline)+120000);
   const result=await runSettlement(first.id,{fetchCandles:async(_asset,boundary)=>{const minute=Math.ceil(boundary/60000)*60000;return [normalizeTatumCandle({openTime:minute,closeTime:minute+59999,open:'100',high:'120',low:'80',close:'100'})];}});assert.equal(result.result?.outcome,'neutral');
   await remember(first.id,true);advance();await repeatSeriesTick(recall);assert.equal(current(seriesId).created_count,2);assert.equal(repeatSeriesProgress(owner).find(row=>row.id===seriesId)?.memories,1);stopRepeatSeries(owner,seriesId);
  });
  await t.test('missing provider results and interrupted recall stop conservatively without duplicate submissions',async()=>{
   const seriesId=await newSeries('unconfirmed-memory');const id=currentStep(seriesId).id;await settle(id);let attempts=0;
   await rememberReceipt(receipt(id),'operator',true,async ns=>({...await client(ns),remember:async()=>{attempts++;throw new Error('SYNTHETIC timeout after possible acceptance');}}));
   assert.equal(current(seriesId).status,'stopped');assert.equal(db().prepare('SELECT status FROM memory_jobs WHERE prediction_id=?').get(id)?.status,'uncertain');await repeatSeriesTick(recall);await automaticMemoryTick(client);assert.equal(attempts,1);
   const seedId=await seed('interrupted-recall'),interrupted=start(seedId,2);advance();
   const source=receipt(seedId);const step=capture({caller:source.caller,asset:source.asset,direction:'bullish',horizon:'1h',text:source.text,sourceUrl:''},'operator',undefined,undefined,seedId,true,{seriesId:interrupted,step:1,count:2,scheduledBy:'operator'});
   db().prepare("UPDATE repeat_series_steps SET recall_state='running',recall_started_at=? WHERE prediction_id=?").run(new Date(clock).toISOString(),step);
   const before=listReceipts().length;await repeatSeriesTick(async()=>{throw new Error('In-progress recall must not be duplicated');});assert.equal(current(interrupted).status,'active');advance(181000);await repeatSeriesTick(recall);assert.equal(current(interrupted).stop_reason,'RECALL_UNCONFIRMED');assert.equal(listReceipts().length,before);
  });
  await t.test('restart with missing durable proof stops without fabricating completion or issuing another lock',async()=>{
   const seedId=await seed('lost-memory-proof'),seriesId=start(seedId,2);db().prepare('DELETE FROM memory_completion_proofs WHERE prediction_id=?').run(seedId);await repeatSeriesTick(recall);assert.equal(current(seriesId).stop_reason,'MEMORY_PROOF_UNCONFIRMED');assert.equal(current(seriesId).created_count,0);
   const failed=await newSeries('lost-recall-proof'),id=currentStep(failed).id;db().prepare('DELETE FROM recall_proofs WHERE prediction_id=?').run(id);db().prepare("UPDATE repeat_series_steps SET recall_state='failed' WHERE prediction_id=?").run(id);const count=listReceipts().length;await repeatSeriesTick(recall);assert.equal(current(failed).stop_reason,'RECALL_FAILED');assert.equal(listReceipts().length,count);
  });
  await t.test('five real-shaped prior memories trigger actual caution and stop the scheduled series',async()=>{
   let last='';for(let i=0;i<5;i++)last=await seed('caution','1h',false);
   const seriesId=start(last,10);advance();await repeatSeriesTick(recall);const currentId=currentStep(seriesId).id;
   assert.equal(current(seriesId).created_count,1);assert.equal(current(seriesId).stop_reason,'CAUTION_TRIGGERED');
   const saved=JSON.parse(String(db().prepare('SELECT review FROM recall_proofs WHERE prediction_id=?').get(currentId)?.review));assert.equal(saved.priority,'caution');assert.equal(saved.citedIds.length,5);assert.equal(saved.contextual.rate,'0.0');
   const count=listReceipts().length;await repeatSeriesTick(recall);assert.equal(listReceipts().length,count);
   const proof=integrationProof(listReceipts('operator'),db().prepare('SELECT * FROM memory_jobs').all() as unknown as MemoryJob[],db().prepare('SELECT * FROM memory_completion_proofs').all() as unknown as CompletionProof[],db().prepare('SELECT * FROM recall_proofs').all() as unknown as RecallProof[],[]);assert.ok(proof.stages.find(s=>s.key==='adapt')!.count>=1);
  });
 }finally{cleanup();t.mock.timers.reset();db().close();}
});
