import type {MemoryJob} from '../lib/memory-ledger';
import type {CompletionProof} from '../lib/integration-proof';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
process.env.CALBOK_DB_PATH=join(mkdtempSync(join(tmpdir(),'calbok-proof-loop-')),'test.sqlite');
process.env.MEMWAL_PRIVATE_KEY='synthetic-test-only';process.env.MEMWAL_ACCOUNT_ID='synthetic-test-only';process.env.MEMWAL_NETWORK='mainnet';
const {capture,db,listReceipts,registerAsset}=await import('../lib/db');
const {normalizeTatumCandle}=await import('../lib/providers');
const {normalizeCoinbaseCandle}=await import('../lib/coinbase-pricing');
const {normalizeBinanceCandle}=await import('../lib/binance-pricing');
const {normalizeGmgnCandles}=await import('../lib/gmgn');
const {runSettlement}=await import('../lib/settlement-worker');
const {rememberReceipt}=await import('../lib/automatic-memory');
const {automaticRecall}=await import('../lib/receipt-recall');
const {lockAgainSeed}=await import('../lib/lock-again');
const {integrationProof}=await import('../lib/integration-proof');
const {profileOutcome}=await import('../lib/caller-profiles');
const token={id:'gmgn:sol:So11111111111111111111111111111111111111112',symbol:'TEST',name:'Synthetic test token',provider:'GMGN' as const,chain:'sol',address:'So11111111111111111111111111111111111111112'};
test('15m/1h/4h lock, settle, remember and cited repeat work for Tatum, Coinbase, Binance and GMGN without backdating',async(t)=>{
 try{
  registerAsset(token);const now=Math.floor(Date.now()/60000)*60000;
  for(const source of ['Tatum','Coinbase','Binance','GMGN'])for(const hours of [0.25,1,4] as const){
   const horizon=hours===0.25?'15m':hours===1?'1h':'4h',caller='TEST '+source+' '+horizon,asset=source==='GMGN'?token.id:'BTC';
   const locked=now-hours*3600000-120000;
   t.mock.timers.enable({apis:['Date'],now:locked});
   const id=capture({caller,text:'SYNTHETIC SHORT HORIZON TEST '+source+horizon,asset,direction:'bullish',horizon,sourceUrl:'https://example.test/original-call'});t.mock.timers.reset();
   const make=(minute:number)=>{
    const open=minute===locked?'100':'110';
    if(source==='Coinbase')return normalizeCoinbaseCandle(asset,[minute/1000,90,120,Number(open),110,1]);
    if(source==='Binance')return normalizeBinanceCandle(asset,[minute,open,'120','90','110','1',minute+59999,'1',1,'1','1','0']);
    if(source==='GMGN')return normalizeGmgnCandles({list:[{time:minute,open,high:'120',low:'90',close:'110'}]})[0];
    return normalizeTatumCandle({openTime:minute,closeTime:minute+59999,open,high:'120',low:'90',close:'110'});
   };
   assert.equal((await runSettlement(id,{clock:()=>now,fetchCandles:async(_asset,boundary)=>[make(boundary)]})).result?.outcome,'won');
   const receipt=listReceipts('operator').find(r=>r.id===id)!;
   assert.equal(profileOutcome(receipt),'won');
   const factory:NonNullable<Parameters<typeof rememberReceipt>[3]>=async()=>({remember:async()=>({job_id:'test-job-'+id,status:'pending'}),waitForRememberJob:async()=>({id:'test-job-'+id,job_id:'test-job-'+id,blob_id:'test-blob-'+id,owner:'test-owner',namespace:'test'}),getRememberStatus:async()=>{throw new Error('Unexpected poll');},listMemories:async()=>{throw new Error('Unexpected list');},recall:async()=>({results:[{text:JSON.stringify({predictionId:id}),blob_id:'test-blob-'+id,distance:0}],total:1})});
   await rememberReceipt(receipt,'operator',false,factory);
   const seed=lockAgainSeed(receipt)!;assert.equal(seed.asset.id,asset);assert.equal(seed.fields.horizon,horizon);assert.equal(seed.fields.sourceUrl,receipt.source_url);
   const confirmation=Date.now()+1000;t.mock.timers.enable({apis:['Date'],now:confirmation});
   assert.throws(()=>capture(seed.fields as Parameters<typeof capture>[0],'foreign',undefined,undefined,id),/VERIFIED_PRIOR/);
   const repeated=capture(seed.fields as Parameters<typeof capture>[0],'operator',undefined,undefined,id);
   assert.throws(()=>capture(seed.fields as Parameters<typeof capture>[0],'operator',undefined,undefined,id),/UNIQUE/);
   t.mock.timers.reset();
   const later=listReceipts('operator').find(r=>r.id===repeated)!;
   assert.equal(Date.parse(later.locked_at),confirmation);assert.equal(Date.parse(later.deadline)-confirmation,hours*3600000);
   assert.equal(later.source_url,receipt.source_url,'Lock again retains original source');assert.equal(later.outcome,null);assert.equal(lockAgainSeed(later),null);
   const review=await automaticRecall('operator',repeated,factory);
   assert.deepEqual(review?.citedIds,[id]);
   assert.ok(db().prepare('SELECT 1 FROM receipt_repeat_links WHERE prediction_id=? AND original_id=?').get(repeated,id));
  }
  const receipts=listReceipts('operator');const completed=db().prepare('SELECT * FROM memory_completion_proofs').all();const jobs=db().prepare('SELECT * FROM memory_jobs').all();
  const proof=integrationProof(receipts,jobs as unknown as MemoryJob[],completed as unknown as CompletionProof[],[],[]);
  assert.equal(proof.groups.length,12);assert.ok(proof.groups.every(g=>g.count===1&&g.winRate==='100.0'&&g.closest));
 }finally{t.mock.timers.reset();db().close();}
});
