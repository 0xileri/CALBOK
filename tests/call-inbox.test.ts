import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {randomUUID} from 'node:crypto';
const directory=mkdtempSync(join(tmpdir(),'calbok-inbox-test-'));
process.env.CALBOK_DB_PATH=join(directory,'inbox.sqlite');
process.env.CALBOK_ADMIN_TOKEN='INBOX_TEST_ONLY_OWNER_SECRET_32_CHARACTERS';
process.env.CALBOK_PUBLIC_ORIGIN='https://calbok.example';
const {GET,POST}=await import('../app/api/call-inbox/route');
const {createSession}=await import('../lib/auth');
const {db,listReceipts}=await import('../lib/db');
test('quick calls need no market or horizon, isolate owners, and retry without duplicates or provider jobs',async()=>{
  try{
    const alice=createSession({id:'alice',role:'user',email:null}),bob=createSession({id:'bob',role:'user',email:null});
    const input={requestId:randomUUID(),text:'LONG $ansem\n @ $0.69',caller:'@sandyXBT',sourceUrl:'https://x.com/example/status/123'};
    const request=(token:string|null,payload?:unknown,origin:string|null='https://calbok.example')=>new Request('https://calbok.example/api/call-inbox',{method:payload?'POST':'GET',headers:{host:'calbok.example',...(token?{cookie:'calbok_session='+token}:{}),...(origin?{origin}:{}),'Content-Type':'application/json'},...(payload?{body:JSON.stringify(payload)}:{})});
    assert.equal((await GET(request(null))).status,401);
    assert.equal((await POST(request(alice,input,'https://evil.example'))).status,403);
    assert.equal((await POST(request(alice,input,null))).status,403);
    const saved=await POST(request(alice,input));assert.equal(saved.status,201);const first=(await saved.json()).call;assert.equal(first.text,input.text);assert.match(first.id,/^LOG-/);assert.ok(Date.parse(first.logged_at));assert.equal(first.owner_id,undefined);assert.equal(first.deadline,undefined);
    const again=await POST(request(alice,input));assert.equal((await again.json()).call.id,first.id);
    assert.equal((await POST(request(alice,{...input,text:'Different retry'}))).status,409);
    const list=await GET(request(alice));assert.equal(list.headers.get('Cache-Control'),'no-store');assert.equal((await list.json()).total,1);
    assert.equal((await (await GET(request(bob))).json()).total,0);
    assert.equal((await POST(request(bob,input))).status,201,'Idempotency keys are scoped to the owner');
    assert.equal((await POST(request(alice,{...input,requestId:randomUUID(),owner_id:'bob'}))).status,400);
    assert.equal((await POST(request(alice,{...input,requestId:randomUUID(),horizon:'24h'}))).status,400);
    assert.equal((await POST(request(alice,{...input,requestId:randomUUID(),text:'   '}))).status,400);
    assert.equal((await POST(request(alice,{...input,requestId:randomUUID(),sourceUrl:'javascript:alert(1)'}))).status,400);
    assert.equal((await POST(request(alice,{requestId:randomUUID(),text:'A plain call, no structured terms.'}))).status,201);
    assert.equal(listReceipts('alice').length,0);
    for(const table of ['predictions','settlement_jobs','memory_jobs'])assert.equal(db().prepare('SELECT COUNT(*) AS n FROM '+table).get()?.n,0);
  }finally{db().close();assert.ok(resolve(directory).startsWith(resolve(tmpdir())+sep));rmSync(directory,{recursive:true,force:true});}
});
