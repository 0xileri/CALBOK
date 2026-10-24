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
