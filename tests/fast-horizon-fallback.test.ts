import test from 'node:test';
import assert from 'node:assert/strict';
import {assetCandles,TATUM_GRACE_MS} from '../lib/providers';
test('Tatum stays first through its grace window, then Coinbase and Binance back it up, never before the candle closes',async(t)=>{
 const original=globalThis.fetch,key=process.env.TATUM_API_KEY;process.env.TATUM_API_KEY='synthetic-test-only';
 const minute=Date.UTC(2026,10,1,10,1),boundary=minute-35000;let calls:string[]=[];let missingCoinbase=false;
 let tatum:()=>Response=()=>Response.json({openTime:minute-60000,closeTime:minute-1,open:'100',high:'120',low:'90',close:'110'});
 const at=(now:number)=>{t.mock.timers.reset();t.mock.timers.enable({apis:['Date'],now});calls=[];};
 try{
  globalThis.fetch=async input=>{const url=new URL(String(input));calls.push(url.hostname);
   if(url.hostname==='api.tatum.io')return tatum();
   if(url.hostname==='api.exchange.coinbase.com')return Response.json(missingCoinbase?[]:[[minute/1000,90,120,100,110,1]]);
   return Response.json([[minute,'100','120','90','110','1',minute+59999,'1',1,'1','1','0']]);};
  // Before the boundary candle closes, and while Tatum lags inside its grace window, only Tatum is asked.
  at(minute+59999);await assert.rejects(assetCandles('BTC',boundary),/TATUM_CANDLE_NOT_YET_AVAILABLE/);assert.deepEqual(calls,['api.tatum.io']);
  at(minute+60000);await assert.rejects(assetCandles('BTC',boundary),/TATUM_CANDLE_NOT_YET_AVAILABLE/);assert.deepEqual(calls,['api.tatum.io']);
  at(minute+TATUM_GRACE_MS-1);await assert.rejects(assetCandles('BTC',boundary),/TATUM_CANDLE_NOT_YET_AVAILABLE/);assert.deepEqual(calls,['api.tatum.io']);
  // Once the grace window ends, Coinbase is the backup and Binance the last resort.
  at(minute+TATUM_GRACE_MS);assert.equal((await assetCandles('BTC',boundary))[0].provider,'Coinbase');assert.deepEqual(calls,['api.tatum.io','api.exchange.coinbase.com']);
  missingCoinbase=true;calls=[];assert.equal((await assetCandles('BTC',boundary))[0].provider,'Binance');assert.equal(calls.length,3);missingCoinbase=false;
  // A Tatum outage retries Tatum during the window and backs up afterwards.
  tatum=()=>new Response('',{status:503});
  at(minute+60000);await assert.rejects(assetCandles('BTC',boundary),/TATUM_HTTP_503/);assert.deepEqual(calls,['api.tatum.io']);
  at(minute+TATUM_GRACE_MS);assert.equal((await assetCandles('BTC',boundary))[0].provider,'Coinbase');
  tatum=()=>{throw new TypeError('fetch failed');};
  at(minute+60000);await assert.rejects(assetCandles('BTC',boundary),/TATUM_UNAVAILABLE/);assert.deepEqual(calls,['api.tatum.io']);
  at(minute+TATUM_GRACE_MS);assert.equal((await assetCandles('BTC',boundary))[0].provider,'Coinbase');
  // A valid Tatum candle always wins, and missing credentials stay an explicit error.
  tatum=()=>Response.json({openTime:minute,closeTime:minute+59999,open:'100',high:'120',low:'90',close:'110'});
  at(minute+TATUM_GRACE_MS);assert.equal((await assetCandles('BTC',boundary))[0].provider,undefined);assert.deepEqual(calls,['api.tatum.io']);
  delete process.env.TATUM_API_KEY;
  await assert.rejects(assetCandles('BTC',boundary),/TATUM_NOT_CONFIGURED/);
 }finally{t.mock.timers.reset();globalThis.fetch=original;if(key===undefined)delete process.env.TATUM_API_KEY;else process.env.TATUM_API_KEY=key;}
});
