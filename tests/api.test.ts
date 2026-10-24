import { test } from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join,resolve,sep} from 'node:path';
import {tmpdir} from 'node:os';
const directory=mkdtempSync(join(tmpdir(),'calbok-api-test-'));
process.env.CALBOK_DB_PATH=join(directory,'test.sqlite');
delete process.env.CALBOK_ADMIN_TOKEN;
delete process.env.TATUM_API_KEY;
delete process.env.MEMWAL_PRIVATE_KEY;
const {GET,POST}=await import('../app/api/workspace/route');
const {POST:action}=await import('../app/api/actions/route');
const {db}=await import('../lib/db');
const request=(payload:unknown,path='workspace')=>new Request(`http://localhost:3000/api/${path}`,{method:'POST',headers:{host:'localhost:3000','Content-Type':'application/json'},body:JSON.stringify(payload)});
test('API capture → SQL receipt → pending settlement; unconfigured provider fails closed',async()=>{
  try{
    const claim={caller:'API TEST ONLY',text:'Synthetic API test: Bitcoin higher in 24h',asset:'BTC',direction:'bullish',horizon:'24h',sourceUrl:''};
    const create=await POST(request(claim));assert.equal(create.status,201);
    const {id}=await create.json();assert.match(id,/^CB-/);
    assert.equal((await POST(request(claim))).status,409);
    const list=await GET(new Request('http://localhost:3000/api/workspace',{headers:{host:'localhost:3000'}}));
    const data=await list.json();assert.equal(data.receipts.length,1);assert.equal(data.receipts[0].id,id);assert.equal(data.receipts[0].outcome,null);
    const pending=await action(request({action:'settle',id},'actions'));assert.equal(pending.status,200);assert.match((await pending.json()).message,/Pending/);
    const sui=await action(request({action:'sui'},'actions'));assert.equal(sui.status,503);assert.equal((await sui.json()).error,'TATUM_NOT_CONFIGURED');
    const invalid=await POST(request({...claim,asset:'UNKNOWN'}));assert.equal(invalid.status,400);
    assert.equal(db().prepare('SELECT COUNT(*) AS n FROM settlements').get()?.n,0);
  }finally{db().close();assert.ok(resolve(directory).startsWith(resolve(tmpdir())+sep));rmSync(directory,{recursive:true,force:true});}
});
