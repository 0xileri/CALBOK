import test from 'node:test';
import assert from 'node:assert/strict';
import {binanceCandles,normalizeBinanceCandle,verifiedBinanceCandle} from '../lib/binance-pricing';
import {assetCandles} from '../lib/providers';
import {profileOutcome} from '../lib/caller-profiles';
import {settle} from '../lib/domain';
import type {Receipt} from '../lib/db';
// Recorded public Binance STXUSDT response, 2026-11-03 12:59 UTC.
// Later exit fixtures are synthetic and stay local to this test.
const minute=1793710740000;
const raw=[1793710740000,'0.32940000','0.32960000','0.32920000','0.32960000','577.80000000',1793710799999,'190.40789000',6,'477.80000000','157.48288000','0'];
test('Binance preserves pair and raw hash, accepts exact finalized boundaries, refuses early/late/scaled data',async()=>{
 const candle=normalizeBinanceCandle('STX',raw);
 assert.equal(candle.product,'STXUSDT');
 assert.equal(verifiedBinanceCandle('STX',candle),true);
 assert.equal(verifiedBinanceCandle('STX',{...candle,open:'99'}),false);
 assert.equal(verifiedBinanceCandle('BTC',candle),false);
 assert.throws(()=>normalizeBinanceCandle('1000FLOKI',raw),/SCALED_PAIR_UNSUPPORTED/);
 const original=globalThis.fetch;
 try {
  globalThis.fetch=async input=>{const url=new URL(String(input));assert.equal(url.searchParams.get('symbol'),'STXUSDT');assert.equal(url.searchParams.get('startTime'),String(minute));assert.equal(url.searchParams.get('limit'),'1');return Response.json([raw]);};
  assert.equal((await binanceCandles('STX',minute-35000,()=>minute+60000))[0].open,candle.open);
  globalThis.fetch=async()=>Response.json([raw]);
  await assert.rejects(binanceCandles('STX',minute+1,()=>minute+120000),/BOUNDARY_UNAVAILABLE/);
  await assert.rejects(binanceCandles('STX',minute,()=>minute+59999),/BOUNDARY_UNAVAILABLE/);
  const exit=normalizeBinanceCandle('STX',[minute+86400000,...raw.slice(1,6),minute+86459999,...raw.slice(7)]);
  const result=settle('bullish',minute-35000,minute+86400000-35000,[candle,exit],exit.closeTime);
  assert.equal(profileOutcome({asset:'STX',direction:'bullish',locked_at:new Date(minute-35000).toISOString(),deadline:new Date(minute+86400000-35000).toISOString(),outcome:result.outcome,method:'directional-open-v1',evidence:JSON.stringify({...result,asset:'STX',provider:'Binance'})} as Receipt),'neutral');
 }finally{globalThis.fetch=original;}
});
test('fallback order is Tatum then Coinbase then Binance; valid Coinbase never calls Binance',async()=>{
 const original=globalThis.fetch,key=process.env.TATUM_API_KEY;
 process.env.TATUM_API_KEY='synthetic-test-key';let calls:string[]=[];let coinbaseMissing=true;
 try {
  globalThis.fetch=async input=>{const url=new URL(String(input));calls.push(url.hostname);
   if(url.hostname==='api.tatum.io')return Response.json({openTime:minute-86400000,closeTime:minute-86400000+59999,open:'1',high:'1',low:'1',close:'1'});
   if(url.hostname==='api.exchange.coinbase.com')return Response.json(coinbaseMissing?[]:[[minute/1000,.32,.35,.33,.34,100]]);
   return Response.json([raw]);};
  assert.equal((await assetCandles('STX',minute))[0].provider,'Binance');
  assert.deepEqual(calls,['api.tatum.io','api.exchange.coinbase.com','api.binance.com']);
  calls=[];coinbaseMissing=false;
  assert.equal((await assetCandles('STX',minute))[0].provider,'Coinbase');assert.equal(calls.length,2);
 }finally{globalThis.fetch=original;if(key===undefined)delete process.env.TATUM_API_KEY;else process.env.TATUM_API_KEY=key;}
});
