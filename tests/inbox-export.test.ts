import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {InboxCall} from '../lib/call-inbox';
import {inboxSummary,wrapInboxText} from '../lib/inbox-export';
test('captured-call summaries retain raw text and source without manufacturing scored evidence',()=>{
 const call={id:'LOG-test',caller:'@sandyXBT',text:'LONG $ansem\n @ $0.69',source_url:'https://x.com/example/status/123',logged_at:'2026-10-25T12:00:00Z',owner_id:'PRIVATE_OWNER',token:'NEVER_EXPORT',outcome:'won',deadline:'FAKE_DEADLINE'};
 const summary=inboxSummary(call as InboxCall);assert.ok(summary.includes(call.text));assert.ok(summary.includes(call.source_url));assert.ok(summary.includes('UNSCORED · NO DEADLINE'));assert.ok(summary.includes('not the original publication time'));for(const value of ['PRIVATE_OWNER','NEVER_EXPORT','FAKE_DEADLINE','Outcome: won'])assert.ok(!summary.includes(value));assert.ok(inboxSummary({...call,caller:''}).includes('Caller: Not specified'));
});
test('PNG text layout preserves line breaks and wraps long strings without dropping Unicode',()=>{
 const input='LONG $ansem\n$0.69\n普通🙂';const lines=wrapInboxText(input,5,value=>Array.from(value).length);assert.equal(lines.join(''),input.replace(/\n/g,''));assert.ok(lines.every(line=>Array.from(line).length<=5));assert.deepEqual(wrapInboxText('one\n\ntwo',20,value=>value.length),['one','','two']);assert.equal(wrapInboxText('x'.repeat(2000),40,value=>value.length).join(''),'x'.repeat(2000));
});
