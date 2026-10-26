import test from 'node:test';
import assert from 'node:assert/strict';
import {inboxCsv} from '../lib/inbox-csv';

test('captured CSV preserves quoted text, labels unscored, and excludes private fields',()=>{
 const call={id:'LOG-test',caller:'@caller',text:'=formula,"quoted"\n第二行',source_url:'https://example.com',logged_at:'2026-10-26T00:00:00Z',reviewed:true,note:'PRIVATE LESSON',token:'SECRET',outcome:'won'};
 const csv=inboxCsv([call]);
 assert.ok(csv.startsWith('\uFEFF"id"'));
 assert.ok(csv.includes('"\'=formula,""quoted""\n第二行"'));
 assert.ok(csv.includes('"reviewed","unscored"'));
 assert.ok(!csv.includes('PRIVATE LESSON')&&!csv.includes('SECRET')&&!csv.includes('won'));
 assert.ok(inboxCsv([{...call,reviewed:false}]).includes('"awaiting_review","unscored"'));
 assert.equal(inboxCsv([]).split('\r\n').length,1);
});
