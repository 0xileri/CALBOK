import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
process.env.CALBOK_DB_PATH=join(mkdtempSync(join(tmpdir(),'calbok-deadline-pickup-')),'test.sqlite');
const {db,capture,listReceipts,registerAsset}=await import('../lib/db');
const {workerTick,observeDueDeadlines}=await import('../lib/settlement-worker');
const {normalizeTatumCandle}=await import('../lib/providers');
const {normalizeCoinbaseCandle}=await import('../lib/coinbase-pricing');
const {normalizeBinanceCandle}=await import('../lib/binance-pricing');
const {normalizeGmgnCandles}=await import('../lib/gmgn');
const {exitCandleFinalizedAt}=await import('../lib/settlement-timing');
const token={id:'gmgn:sol:So11111111111111111111111111111111111111112',symbol:'TEST',name:'SYNTHETIC TEST',provider:'GMGN' as const,chain:'sol',address:'So11111111111111111111111111111111111111112'};
test('1h/4h deadlines are observed within one sweep for all sources, without reads or settlement before exit finality',async(t)=>{
 try{
  registerAsset(token);let sequence=0;
  for(const provider of ['Tatum','Coinbase','Binance','GMGN'])for(const horizon of ['1h','4h'] as const){
   const locked=Date.UTC(2026,9,1)+(sequence++)*10*3600000+45321;
   t.mock.timers.enable({apis:['Date'],now:locked});
   const id=capture({caller:'TEST '+provider+horizon,asset:provider==='GMGN'?token.id:'BTC',direction:'bullish',horizon,text:'SYNTHETIC TIMING TEST '+provider+horizon,sourceUrl:''});t.mock.timers.reset();
   const receipt=listReceipts().find(r=>r.id===id)!,deadline=Date.parse(receipt.deadline),ready=exitCandleFinalizedAt(deadline);
   let reads=0;
   const fetchCandles=async(_asset:string,boundary:number)=>{
    reads++;const minute=Math.ceil(boundary/60000)*60000,open=boundary===locked?'100':'110';
    assert.ok(minute>=boundary);assert.ok(minute-boundary<60000);
    if(provider==='Coinbase')return [normalizeCoinbaseCandle('BTC',[minute/1000,90,120,Number(open),110,1])];
    if(provider==='Binance')return [normalizeBinanceCandle('BTC',[minute,open,'120','90','110','1',minute+59999,'1',1,'1','1','0'])];
    if(provider==='GMGN')return normalizeGmgnCandles({list:[{time:minute,open,high:'120',low:'90',close:'110'}]});
    return [normalizeTatumCandle({openTime:minute,closeTime:minute+59999,open,high:'120',low:'90',close:'110'})];
   };
   await workerTick({clock:()=>deadline-1,fetchCandles});assert.equal(reads,0);
   await workerTick({clock:()=>deadline+59999,fetchCandles});
   const waiting=db().prepare('SELECT * FROM settlement_jobs WHERE prediction_id=?').get(id)!;
   assert.equal(Date.parse(String(waiting.first_checked_at)),deadline+59999);assert.equal(waiting.attempts,0);assert.equal(reads,0);
   assert.equal(waiting.next_attempt_at,new Date(ready).toISOString());
   assert.equal(listReceipts().find(r=>r.id===id)?.outcome,null);
   await workerTick({clock:()=>deadline+119999,fetchCandles});
   assert.equal(reads,2);assert.equal(listReceipts().find(r=>r.id===id)?.outcome,'won');
  }
  // Deadline observation is not constrained by the three-receipt provider batch.
  const at=Date.UTC(2026,10,1)+45321;t.mock.timers.enable({apis:['Date'],now:at});
  const batch=Array.from({length:5},(_,i)=>capture({caller:'TEST BATCH '+i,asset:'BTC',direction:'bullish',horizon:'1h',text:'SYNTHETIC DEADLINE BATCH '+i,sourceUrl:''}));t.mock.timers.reset();
  observeDueDeadlines(at+3600000+1);
  assert.ok(batch.every(id=>!!db().prepare('SELECT first_checked_at FROM settlement_jobs WHERE prediction_id=?').get(id)?.first_checked_at));
 }finally{t.mock.timers.reset();db().close();}
});
