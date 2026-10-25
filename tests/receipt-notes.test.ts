import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const directory=mkdtempSync(join(tmpdir(),'calbok-note-test-'));
process.env.CALBOK_DB_PATH=join(directory,'notes.sqlite');
process.env.CALBOK_ADMIN_TOKEN='TEST_ONLY_NOTE_SECRET_32_CHARACTERS';
process.env.CALBOK_PUBLIC_ORIGIN='https://calbok.example';
const {db,capture,listReceipts}=await import('../lib/db');
const {createSession}=await import('../lib/auth');
const {GET,PUT}=await import('../app/api/receipt-notes/route');
const {readReceiptNote}=await import('../lib/receipt-notes');
test('receipt notes remain private, preserve immutable calls and reject stale updates',async()=>{
  try {
    const alice=createSession({id:'alice',role:'user',email:null}),bob=createSession({id:'bob',role:'user',email:null});
    const claim={caller:'NOTE TEST ONLY',text:'Synthetic test: Bitcoin price higher',asset:'BTC',direction:'bullish' as const,horizon:'24h' as const,sourceUrl:''};
    const id=capture(claim,'alice'),other=capture(claim,'bob');
    const original=JSON.stringify(listReceipts('alice'));
    function request(token:string|null,receipt=id,payload?:unknown,origin:string|null='https://calbok.example'){return new Request('https://calbok.example/api/receipt-notes?id='+receipt,{method:payload?'PUT':'GET',headers:{host:'calbok.example',...(token?{cookie:'calbok_session='+token}:{}),...(origin?{origin}:{}),'Content-Type':'application/json'},...(payload?{body:JSON.stringify(payload)}:{})});}
    assert.equal((await GET(request(null))).status,401);
    assert.equal((await GET(request(bob))).status,404);
    assert.equal((await GET(request(alice,other))).status,404);
    const initial=await GET(request(alice));assert.equal(initial.headers.get('Cache-Control'),'no-store');assert.deepEqual((await initial.json()).note,{text:'',version:0,updatedAt:null});
    const save=(token:string,payload:unknown,origin:string|null='https://calbok.example')=>PUT(request(token,id,payload,origin));
    const text='Lesson: check the source.\nÉvidence <script>untrusted text</script>';
    assert.equal((await save(alice,{id,text,version:0},'https://evil.example')).status,403);
    assert.equal((await save(alice,{id,text,version:0},null)).status,403);
    assert.equal((await save(bob,{id,text,version:0})).status,404);
    assert.equal((await save(alice,{id,text,version:0,owner:'bob'})).status,400);
    assert.equal((await save(alice,{id,text:'x'.repeat(2001),version:0})).status,400);
    const stored=await save(alice,{id,text,version:0});assert.equal(stored.status,200);assert.equal((await stored.json()).note.version,1);
    assert.equal(readReceiptNote(id,'alice')?.text,text);
    assert.equal((await save(alice,{id,text:'Stale overwrite',version:0})).status,409);
    assert.equal(readReceiptNote(id,'alice')?.text,text);
    assert.equal((await save(alice,{id,text:'',version:1})).status,200);
    assert.equal((await save(alice,{id,text:'Old browser',version:1})).status,409);
    assert.equal(readReceiptNote(id,'alice')?.version,2);assert.equal(readReceiptNote(id,'alice')?.text,'');
    assert.equal((await GET(request(alice,'CB-missing'))).status,404);
    assert.equal((await save(alice,{id:'CB-missing',text,version:0})).status,404);
    assert.equal(JSON.stringify(listReceipts('alice')),original,'Notes must never alter the original receipt or leak into exports');
    assert.equal(db().prepare('SELECT COUNT(*) AS n FROM memory_jobs').get()?.n,0,'Private notes do not enqueue Walrus writes');
  } finally {db().close();rmSync(directory,{recursive:true,force:true});}
});
