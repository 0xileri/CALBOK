import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
process.env.CALBOK_DB_PATH=join(mkdtempSync(join(tmpdir(),'calbok-judges-')),'test.sqlite');
process.env.CALBOK_ADMIN_TOKEN='SYNTHETIC_ADMIN_SECRET_FOR_TESTS';
process.env.CALBOK_OWNER_EMAIL='owner@example.test';
process.env.CALBOK_SESSION_SECRET='SYNTHETIC_SESSION_SECRET_OVER_32_CHARACTERS';
process.env.CALBOK_PUBLIC_ORIGIN='https://calbok.example';
process.env.CALBOK_PUBLIC_SIGNIN_ENABLED='true';
process.env.CALBOK_USER_PROVIDER_ACCESS='true';
process.env.CALBOK_WORKER_ENABLED='true';
process.env.MEMWAL_PRIVATE_KEY='SYNTHETIC_TEST_ONLY';
process.env.MEMWAL_ACCOUNT_ID='SYNTHETIC_TEST_ONLY';
process.env.MEMWAL_NETWORK='mainnet';
process.env.RESEND_API_KEY='SYNTHETIC_RESEND_TEST_ONLY';
process.env.CALBOK_EMAIL_FROM='CALBOK <login@example.test>';
const {db,capture,listReceipts}=await import('../lib/db');
const {requestCode,verifyCode,createSession}=await import('../lib/auth');
const {GET:workspace,POST:lock}=await import('../app/api/workspace/route');
const {POST:action}=await import('../app/api/actions/route');
const {runSettlement}=await import('../lib/settlement-worker');
const {normalizeCoinbaseCandle}=await import('../lib/coinbase-pricing');
const {rememberReceipt,automaticMemoryTick,automaticMemoryStatus,setAutomaticMemory}=await import('../lib/automatic-memory');
const {recallReceipt}=await import('../lib/receipt-recall');
const {reserveUserBudget,UserLimitError}=await import('../lib/user-limits');
const {ownerPublicProof}=await import('../lib/public-proof');
const {default:ProofPage}=await import('../app/proof/page');
const {FirstCallGuide}=await import('../components/first-call-guide');
const {PublicProofView}=await import('../components/public-proof');
const {POST:signIn}=await import('../app/api/auth/route');
const {saveReceiptNote}=await import('../lib/receipt-notes');
const {logInbox}=await import('../lib/call-inbox');
const {saveAccountProfile}=await import('../lib/account-profile');
const {publishReceipt}=await import('../lib/publication');
const claim={caller:'SYNTHETIC TEST',text:'SYNTHETIC JUDGE TEST ONLY',asset:'BTC',direction:'bullish' as const,horizon:'15m' as const,sourceUrl:''};
const receipt=(id:string)=>listReceipts().find(row=>row.id===id)!;
const req=(token:string,payload?:unknown)=>new Request('https://calbok.example/api/workspace',{method:payload?'POST':'GET',headers:{origin:'https://calbok.example',cookie:'calbok_session='+token,'Content-Type':'application/json'},...(payload?{body:JSON.stringify(payload)}:{})});
type Factory=NonNullable<Parameters<typeof rememberReceipt>[3]>;

