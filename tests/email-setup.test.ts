import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
process.env.CALBOK_DB_PATH=join(mkdtempSync(join(tmpdir(),'calbok-email-setup-')),'test.sqlite');
process.env.CALBOK_ADMIN_TOKEN='SYNTHETIC_ADMIN_SECRET_32_CHARACTERS';process.env.CALBOK_PUBLIC_ORIGIN='https://calbok.example';
const {emailSetupStatus,createSession}=await import('../lib/auth');
const {GET,POST}=await import('../app/api/auth/route');
const {db}=await import('../lib/db');
const values={RESEND_API_KEY:'re_synthetic_test',CALBOK_EMAIL_FROM:'CALBOK <login@example.test>',CALBOK_OWNER_EMAIL:'owner@example.test',CALBOK_SESSION_SECRET:'SYNTHETIC_SESSION_SECRET_32_CHARACTERS'};
test('email setup names missing variables without values and owner test uses normal Resend delivery',async()=>{
 const original=globalThis.fetch;
 try{
  Object.assign(process.env,values);assert.equal(emailSetupStatus().configured,true);
  for(const key of Object.keys(values)){delete process.env[key];assert.ok(emailSetupStatus().missing.includes(key as keyof typeof values));assert.equal(emailSetupStatus().configured,false);process.env[key]=values[key as keyof typeof values];}
  process.env.CALBOK_SESSION_SECRET='short';assert.deepEqual(emailSetupStatus().invalid,['CALBOK_SESSION_SECRET']);process.env.CALBOK_SESSION_SECRET=values.CALBOK_SESSION_SECRET;
  const owner=createSession({id:'operator',role:'operator',email:null}),member=createSession({id:'member',role:'user',email:'member@example.test'});
  const request=(token?:string,post=false)=>new Request('https://calbok.example/api/auth',{method:post?'POST':'GET',headers:{origin:'https://calbok.example',...(token?{cookie:'calbok_session='+token}:{}),'Content-Type':'application/json'},...(post?{body:JSON.stringify({action:'test-email'})}:{})});
  for(const token of [undefined,member]){assert.equal((await POST(request(token,true))).status,403);assert.equal((await(await GET(request(token))).json()).emailSetup,undefined);}
  const diagnostics=(await(await GET(request(owner))).json()).emailSetup;assert.equal(diagnostics.configured,true);assert.ok(Object.values(values).every(value=>!JSON.stringify(diagnostics).includes(value)));
  let calls=0;globalThis.fetch=async(input,options)=>{calls++;assert.equal(String(input),'https://api.resend.com/emails');const payload=JSON.parse(String(options?.body));assert.deepEqual(payload.to,[values.CALBOK_OWNER_EMAIL]);assert.equal(payload.from,values.CALBOK_EMAIL_FROM);assert.match(payload.text,/\d{8}/);return Response.json({id:'synthetic-resend-id'});};
  const result=await POST(request(owner,true));assert.equal(result.status,200);assert.equal(calls,1);assert.doesNotMatch(JSON.stringify(await result.json()),/\d{8}/);
  assert.equal(db().prepare('SELECT COUNT(*) n FROM login_codes').get()?.n,1);
 }finally{globalThis.fetch=original;db().close();}
});
