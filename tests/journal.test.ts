import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {Receipt} from '../lib/db';
import {filterJournal,journalDateError,journalDatePreset,journalExport,csvCell,journalCsv,type JournalFilters} from '../lib/journal';
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

test('CSV quotes Unicode, commas and newlines and neutralizes formula prefixes',()=>{
  for(const text of ['=SUM(1,2)',' +formula','-1+1','@SUM(1)','\tvalue','\nvalue',' \t=payload'])assert.ok(csvCell(text).startsWith('"\''));
  assert.equal(csvCell('a,"b"\nc'),'"a,""b""\nc"');
  assert.equal(csvCell('普通 text'),'"普通 text"');
  assert.ok(journalCsv(rows).startsWith('\uFEFF"id","caller"'));
  assert.ok(!journalCsv(rows).includes('undefined'));
});

test('UTC journal ranges include whole end dates and independently filter lock times or deadlines',()=>{
  const timed=[{...rows[0],id:'start',locked_at:'2026-10-01T00:00:00.000Z',deadline:'2026-10-02T00:00:00.000Z'},{...rows[0],id:'end',locked_at:'2026-10-01T23:59:59.999Z',deadline:'2026-10-08T23:59:59.999Z'},{...rows[0],id:'next',locked_at:'2026-10-02T00:00:00.000Z',deadline:'2026-10-09T00:00:00.000Z'}];
  assert.deepEqual(filterJournal(timed,{...filters,from:'2026-10-01',to:'2026-10-01'}).map(row=>row.id),['end','start']);
  assert.deepEqual(filterJournal(timed,{...filters,to:'2026-10-01'}).map(row=>row.id),['end','start']);
  assert.deepEqual(filterJournal(timed,{...filters,from:'2026-10-02'}).map(row=>row.id),['next']);
  assert.deepEqual(filterJournal(timed,{...filters,dateField:'deadline',from:'2026-10-08',to:'2026-10-08'}).map(row=>row.id),['end']);
  assert.equal(filterJournal(timed,{...filters,from:'2026-10-02',to:'2026-10-01'}).length,0);
  assert.equal(filterJournal(timed,{...filters,from:'2026-02-30'}).length,0);
  assert.equal(filterJournal(timed,{...filters,from:'bad'}).length,0);
  assert.equal(journalExport(filterJournal(timed,{...filters,to:'2026-10-01'})).count,2);
  assert.deepEqual(journalDatePreset(7,new Date('2026-01-02T00:30:00+01:00')),{from:'2025-12-26',to:'2026-01-01'});
  assert.deepEqual(journalDatePreset(1,new Date('2026-10-25T23:59:59Z')),{from:'2026-10-25',to:'2026-10-25'});
  assert.equal(journalDateError('2024-02-29','2024-02-29'),'');
  assert.ok(journalDateError('2026-02-29',''));
});
