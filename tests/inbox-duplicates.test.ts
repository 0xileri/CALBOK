import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
process.env.CALBOK_DB_PATH=join(mkdtempSync(join(tmpdir(),'calbok-duplicates-')),'test.sqlite');
process.env.CALBOK_ADMIN_TOKEN='DUPLICATE_TEST_ONLY_32_CHARACTERS';
process.env.CALBOK_PUBLIC_ORIGIN='https://calbok.example';
const {logInbox,findInboxDuplicates,listInbox}=await import('../lib/call-inbox');
const {comparableSource}=await import('../lib/inbox-duplicates');
const {POST}=await import('../app/api/inbox-duplicates/route');
const {createSession}=await import('../lib/auth');
const {db}=await import('../lib/db');
test('duplicate checks cover older history, match source aliases, stay owner scoped and never save',async()=>{
 try{
 const input={text:'LONG $SUI\n at $3.20',caller:'@caller',sourceUrl:'https://x.com/caller/status/123/history'};
 const original=logInbox('alice',{...input,requestId:crypto.randomUUID()});
 for(let i=0;i<105;i++)logInbox('alice',{text:'Other call '+i,caller:'test',sourceUrl:'',requestId:crypto.randomUUID()});
 assert.ok(!listInbox('alice').calls.some(row=>row.id===original.id));
 assert.equal(findInboxDuplicates('alice','  long $sui at $3.20  ','')[0].id,original.id);
 assert.equal(findInboxDuplicates('alice','Different excerpt','https://twitter.com/caller/status/123?s=20')[0].reason,'Same source link');
 assert.equal(findInboxDuplicates('bob',input.text,input.sourceUrl).length,0);
 assert.equal(findInboxDuplicates('alice','Unrelated','').length,0);
 assert.notEqual(comparableSource('https://example.com/a?q=1'),comparableSource('https://example.com/a?q=2'));
 const token=createSession({id:'alice',role:'user',email:null});
 const request=(cookie:string|null,origin='https://calbok.example',payload:unknown=input)=>new Request('https://calbok.example/api/inbox-duplicates',{method:'POST',headers:{origin,host:'calbok.example','Content-Type':'application/json',...(cookie?{cookie:'calbok_session='+cookie}:{})},body:JSON.stringify(payload)});
 assert.equal((await POST(request(null))).status,401);assert.equal((await POST(request(token,'https://evil.example'))).status,403);
 const result=await POST(request(token));assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'no-store');const data=await result.json();assert.equal(data.matches[0].id,original.id);assert.equal('text' in data.matches[0],false);assert.equal('owner_id' in data.matches[0],false);
 assert.equal((await POST(request(token,'https://calbok.example',{...input,owner:'bob'}))).status,400);
 assert.equal(listInbox('alice').total,106);assert.equal((db().prepare('SELECT COUNT(*) AS n FROM predictions').get() as {n:number}).n,0);
 }finally{db().close();}
});