test('judge email session starts empty; member lock, settlement, memory, recall and durable limits stay scoped',async(t)=>{
 let now=Date.UTC(2026,8,1);const at=(time:number)=>{now=time;t.mock.timers.reset();t.mock.timers.enable({apis:['Date'],now});};
 try{
  at(now);let code='';const challenge=await requestCode('judge@example.test',async(_email,value)=>{code=value;});
  const user=verifyCode(challenge,code)!;assert.equal(user.role,'user');assert.notEqual(user.id,'operator');
  const token=createSession(user);assert.equal((await (await workspace(req(token))).json()).receipts.length,0);
  const emailChallenge=await requestCode('browser-judge@example.test',async(_email,value)=>{code=value;});
  const emailResponse=await signIn(req('',{action:'verify',id:emailChallenge,code}));
  assert.equal(emailResponse.status,200);assert.match(emailResponse.headers.get('set-cookie')||'',/calbok_session=.*HttpOnly/);
  const ids:string[]=[];
  for(let i=0;i<10;i++){const response=await lock(req(token,{...claim,text:claim.text+i}));assert.equal(response.status,201);ids.push((await response.json()).id);}
  for(let i=0;i<10;i++)reserveUserBudget(user.id,'locks');
  assert.equal((await lock(req(token,{...claim,text:'SYNTHETIC ELEVENTH LOCK'}))).status,429);
  assert.equal(listReceipts(user.id).length,10);
  const reopened=new DatabaseSync(process.env.CALBOK_DB_PATH!);
  assert.equal(reopened.prepare("SELECT count FROM user_usage WHERE owner_id=? AND budget='locks'").get(user.id)?.count,20);reopened.close();
  const other={id:'another-judge',role:'user' as const,email:'another@example.test'};
  assert.equal((await lock(req(createSession(other),claim))).status,201,'Limits belong to each user');
  process.env.CALBOK_USER_PROVIDER_ACCESS='false';assert.equal((await action(req(token,{action:'settle',id:ids[0]}))).status,403);
  process.env.CALBOK_USER_PROVIDER_ACCESS='true';
  const settledAt=Date.parse(receipt(ids[0]).deadline)+120000;at(settledAt);
  for(const id of ids)assert.equal((await runSettlement(id,{clock:()=>now,fetchCandles:async(_asset,boundary)=>{
   const minute=Math.ceil(boundary/60000)*60000,open=boundary===Date.parse(receipt(id).locked_at)?100:110;
   return [normalizeCoinbaseCandle('BTC',[minute/1000,90,120,open,110,1])];
  }})).result?.outcome,'won');
  let writes=0;const factory:Factory=async namespace=>({
   remember:async text=>{writes++;const id=JSON.parse(text).predictionId;return {job_id:'job-'+id,status:'pending'};},
   waitForRememberJob:async id=>({id,job_id:id,blob_id:'blob-'+id,owner:'synthetic',namespace}),
   getRememberStatus:async id=>({job_id:id,status:'done',blob_id:'blob-'+id}),
   recall:async()=>({results:ids.map(id=>({text:JSON.stringify({predictionId:id}),blob_id:'blob-job-'+id,distance:0})),total:ids.length}),
   listMemories:async()=>{throw Error('Unexpected list');},
  });
  // Member backfill works even when the owner's automatic-write toggle is off.
  setAutomaticMemory(false);await automaticMemoryTick(factory,()=>now);assert.equal(writes,1);
  assert.equal(automaticMemoryStatus().used,0,'Member writes never consume the operator approval budget');
  assert.equal((await rememberReceipt(receipt(ids[0]),user.id,false,factory)).status,200);
  for(const id of ids.slice(1))assert.equal((await rememberReceipt(receipt(id),user.id,false,factory)).status,200);
  assert.equal(writes,10);
  at(Date.UTC(2026,8,1,1));const next=capture({...claim,text:'SYNTHETIC LATER SAME GROUP'},user.id);
  const review=await recallReceipt(receipt(next),user.id,factory);assert.equal(review.citedIds.length,10);assert.equal(review.priority,'informational');
  assert.ok(review.sqlCitation.rows.every(row=>ids.includes(row.receiptId)));
  at(Date.parse(receipt(next).deadline)+120000);
  await runSettlement(next,{clock:()=>now,fetchCandles:async(_asset,boundary)=>[normalizeCoinbaseCandle('BTC',[Math.ceil(boundary/60000)*60,90,120,100,110,1])]});
  assert.equal((await rememberReceipt(receipt(next),user.id,false,factory)).status,429);assert.equal(writes,10);
  assert.equal(db().prepare('SELECT 1 FROM memory_jobs WHERE prediction_id=?').get(next),undefined,'Quota rejection rolls back the queued reservation');
  await automaticMemoryTick(factory,()=>now);assert.equal(writes,10);
  assert.equal((await rememberReceipt(receipt(next),'operator',false,factory)).status,403);
  const limited=capture({...claim,text:'SYNTHETIC READ QUOTA SETTLEMENT'},'read-heavy');at(Date.parse(receipt(limited).deadline)+120000);
  for(let i=0;i<60;i++)reserveUserBudget('read-heavy','provider-reads',now);
  assert.throws(()=>reserveUserBudget('read-heavy','provider-reads',now),UserLimitError);
  assert.equal((await runSettlement(limited,{clock:()=>now,fetchCandles:async()=>{throw Error('Quota must block provider calls');}})).error,'ACCOUNT_PROVIDER_LIMIT');
  const limitedJob=db().prepare('SELECT status,attempts FROM settlement_jobs WHERE prediction_id=?').get(limited)!;
  assert.equal(limitedJob.status,'retry');assert.equal(limitedJob.attempts,0,'Quota exhaustion is not a provider failure');
  reserveUserBudget('read-heavy','provider-reads',now+3600000);
  at(Date.UTC(2026,8,2));assert.equal((await rememberReceipt(receipt(next),user.id,false,factory)).status,200);assert.equal(writes,11);
 }finally{t.mock.timers.reset();}
});

