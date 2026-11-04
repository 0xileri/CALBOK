import test from 'node:test';
import assert from 'node:assert/strict';
import {assetCandles} from '../lib/providers';
test('a finalized 1h boundary can fall back immediately when Tatum lags, but never before its candle closes',async(t)=>{
 const original=globalThis.fetch,key=process.env.TATUM_API_KEY;process.env.TATUM_API_KEY='synthetic-test-only';
 const minute=Date.UTC(2026,10,1,10,1),boundary=minute-35000;let calls:string[]=[];let missingCoinbase=false;
 try{
  globalThis.fetch=async input=>{const url=new URL(String(input));calls.push(url.hostname);
   if(url.hostname==='api.tatum.io')return Response.json({openTime:minute-60000,closeTime:minute-1,open:'100',high:'120',low:'90',close:'110'});
   if(url.hostname==='api.exchange.coinbase.com')return Response.json(missingCoinbase?[]:[[minute/1000,90,120,100,110,1]]);
   return Response.json([[minute,'100','120','90','110','1',minute+59999,'1',1,'1','1','0']]);};
  t.mock.timers.enable({apis:['Date'],now:minute+59999});
  await assert.rejects(assetCandles('BTC',boundary),/TATUM_CANDLE_NOT_YET_AVAILABLE/);assert.deepEqual(calls,['api.tatum.io']);t.mock.timers.reset();
  t.mock.timers.enable({apis:['Date'],now:minute+60000});calls=[];
  assert.equal((await assetCandles('BTC',boundary))[0].provider,'Coinbase');assert.equal(calls.length,2);
  missingCoinbase=true;calls=[];assert.equal((await assetCandles('BTC',boundary))[0].provider,'Binance');assert.equal(calls.length,3);
 }finally{t.mock.timers.reset();globalThis.fetch=original;if(key===undefined)delete process.env.TATUM_API_KEY;else process.env.TATUM_API_KEY=key;}
});
