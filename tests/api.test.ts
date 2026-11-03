import { test } from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join,resolve,sep} from 'node:path';
import {tmpdir} from 'node:os';
const directory=mkdtempSync(join(tmpdir(),'calbok-api-test-'));
process.env.CALBOK_DB_PATH=join(directory,'test.sqlite');
process.env.CALBOK_ADMIN_TOKEN='test-only-api-token';
delete process.env.TATUM_API_KEY;
delete process.env.MEMWAL_PRIVATE_KEY;
const {GET,POST}=await import('../app/api/workspace/route');
const {POST:action}=await import('../app/api/actions/route');
const {db}=await import('../lib/db');
const {GET:searchAssets,POST:verifyAsset}=await import('../app/api/assets/route');
const request=(payload:unknown,path='workspace')=>new Request(`http://localhost:3000/api/${path}`,{method:'POST',headers:{host:'localhost:3000',authorization:'Bearer test-only-api-token','Content-Type':'application/json'},body:JSON.stringify(payload)});
test('API capture → SQL receipt → pending settlement; unconfigured provider fails closed',async()=>{
  try{
    const claim={caller:'API TEST ONLY',text:'Synthetic API test: Bitcoin higher in 24h',asset:'BTC',direction:'bullish',horizon:'24h',sourceUrl:''};
    const create=await POST(request(claim));assert.equal(create.status,201);
    const {id}=await create.json();assert.match(id,/^CB-/);
    assert.equal((await POST(request(claim))).status,409);
    const list=await GET(new Request('http://localhost:3000/api/workspace',{headers:{host:'localhost:3000',authorization:'Bearer test-only-api-token'}}));
    const data=await list.json();assert.equal(data.receipts.length,1);assert.equal(data.receipts[0].id,id);assert.equal(data.receipts[0].outcome,null);
    const pending=await action(request({action:'settle',id},'actions'));assert.equal(pending.status,200);assert.match((await pending.json()).message,/Pending/);
    const sui=await action(request({action:'sui'},'actions'));assert.equal(sui.status,503);assert.equal((await sui.json()).error,'TATUM_NOT_CONFIGURED');
    const invalid=await POST(request({...claim,asset:'UNKNOWN'}));assert.equal(invalid.status,400);
    // User-supplied screenshot attributed to Ansem; authorship is not verified.
    // Preserve the missing direction/deadline rather than manufacture a contract.
    const screenshotSubmission={caller:'Ansem (@blknoiz06) — unverified screenshot',asset:'VVV',text:"if you aren't paying attention to venice ai, you should be.\n- 5 million users\n- API Calls are up 400% since July\nthis is fueling $10.4M/yr burn for $VVV",sourceUrl:''};
    const screenshotResult=await POST(request(screenshotSubmission));
    assert.equal(screenshotResult.status,400,'Unsupported asset and absent scoring terms must be rejected');
    assert.equal(db().prepare('SELECT COUNT(*) AS n FROM predictions').get()?.n,1,'Rejected screenshot must not become a scored receipt');
    const catalogResponse=await searchAssets(new Request('http://localhost:3000/api/assets?provider=Tatum&q=SOL',{headers:{host:'localhost:3000',authorization:'Bearer test-only-api-token'}}));
    assert.equal(catalogResponse.status,200);assert.ok((await catalogResponse.json()).assets.some((a:{id:string})=>a.id==='SOL'));
    const inventedToken='gmgn:base:0x'+'a'.repeat(40);
    assert.equal((await POST(request({...claim,asset:inventedToken}))).status,400,'Syntactically valid but undiscovered contracts cannot be locked');
    assert.equal((await verifyAsset(request({asset:inventedToken},'assets'))).status,400,'Undiscovered token must not trigger a provider call');
    assert.equal(db().prepare('SELECT COUNT(*) AS n FROM settlements').get()?.n,0);
  }finally{db().close();assert.ok(resolve(directory).startsWith(resolve(tmpdir())+sep));rmSync(directory,{recursive:true,force:true});}
});
