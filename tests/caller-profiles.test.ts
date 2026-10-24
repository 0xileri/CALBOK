import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {Receipt} from '../lib/db';
import {profileOutcome,profileStats,profileGroups,scopeReceipts} from '../lib/caller-profiles';

function receipt(outcome:string|null,change:Partial<Receipt>={}):Receipt {
  const asset=change.asset||'BTC',provider=change.asset_provider||'Tatum';
  const candle=(openTime:number,open:string)=>({openTime,closeTime:openTime+60_000,open,high:'120',low:'80',close:open,hash:'a'.repeat(64)});
  const exit=outcome==='won'?'110':outcome==='lost'?'90':'100';
  return {id:'test',caller:'Alice',asset,asset_symbol:'BTC',asset_provider:provider,direction:'bullish',horizon:'24h',text:'SYNTHETIC PROFILE TEST ONLY',source_url:'',locked_at:new Date(0).toISOString(),deadline:new Date(86400_000).toISOString(),snapshot_hash:'b'.repeat(64),provenance:'test',outcome,method:outcome?'directional-open-v1':null,evidence:outcome?JSON.stringify({asset,provider,outcome,returnPct:outcome==='won'?'10.00000000':outcome==='lost'?'-10.00000000':'0.00000000',entry:candle(0,'100'),exit:candle(86400_000,exit)}):null,...change};
}
test('profiles exclude pending, neutral, unknown and unreproducible verdicts from win rate',()=>{
  const rows=[receipt('won'),receipt('won'),receipt('lost'),receipt('neutral'),receipt(null),receipt('won',{evidence:'not-json'})];
  assert.deepEqual(profileStats(rows),{won:2,lost:1,neutral:1,pending:1,unverified:1,total:6,scored:3,rate:'66.7'});
  assert.equal(profileStats([receipt(null)]).rate,null);
  assert.equal(profileStats([]).rate,null);
  assert.equal(profileOutcome(receipt('disputed')),'unverified');
});
test('profile scores require canonical method, matching market and reproducible candle evidence',()=>{
  assert.equal(profileOutcome(receipt('won')),'won');
  assert.equal(profileOutcome(receipt('lost')),'lost');
  assert.equal(profileOutcome(receipt('won',{method:'unsupported-method'})),'unverified');
  const original=receipt('won'),evidence=JSON.parse(original.evidence!);
  for(const changed of [{...evidence,asset:'ETH'},{...evidence,outcome:'lost'},{...evidence,returnPct:'99.00000000'},{...evidence,exit:{...evidence.exit,open:'90'}},{...evidence,entry:{...evidence.entry,hash:''}},{...evidence,exit:{...evidence.exit,openTime:1}}]) {
    assert.equal(profileOutcome({...original,evidence:JSON.stringify(changed)}),'unverified');
  }
});
test('same-symbol tokens retain separate contract identities in profile groups',()=>{
  const a='gmgn:base:0x'+'a'.repeat(40),b='gmgn:base:0x'+'b'.repeat(40);
  const groups=profileGroups([receipt('won',{asset:a,asset_symbol:'SAME',asset_provider:'GMGN'}),receipt('lost',{asset:b,asset_symbol:'SAME',asset_provider:'GMGN'})],'asset');
  assert.equal(groups.length,2);assert.notEqual(groups[0].key,groups[1].key);
  assert.equal(groups[0].rate,'100.0');assert.equal(groups[1].rate,'0.0');
});
test('caller, market, horizon and direction scopes do not blend identities',()=>{
  const rows=[receipt('won',{id:'wanted'}),receipt('lost',{id:'case',caller:'alice'}),receipt('lost',{id:'market',asset:'ETH'}),receipt(null,{id:'horizon',horizon:'7d'}),receipt(null,{id:'direction',direction:'bearish'})];
  assert.deepEqual(scopeReceipts(rows,'Alice',{asset:'BTC',horizon:'24h',direction:'bullish'}).map(row=>row.id),['wanted']);
  assert.equal(scopeReceipts(rows,'Alice',{asset:'all',horizon:'all',direction:'all'}).length,4);
});
