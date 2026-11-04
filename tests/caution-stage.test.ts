import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {RecallSummary} from '../components/recall-summary';
import {PathToCaution} from '../components/path-to-caution';
import type {Claim} from '../lib/domain';
import type {MemoryJob} from '../lib/memory-ledger';
import type {CompletionProof,RecallProof} from '../lib/integration-proof';
process.env.CALBOK_DB_PATH=join(mkdtempSync(join(tmpdir(),'calbok-caution-stage-')),'test.sqlite');
process.env.CALBOK_ADMIN_TOKEN='SYNTHETIC_CAUTION_ADMIN_32_CHARACTERS';
process.env.CALBOK_PUBLIC_ORIGIN='https://calbok.example';
process.env.MEMWAL_PRIVATE_KEY='synthetic-test-only';process.env.MEMWAL_ACCOUNT_ID='synthetic-test-only';process.env.MEMWAL_NETWORK='mainnet';
const {db,capture,listReceipts}=await import('../lib/db');
const {GET:workspace}=await import('../app/api/workspace/route');
const {runSettlement}=await import('../lib/settlement-worker');
const {normalizeTatumCandle}=await import('../lib/providers');
const {rememberReceipt}=await import('../lib/automatic-memory');
const {automaticRecall,verifiedRecallReview,RECALL_SQL}=await import('../lib/receipt-recall');
const {integrationProof}=await import('../lib/integration-proof');
const {sameGroupRepeatSeed}=await import('../lib/lock-again');
// Real-shaped local fixtures: immutable capture, normalized response, actual settlement,
// remembered job/blob and stored recall rows. No fixture is sent to a live provider.
test('a confirmed repeat cites five prior memories, renders its SQL-backed caution, and advances adapt',async(t)=>{
 const base=Date.UTC(2026,9,1);const ids:string[]=[];
 const claim:Claim={caller:'SYNTHETIC CALLER',asset:'BTC',direction:'bullish',horizon:'1h',text:'SYNTHETIC CAUTION FIXTURE',sourceUrl:''};
 const receipt=(id:string)=>listReceipts('operator').find(r=>r.id===id)!;
 try{
  for(let i=0;i<5;i++){
   const locked=base+i*2*3600000;t.mock.timers.enable({apis:['Date'],now:locked});
   const id=capture({...claim,text:claim.text+' '+i});ids.push(id);t.mock.timers.reset();
   const settledAt=locked+3600000+120000;
   const result=await runSettlement(id,{clock:()=>settledAt,fetchCandles:async(_asset,boundary)=>[normalizeTatumCandle({openTime:boundary,closeTime:boundary+59999,open:boundary===locked?'100':i===0?'110':'90',high:'120',low:'80',close:boundary===locked?'100':i===0?'110':'90'})]});
   assert.equal(result.result?.outcome,i===0?'won':'lost');
   assert.equal(sameGroupRepeatSeed(receipt(id)),null);
   assert.throws(()=>capture(claim,'operator',undefined,undefined,id,true),/COMPLETED_MEMORY/);
   t.mock.timers.enable({apis:['Date'],now:settledAt});
   const submitted=await rememberReceipt(receipt(id),'operator',false,async()=>({
    remember:async()=>({job_id:'fixture-job-'+id,status:'pending'}),
    waitForRememberJob:async()=>({id:'fixture-job-'+id,job_id:'fixture-job-'+id,blob_id:'fixture-blob-'+id,owner:'fixture-owner',namespace:'fixture'}),
    getRememberStatus:async()=>{throw new Error('Unexpected status');},recall:async()=>({results:[],total:0}),listMemories:async()=>{throw new Error('Unexpected list');}
   }));
   assert.equal(submitted.status,200);t.mock.timers.reset();
  }
  const prior=receipt(ids.at(-1)!);const job=db().prepare('SELECT * FROM memory_jobs WHERE prediction_id=?').get(prior.id) as unknown as MemoryJob;
  assert.equal(sameGroupRepeatSeed(prior,{...job,blob_id:null}),null);assert.equal(sameGroupRepeatSeed(prior,{...job,status:'running'}),null);
  const seed=sameGroupRepeatSeed(prior,job)!;assert.ok(seed);
  const before=prior.snapshot_hash,confirmation=base+10*3600000;t.mock.timers.enable({apis:['Date'],now:confirmation});
  for(const patch of [{asset:'ETH'},{caller:'OTHER'},{direction:'bearish'},{horizon:'4h'}])assert.throws(()=>capture({...claim,...patch} as Claim,'operator',undefined,undefined,prior.id,true),/SAME_GROUP/);
  assert.throws(()=>capture(claim,'foreign',undefined,undefined,prior.id,true),/VERIFIED_PRIOR/);
  const targetId=capture(seed.fields as Claim,'operator',undefined,undefined,prior.id,true);
  assert.throws(()=>capture(seed.fields as Claim,'operator',undefined,undefined,prior.id,true),/UNIQUE/);
  const target=receipt(targetId);assert.equal(Date.parse(target.locked_at),confirmation);assert.equal(Date.parse(target.deadline)-confirmation,3600000);assert.equal(receipt(prior.id).snapshot_hash,before);
  t.mock.timers.reset();t.mock.timers.enable({apis:['Date'],now:confirmation+1000});
  const result=await automaticRecall('operator',targetId,async()=>({recall:async()=>({results:ids.map(id=>({text:JSON.stringify({predictionId:id}),blob_id:'fixture-blob-'+id,distance:0})),total:5})}));
  assert.equal(result?.priority,'caution');assert.equal(result?.contextual.rate,'20.0');assert.equal(result?.citedIds.length,5);assert.equal(result?.sqlCitation.query,RECALL_SQL);assert.equal(result?.sqlCitation.rows.length,5);
  assert.ok(result!.sqlCitation.rows.every(row=>Date.parse(row.completedAt)<confirmation));
  const html=renderToStaticMarkup(createElement(RecallSummary,{review:result!,onOpen:()=>undefined}));
  assert.match(html,/role="alert"/);assert.match(html,/5 prior memories cited/);assert.match(html,/Caution applied/);assert.match(html,/SQL citation/);ids.forEach(id=>assert.ok(html.includes(id)));
  const saved=db().prepare('SELECT review,created_at FROM recall_proofs WHERE prediction_id=?').get(targetId)!;
  const parsed=JSON.parse(String(saved.review));
  assert.equal(verifiedRecallReview(target,'operator',{...parsed,sqlCitation:{query:'untrusted'}},String(saved.created_at))?.sqlCitation.query,RECALL_SQL);
  const four=verifiedRecallReview(target,'operator',{retrievedIds:ids.slice(0,4)},String(saved.created_at))!;assert.equal(four.priority,'informational');assert.equal(four.citedIds.length,4);
  assert.doesNotMatch(renderToStaticMarkup(createElement(RecallSummary,{review:four,onOpen:()=>undefined})),/role="alert"/);
  const late=verifiedRecallReview({...target,locked_at:job.completed_at!},'operator',parsed,String(saved.created_at))!;assert.equal(late.priority,'informational');assert.equal(late.citedIds.length,4);
  assert.equal(verifiedRecallReview(target,'foreign',parsed,String(saved.created_at))?.citedIds.length,0);
  const rows=listReceipts('operator');const jobs=db().prepare('SELECT * FROM memory_jobs').all() as unknown as MemoryJob[];const completed=db().prepare('SELECT * FROM memory_completion_proofs').all() as unknown as CompletionProof[];const recalls=db().prepare('SELECT * FROM recall_proofs').all() as unknown as RecallProof[];
  const proof=integrationProof(rows,jobs,completed,recalls,[]);assert.equal(proof.stages.find(s=>s.key==='adapt')?.count,1);
  const group=proof.groups[0];assert.equal(group.count,5);assert.equal(group.winRate,'20.0');assert.equal(group.closest,true);assert.equal(group.nextDeadline,target.deadline);assert.equal(group.nextSettlementAt,new Date(confirmation+3600000+60000).toISOString());
  const tracker=renderToStaticMarkup(createElement(PathToCaution,{groups:proof.groups}));assert.match(tracker,/Path to caution/);assert.match(tracker,/Closest to threshold/);assert.match(tracker,/5\/5/);assert.match(tracker,/20.0%/);assert.match(tracker,/Next settlement/);
  const response=await workspace(new Request('https://calbok.example/api/workspace',{headers:{authorization:'Bearer '+process.env.CALBOK_ADMIN_TOKEN}}));
  assert.equal(response.status,200);const workspaceData=await response.json();assert.equal(workspaceData.recallReviews[targetId].priority,'caution');assert.equal(workspaceData.recallReviews[targetId].sqlCitation.rows.length,5);
  const reopened=new DatabaseSync(process.env.CALBOK_DB_PATH!);const durable=JSON.parse(String(reopened.prepare('SELECT review FROM recall_proofs WHERE prediction_id=?').get(targetId)!.review));assert.equal(durable.sqlCitation.rows.length,5);reopened.close();
  // Exactly 40% must never become caution. This fixture only changes local evidence through a new normal call.
  t.mock.timers.reset();const extraLocked=confirmation+2*3600000;t.mock.timers.enable({apis:['Date'],now:extraLocked});
  const extra=capture({...claim,text:'SYNTHETIC SECOND WIN FIXTURE'});t.mock.timers.reset();
  await runSettlement(extra,{clock:()=>extraLocked+3720000,fetchCandles:async(_asset,boundary)=>[normalizeTatumCandle({openTime:boundary,closeTime:boundary+59999,open:boundary===extraLocked?'100':'110',high:'120',low:'80',close:'110'})]});
  t.mock.timers.enable({apis:['Date'],now:extraLocked+3720000});await rememberReceipt(receipt(extra),'operator',false,async()=>({remember:async()=>({job_id:'extra-job',status:'pending'}),waitForRememberJob:async()=>({id:'extra-job',job_id:'extra-job',blob_id:'extra-blob',owner:'fixture-owner',namespace:'fixture'}),getRememberStatus:async()=>{throw new Error('Unused');},recall:async()=>({results:[],total:0}),listMemories:async()=>{throw new Error('Unused');}}));t.mock.timers.reset();
  const forty=verifiedRecallReview({...target,locked_at:new Date(extraLocked+3840000).toISOString()},'operator',{retrievedIds:[ids[0],ids[1],ids[2],ids[3],extra]},new Date(extraLocked+3900000).toISOString())!;
  assert.equal(forty.contextual.rate,'40.0');assert.equal(forty.priority,'informational');assert.doesNotMatch(renderToStaticMarkup(createElement(RecallSummary,{review:forty,onOpen:()=>undefined})),/role="alert"/);
 }finally{t.mock.timers.reset();db().close();}
});
