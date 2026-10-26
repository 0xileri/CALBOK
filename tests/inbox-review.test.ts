import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {randomUUID} from 'node:crypto';
const directory=mkdtempSync(join(tmpdir(),'calbok-inbox-review-test-'));
process.env.CALBOK_DB_PATH=join(directory,'reviews.sqlite');process.env.CALBOK_ADMIN_TOKEN='REVIEW_TEST_ONLY_OWNER_SECRET_32_CHARACTERS';process.env.CALBOK_PUBLIC_ORIGIN='https://calbok.example';
const {GET,PUT}=await import('../app/api/inbox-review/route');
const {createSession}=await import('../lib/auth');
const {db}=await import('../lib/db');
const {logInbox,listInbox}=await import('../lib/call-inbox');
const {inboxSummary}=await import('../lib/inbox-export');
test('inbox reviews remain private, reject stale changes and never become scored outcomes or exports',async()=>{
 try {
  const alice=createSession({id:'alice',role:'user',email:null}),bob=createSession({id:'bob',role:'user',email:null});
  const call=logInbox('alice',{requestId:randomUUID(),text:'REVIEW TEST ONLY: Original call',caller:'Original caller',sourceUrl:''});
  const request=(token:string|null,payload?:unknown,origin:string|null='https://calbok.example',id=call.id)=>new Request('https://calbok.example/api/inbox-review?id='+id,{method:payload?'PUT':'GET',headers:{host:'calbok.example',...(token?{cookie:'calbok_session='+token}:{}),...(origin?{origin}:{}),'Content-Type':'application/json'},...(payload?{body:JSON.stringify(payload)}:{})});
  assert.equal((await GET(request(null))).status,401);assert.equal((await GET(request(bob))).status,404);
  const read=await GET(request(alice));assert.equal(read.headers.get('Cache-Control'),'no-store');assert.deepEqual((await read.json()).review,{note:'',reviewed:false,version:0,updatedAt:null});
  const input={id:call.id,note:'PRIVATE LESSON: confirm the market next time.\nUntrusted <script>text</script>.',reviewed:true,version:0};
  assert.equal((await PUT(request(alice,input,'https://evil.example'))).status,403);assert.equal((await PUT(request(alice,input,null))).status,403);
  assert.equal((await PUT(request(bob,input))).status,404);assert.equal((await PUT(request(alice,{...input,owner:'bob'}))).status,400);
  assert.equal((await PUT(request(alice,{...input,note:'x'.repeat(2001)}))).status,400);
  const saved=await PUT(request(alice,input));assert.equal(saved.status,200);const result=(await saved.json()).review;assert.equal(result.note,input.note);assert.equal(result.reviewed,true);assert.equal(result.version,1);
  assert.equal((await PUT(request(alice,{...input,note:'Stale overwrite'}))).status,409);
  const row=listInbox('alice').calls[0];assert.equal(row.reviewed,true);assert.equal(row.text,call.text);assert.equal(row.logged_at,call.logged_at);assert.equal((row as unknown as Record<string,unknown>).note,undefined);
  assert.equal(listInbox('bob').total,0);assert.ok(!inboxSummary({...row,...result}).includes('PRIVATE LESSON'));
  assert.equal((await PUT(request(alice,{...input,note:'',reviewed:false,version:1}))).status,200);
  assert.equal((await PUT(request(alice,{...input,version:1}))).status,409);
  assert.equal(listInbox('alice').calls[0].reviewed,false);
  assert.equal((await GET(request(alice,undefined,'https://calbok.example','LOG-missing'))).status,404);
  for(const table of ['predictions','settlement_jobs','memory_jobs'])assert.equal(db().prepare('SELECT COUNT(*) AS n FROM '+table).get()?.n,0);
 } finally {db().close();assert.ok(resolve(directory).startsWith(resolve(tmpdir())+sep));rmSync(directory,{recursive:true,force:true});}
});
