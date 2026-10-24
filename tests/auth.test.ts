import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const directory=mkdtempSync(join(tmpdir(),'calbok-auth-test-'));
process.env.CALBOK_DB_PATH=join(directory,'auth.sqlite');
process.env.CALBOK_ADMIN_TOKEN='TEST_ONLY_OPERATOR_SECRET_32_CHARACTERS';
process.env.CALBOK_PUBLIC_ORIGIN='https://calbok.example';
process.env.CALBOK_SESSION_SECRET='TEST_ONLY_CODE_SECRET_32_CHARACTERS';
process.env.CALBOK_OWNER_EMAIL='owner@example.com';
process.env.CALBOK_PUBLIC_SIGNIN_ENABLED='true';
const {createSession,principal,cookie,requestCode,verifyCode,revokeSession}=await import('../lib/auth');
const {capture,listReceipts,db,hash}=await import('../lib/db');
const {GET:workspace,POST:captureRoute}=await import('../app/api/workspace/route');
const {POST:action}=await import('../app/api/actions/route');
const {POST:auth}=await import('../app/api/auth/route');
function request(path:string,token?:string,payload?:unknown,origin='https://calbok.example') {return new Request('https://calbok.example/api/'+path,{method:payload?'POST':'GET',headers:{host:'calbok.example',origin,...(token?{cookie:'calbok_session='+token}:{}),'Content-Type':'application/json'},...(payload?{body:JSON.stringify(payload)}:{})});}
test('sessions isolate journals, jobs and actions; email challenges expire, lock out and cannot replay',async()=>{
  try {
    const alice=createSession({id:'alice',email:'alice@example.com',role:'user'}),bob=createSession({id:'bob',email:'bob@example.com',role:'user'});
    assert.equal(principal(request('workspace',alice))?.id,'alice');assert.equal(principal(request('workspace',bob))?.id,'bob');
    const stored=db().prepare('SELECT token_hash FROM sessions').all();assert.ok(!JSON.stringify(stored).includes(alice));assert.ok(JSON.stringify(stored).includes(hash(alice)));
    assert.match(cookie(alice,request('auth')),/HttpOnly; SameSite=Lax; Max-Age=604800; Secure/);
    const claim={caller:'Same caller',text:'AUTH TEST ONLY: price higher',asset:'BTC',direction:'bullish' as const,horizon:'24h' as const,sourceUrl:''};
    const a=capture(claim,'alice'),b=capture(claim,'bob'),legacy=capture({...claim,text:'Legacy operator test only'});
    assert.equal(listReceipts('alice').length,1);assert.equal(listReceipts('bob').length,1);assert.equal(listReceipts('operator')[0].id,legacy);
    db().prepare('INSERT INTO memory_jobs(prediction_id,namespace,status) VALUES (?,?,?)').run(b,'bob-private','queued');
    const state=await (await workspace(request('workspace',alice))).json();assert.deepEqual(state.receipts.map((row:{id:string})=>row.id),[a]);assert.equal(state.memoryJobs.length,0);assert.ok(state.settlement.jobs.every((job:{prediction_id:string})=>job.prediction_id===a));
    assert.throws(()=>db().prepare('UPDATE prediction_owners SET owner_id=? WHERE prediction_id=?').run('alice',b),/immutable/);
    assert.equal((await action(request('actions',alice,{action:'settle',id:b}))).status,403);
    process.env.CALBOK_USER_PROVIDER_ACCESS='true';assert.equal((await action(request('actions',alice,{action:'settle',id:b}))).status,404);
    const created=await captureRoute(request('workspace',alice,{...claim,text:'Second private test only',owner_id:'bob'}));assert.equal(created.status,201);assert.equal(listReceipts('alice').length,2);assert.equal(listReceipts('bob').length,1);
    let code='';const send=async(_email:string,value:string)=>{code=value;};const now=Date.now();
    const id=await requestCode('alice@example.com',send,now);assert.match(code,/^\d{8}$/);const good=code;
    assert.ok(!JSON.stringify(db().prepare('SELECT * FROM login_codes').all()).includes(good));
    assert.equal(verifyCode(id,'WRONG',now),null);assert.ok(verifyCode(id,good,now));assert.equal(verifyCode(id,good,now),null);
    const expired=await requestCode('expire@example.com',send,now);assert.equal(verifyCode(expired,code,now+600_000),null);
    const locked=await requestCode('locked@example.com',send,now),lockedCode=code;for(let i=0;i<5;i++)assert.equal(verifyCode(locked,'incorrect',now),null);assert.equal(verifyCode(locked,lockedCode,now),null);
    const owner=await requestCode('owner@example.com',send,now);assert.equal(verifyCode(owner,code,now)?.id,'operator');
    for(let i=0;i<5;i++)await requestCode('limited@example.com',send,now);await assert.rejects(()=>requestCode('limited@example.com',send,now),/Too many/);
    process.env.CALBOK_PUBLIC_SIGNIN_ENABLED='false';let sent=false;await requestCode('closed@example.com',async()=>{sent=true;},now);assert.equal(sent,false);
    const wrongOrigin=await auth(request('auth',undefined,{action:'operator',token:process.env.CALBOK_ADMIN_TOKEN},'https://evil.example'));assert.equal(wrongOrigin.status,403);
    const login=await auth(request('auth',undefined,{action:'operator',token:process.env.CALBOK_ADMIN_TOKEN}));assert.equal(login.status,200);assert.match(login.headers.get('set-cookie')||'',/HttpOnly/);
    revokeSession(request('auth',alice));assert.equal(principal(request('workspace',alice)),null);assert.equal((await workspace(request('workspace',alice))).status,401);
    const expiredSession=createSession({id:'expired',role:'user',email:null},now-8*86400_000);assert.equal(principal(request('workspace',expiredSession)),null);
  }finally{db().close();rmSync(directory,{recursive:true,force:true});}
});
