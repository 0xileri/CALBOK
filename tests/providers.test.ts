import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeTatumCandle} from '../lib/providers';
import {boundaryCandle} from '../lib/domain';
const candle={openTime:120_000,closeTime:179_999,open:'100',high:'102',low:'99',close:'101'};
test('inclusive source close is normalized and preserved without changing open',()=>{
  const normalized=normalizeTatumCandle(candle);
  assert.equal(normalized.sourceCloseTime,179_999);
  assert.equal(normalized.closeTime,180_000);
  assert.equal(normalized.openTime,120_000);
  assert.ok(boundaryCandle([normalized],120_000,180_000));
  assert.equal(boundaryCandle([normalized],120_000,179_999),undefined);
});
test('exclusive close is accepted; other durations and wrapped payloads are refused',()=>{
  assert.equal(normalizeTatumCandle({...candle,closeTime:180_000}).closeTime,180_000);
  for(const closeTime of [179_998,180_001,120_001])assert.throws(()=>normalizeTatumCandle({...candle,closeTime}),/PRICE_INTERVAL_UNVERIFIED/);
  assert.throws(()=>normalizeTatumCandle({data:candle}),/PRICE_SCHEMA_UNVERIFIED/);
});

test('Tatum closest records cannot substitute a missing locked boundary',async()=>{
  const {validateTatumBoundary}=await import('../lib/providers');
  const valid=normalizeTatumCandle(candle);
  assert.equal(validateTatumBoundary(valid,120_000),valid);
  assert.throws(()=>validateTatumBoundary(valid,180_000),/TATUM_PRICE_BOUNDARY_UNAVAILABLE/);
  assert.throws(()=>validateTatumBoundary(valid,59_999),/TATUM_PRICE_BOUNDARY_UNAVAILABLE/);
});

import recorded from './fixtures/tatum-boundaries.json';
import {priceCandle} from '../lib/providers';

test('recorded entry and exit responses expose stale timestamps without leaking credentials',async()=>{
  const events:unknown[][]=[];
  const original=console.warn;
  console.warn=(...args:unknown[])=>{events.push(args);};
  try {
    for (const [boundary,response] of [[recorded.entryUnix,recorded.entryResponse],[recorded.exitUnix,recorded.exitResponse]] as const) {
      await assert.rejects(priceCandle('BTC',boundary-35_000,{
        clock:()=>recorded.exitUnix+600_000,
        request:async url=>{
          assert.equal(new URL(url).searchParams.get('unix'),String(boundary+1));
          assert.equal(new URL(url).searchParams.get('interval'),'1m');
          return response;
        }
      }),/TATUM_PRICE_BOUNDARY_UNAVAILABLE/);
    }
    assert.equal(events.length,2);
    assert.deepEqual(events[0][1],{asset:'BTC',unix:recorded.entryUnix+1,boundary:recorded.entryUnix-35_000,openTime:recorded.entryResponse.openTime,closeTime:recorded.entryResponse.closeTime});
  } finally {console.warn=original;}
});

test('a recent missing or unfinalized candle retries, but pre-lock evidence is never accepted',async()=>{
  const boundary=recorded.entryResponse.openTime;
  const original=console.warn;
  console.warn=()=>{};
  try {
    await assert.rejects(priceCandle('BTC',boundary+60_000,{
      clock:()=>boundary+120_000,request:async()=>recorded.entryResponse
    }),/TATUM_CANDLE_NOT_YET_AVAILABLE/);
    await assert.rejects(priceCandle('BTC',boundary,{
      clock:()=>boundary+10_000,request:async()=>recorded.entryResponse
    }),/TATUM_CANDLE_NOT_YET_AVAILABLE/);
    const result=await priceCandle('BTC',boundary,{clock:()=>boundary+60_000,request:async()=>recorded.entryResponse});
    assert.equal(result.openTime,boundary);
  } finally {console.warn=original;}
});
