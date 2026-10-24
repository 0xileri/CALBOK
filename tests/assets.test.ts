import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TATUM_SYMBOLS,tatumAssets,isAllowedAsset,gmgnAssetId,parseGmgnAssetId} from '../lib/assets';
import {claimSchema,boundaryCandle} from '../lib/domain';
import {normalizeGmgnSearch,normalizeGmgnCandles} from '../lib/gmgn';
const address='0x'+'a'.repeat(40);
test('full official Tatum catalog replaces the three-symbol allowlist',()=>{
  assert.equal(TATUM_SYMBOLS.length,439);
  for(const symbol of ['BTC','ETH','SUI','SOL'])assert.ok(isAllowedAsset(symbol));
  assert.ok(tatumAssets('sol').some(a=>a.id==='SOL'));
  assert.equal(isAllowedAsset('VVV'),false);
  assert.equal(isAllowedAsset('NOT_A_REAL_CATALOG_SYMBOL'),false);
  assert.equal(tatumAssets('btc')[0].id,'BTC');
});
test('chain+address identity separates same-ticker tokens and rejects malformed IDs',()=>{
  const base=gmgnAssetId('base',address),eth=gmgnAssetId('eth',address);
  assert.notEqual(base,eth);
  assert.deepEqual(parseGmgnAssetId(base!),{chain:'base',address});
  assert.equal(gmgnAssetId('unknown',address),null);
  assert.equal(gmgnAssetId('sol','not a token address'),null);
  assert.equal(parseGmgnAssetId(`gmgn:base:${address}:extra`),null);
  assert.equal(isAllowedAsset('gmgn:base:../../secret'),false);
});
test('GMGN search keeps separate addresses, deduplicates identity, and drops malformed tokens',()=>{
  const a={chain:'base',address,symbol:'VVV',name:'Synthetic test token'};
  const result=normalizeGmgnSearch({coins:[a,a,{...a,address:'0x'+'b'.repeat(40)},{...a,address:'bad'}]});
  assert.equal(result.length,2);assert.equal(result[0].symbol,'VVV');assert.notEqual(result[0].id,result[1].id);
  assert.throws(()=>normalizeGmgnSearch({unexpected:[]}),/GMGN_SEARCH_SCHEMA_UNVERIFIED/);
});
test('GMGN candle normalization pins verified live milliseconds and retains finalized boundary checks',()=>{
  const raw={time:1_800_000_000_000,open:'10',high:'12',low:'9',close:'11'};
  const candles=normalizeGmgnCandles({list:[raw]});
  assert.equal(candles[0].openTime,raw.time);
  assert.ok(boundaryCandle(candles,raw.time,raw.time+60_000));
  assert.equal(boundaryCandle(candles,raw.time+1,raw.time+120_000),undefined);
  assert.throws(()=>normalizeGmgnCandles({list:[{...raw,time:raw.time/1000}]}),/TIMESTAMP_UNVERIFIED/);
  assert.throws(()=>normalizeGmgnCandles({list:[raw,{...raw,open:'11'}]}),/CONFLICTING_CANDLES/);
});
test('no missing direction or horizon is manufactured for an imported post',()=>{
  const result=claimSchema.safeParse({caller:'Unverified screenshot',text:'Positive commentary on VVV without a price deadline',asset:gmgnAssetId('base',address)});
  assert.equal(result.success,false);
  if(!result.success)assert.deepEqual(result.error.issues.map(i=>i.path[0]).sort(),['direction','horizon']);
});
