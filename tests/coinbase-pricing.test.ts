import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCoinbaseCandle,verifiedCoinbaseCandle,coinbaseCandles} from '../lib/coinbase-pricing';
import {settle} from '../lib/domain';
import {profileOutcome} from '../lib/caller-profiles';
import type {Receipt} from '../lib/db';

// Recorded from Coinbase Exchange BTC-USD, 2026-11-03/04 12:59 UTC.
const entry=[1793710740,77258.6,77299.05,77277.4,77299.05,3.40093899];
const exit=[1793797140,78183.44,78235.19,78192.34,78189.7,4.51276585];
test('recorded Coinbase entry and exit reproduce an identified USD settlement',()=>{
 const first=normalizeCoinbaseCandle('BTC',entry),last=normalizeCoinbaseCandle('BTC',exit);
 const locked=first.openTime-35_000,deadline=last.openTime-35_000;
 const result=settle('bullish',locked,deadline,[first,last],last.closeTime);
 assert.equal(result.outcome,'won');
 assert.equal(verifiedCoinbaseCandle('BTC',first),true);
 assert.equal(verifiedCoinbaseCandle('STX',first),false);
 assert.equal(verifiedCoinbaseCandle('BTC',{...first,open:'1'}),false);
 const receipt={asset:'BTC',asset_provider:null,outcome:result.outcome,direction:'bullish',locked_at:new Date(locked).toISOString(),deadline:new Date(deadline).toISOString(),method:'directional-open-v1',evidence:JSON.stringify({...result,asset:'BTC',provider:'Coinbase'})} as Receipt;
 assert.equal(profileOutcome(receipt),'won');
 assert.equal(profileOutcome({...receipt,evidence:JSON.stringify({...result,asset:'BTC',provider:'Coinbase',entry:{...first,hash:'bad'}})}),'unverified');
});
test('Coinbase fallback selects the exact finalized minute and refuses absent history',async()=>{
 const original=globalThis.fetch;
 try {
  globalThis.fetch=async input=>{
   const url=new URL(String(input));
   assert.equal(url.pathname,'/products/BTC-USD/candles');
   assert.equal(url.searchParams.get('granularity'),'60');
   return Response.json([exit,entry]);
  };
  const candles=await coinbaseCandles('BTC',entry[0]*1000-35_000,()=>exit[0]*1000+60_000);
  assert.equal(candles[0].openTime,entry[0]*1000);
  globalThis.fetch=async()=>Response.json([]);
  await assert.rejects(coinbaseCandles('BTC',entry[0]*1000),/COINBASE_BOUNDARY_UNAVAILABLE/);
 } finally {globalThis.fetch=original;}
});
