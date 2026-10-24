import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {Receipt} from '../lib/db';
import {filterJournal,journalExport,type JournalFilters} from '../lib/journal';
const filters:JournalFilters={query:'',outcome:'All calls',asset:'all',horizon:'all',direction:'all',order:'newest'};
const rows=[{id:'a',caller:'Alice',text:'Original text',asset:'gmgn:base:one',asset_symbol:'SAME',direction:'bullish',horizon:'24h',locked_at:'2026-01-01',deadline:'2026-01-02',outcome:null},{id:'b',caller:'Bob',text:'Other text',asset:'gmgn:base:two',asset_symbol:'SAME',direction:'bearish',horizon:'7d',locked_at:'2026-01-02',deadline:'2026-01-09',outcome:'won'}] as Receipt[];
test('journal search scopes canonical identities and sorts without mutating original records',()=>{
  assert.deepEqual(filterJournal(rows,filters).map(row=>row.id),['b','a']);
  assert.equal(rows[0].id,'a');
  assert.deepEqual(filterJournal(rows,{...filters,asset:'gmgn:base:one'}).map(row=>row.id),['a']);
  assert.deepEqual(filterJournal(rows,{...filters,query:' ALICE ',outcome:'Pending',horizon:'24h',direction:'bullish'}).map(row=>row.id),['a']);
  assert.deepEqual(filterJournal(rows,{...filters,order:'deadline'}).map(row=>row.id),['a','b']);
});
test('journal export retains original evidence while excluding unexpected secret properties',()=>{
  const row={...rows[0],evidence:'{"original":true}',snapshot_hash:'hash',token:'DO_NOT_EXPORT'};
  const data=journalExport([row],'2026-01-01T00:00:00.000Z');
  assert.equal(data.count,1);assert.equal(data.version,1);assert.equal(data.receipts[0].evidence,row.evidence);assert.equal(data.receipts[0].snapshot_hash,'hash');
  assert.equal(JSON.stringify(data).includes('DO_NOT_EXPORT'),false);
  assert.equal(data.exportedAt,'2026-01-01T00:00:00.000Z');
});
