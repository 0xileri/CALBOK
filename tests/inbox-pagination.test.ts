import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
process.env.CALBOK_ADMIN_TOKEN='PAGINATION_TEST_ONLY_32_CHARACTERS';
process.env.CALBOK_DB_PATH=join(mkdtempSync(join(tmpdir(),'calbok-pages-')),'test.sqlite');
const {listInbox,logInbox,parseInboxCursor}=await import('../lib/call-inbox');
const {db}=await import('../lib/db');
const {GET}=await import('../app/api/call-inbox/route');
const {createSession}=await import('../lib/auth');
test('inbox cursor pages equal timestamps without duplicates and isolate owners',async()=>{
 try{
 for(let i=0;i<205;i++)logInbox('alice',{requestId:crypto.randomUUID(),caller:'UI TEST',text:'Test '+i,sourceUrl:''});
 logInbox('bob',{requestId:crypto.randomUUID(),caller:'PRIVATE',text:'OTHER OWNER',sourceUrl:''});
 db().prepare('UPDATE call_inbox SET logged_at=?').run('2026-11-01T00:00:00.000Z');
 const first=listInbox('alice'),second=listInbox('alice',parseInboxCursor(first.nextCursor)),third=listInbox('alice',parseInboxCursor(second.nextCursor));
 assert.equal(first.calls.length,100);assert.equal(second.calls.length,100);assert.equal(third.calls.length,5);assert.equal(third.nextCursor,null);
 const all=[...first.calls,...second.calls,...third.calls];assert.equal(new Set(all.map(row=>row.id)).size,205);assert.ok(all.every(row=>row.caller==='UI TEST'));assert.equal(first.total,205);
 assert.equal(listInbox('bob',parseInboxCursor(first.nextCursor)).total,1);
 assert.throws(()=>parseInboxCursor('bad'));assert.throws(()=>parseInboxCursor(Buffer.from(JSON.stringify({time:'bad',id:'LOG-a'})).toString('base64url')));
 const token=createSession({id:'alice',role:'user',email:null});
 const result=await GET(new Request('https://calbok.example/api/call-inbox?before=bad',{headers:{cookie:'calbok_session='+token}}));assert.equal(result.status,400);assert.equal(result.headers.get('cache-control'),'no-store');
 assert.equal((await GET(new Request('https://calbok.example/api/call-inbox?before=bad'))).status,401);
 }finally{db().close();}
});