test('public proof page needs no session and exposes only verified owner evidence, never private records',async()=>{
 const privateValues=['PRIVATE_EMAIL@example.test','PRIVATE_NOTE_SENTINEL','RAW_MEMORY_SENTINEL','TOKEN_SENTINEL','INBOX_SENTINEL'];
 const id=capture({...claim,text:privateValues.join(' '),sourceUrl:'https://example.test/TOKEN_SENTINEL'});
 saveAccountProfile({id:'operator',role:'operator',email:null},{displayName:'',publicHandle:'proof_owner'});
 publishReceipt(id,{id:'operator',role:'operator',email:null});
 const stillPrivate=capture({...claim,text:'PRIVATE OWNER RECEIPT MUST NOT LEAK THROUGH PROOF'});
 saveReceiptNote(id,'operator','PRIVATE_NOTE_SENTINEL',0);
 logInbox('operator',{requestId:randomUUID(),caller:'PRIVATE_EMAIL@example.test',text:'INBOX_SENTINEL',sourceUrl:''});
 const row=receipt(id),now=Date.parse(row.deadline)+120000;
 await runSettlement(id,{clock:()=>now,fetchCandles:async(_asset,boundary)=>[normalizeCoinbaseCandle('BTC',[Math.ceil(boundary/60000)*60,90,120,boundary===Date.parse(row.locked_at)?100:110,110,1])]});
 db().prepare('INSERT INTO memory_jobs(prediction_id,namespace,status,job_id,blob_id,completed_at,error) VALUES (?,?,?,?,?,?,?)').run(id,'PRIVATE_NAMESPACE','done','PRIVATE_JOB','PUBLIC_BLOB',new Date(now).toISOString(),'PRIVATE_NOTE_SENTINEL');
 db().prepare('INSERT INTO memory_completion_proofs VALUES (?,?,?,?,?)').run(id,'PRIVATE_JOB','PUBLIC_BLOB','mainnet',new Date(now).toISOString());
 const proof=ownerPublicProof();assert.deepEqual(proof.receipts.map(r=>r.id),[id]);assert.equal(proof.receipts[0].blobId,'PUBLIC_BLOB');assert.equal(proof.receipts[0].provider,'Coinbase');
 assert.equal(proof.stages.find(stage=>stage.key==='lock')?.count,1);assert.ok(!JSON.stringify(proof).includes(stillPrivate));
 const html=renderToStaticMarkup(ProofPage()),serialized=JSON.stringify(proof);
 assert.match(html,/Public integration proof/);assert.match(html,/PUBLIC_BLOB/);
 for(const secret of [...privateValues,'PRIVATE_NAMESPACE','PRIVATE_JOB',process.env.CALBOK_ADMIN_TOKEN!]){assert.ok(!html.includes(secret));assert.ok(!serialized.includes(secret));}
 for(const forbidden of ['email','text','snapshot','source_url','namespace','review','inbox','token'])assert.ok(!Object.keys(proof.receipts[0]).includes(forbidden));
 assert.equal(proof.stages.find(s=>s.key==='settle')?.count,1);
  const scheduled=renderToStaticMarkup(createElement(PublicProofView,{proof:{...proof,receipts:proof.receipts.map(row=>({...row,ownerScheduled:true}))}}));
  assert.match(scheduled,/Owner-scheduled repeat prediction, not a new caller post/);
});

test('new-account guide offers an explicit 15m lock and public proof without pretending history exists',()=>{
 const html=renderToStaticMarkup(createElement(FirstCallGuide,{receipts:[],jobs:[],onCreate(){},onOpen(){},onMemory(){}}));
 assert.match(html,/Lock your first 15m call/);assert.match(html,/href="\/proof"/);assert.match(html,/account starts empty/);assert.match(html,/0\/3/);
});
