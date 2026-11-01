import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
process.env.CALBOK_DB_PATH=join(mkdtempSync(join(tmpdir(),'calbok-captured-callers-')),'test.sqlite');
process.env.CALBOK_ADMIN_TOKEN='CALLER_TEST_ONLY_32_CHARACTERS';
const {logInbox,saveInboxReview,inboxCallerGroups,listInbox,parseInboxCursor}=await import('../lib/call-inbox');
const {callerKey}=await import('../lib/caller-key');
const {createSession}=await import('../lib/auth');
const {GET}=await import('../app/api/inbox-callers/route');
const {db}=await import('../lib/db');
test('captured profiles group caller labels across full history and isolate notes and owners',async()=>{
 try{
 const first=logInbox('alice',{requestId:crypto.randomUUID(),text:'First captured call',caller:'@SandyXBT',sourceUrl:''});
 for(let i=0;i<104;i++)logInbox('alice',{requestId:crypto.randomUUID(),text:'Call '+i,caller:'@sandyxbt',sourceUrl:''});
 logInbox('alice',{requestId:crypto.randomUUID(),text:'Different label',caller:'Other',sourceUrl:''});
 logInbox('bob',{requestId:crypto.randomUUID(),text:'PRIVATE OTHER OWNER',caller:'@sandyxbt',sourceUrl:''});
 saveInboxReview(first.id,'alice','PRIVATE REVIEW',true,0);
 const groups=inboxCallerGroups('alice'),sandy=groups.find(row=>row.key==='@sandyxbt')!;assert.equal(sandy.captured,105);assert.equal(sandy.reviewed,1);assert.equal(groups.length,2);assert.equal(callerKey('@SandyXBT'),'@sandyxbt');
 const page=listInbox('alice',undefined,'@sandyxbt'),older=listInbox('alice',parseInboxCursor(page.nextCursor),'@sandyxbt');assert.equal(page.total,105);assert.equal(page.calls.length,100);assert.equal(older.calls.length,5);assert.equal(new Set([...page.calls,...older.calls].map(row=>row.id)).size,105);assert.ok(!JSON.stringify(page).includes('PRIVATE REVIEW'));assert.ok(!JSON.stringify(page).includes('PRIVATE OTHER OWNER'));
 const token=createSession({id:'alice',role:'user',email:null});const request=(path:string,cookie=token)=>new Request('https://calbok.example/api/inbox-callers'+path,{headers:cookie?{cookie:'calbok_session='+cookie}:{}});
 assert.equal((await GET(request('',''))).status,401);const response=await GET(request(''));assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal((await response.json()).callers.length,2);
 assert.equal((await GET(request('?caller=%40sandyxbt&before=bad'))).status,400);assert.equal((await (await GET(request('?caller=missing'))).json()).total,0);
 }finally{db().close();}
});
