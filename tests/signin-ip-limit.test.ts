import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
process.env.CALBOK_DB_PATH=join(mkdtempSync(join(tmpdir(),'calbok-signin-ip-')),'test.sqlite');
process.env.CALBOK_PUBLIC_ORIGIN='https://calbok.example';
const {signInIpLimited}=await import('../lib/signin-limit');
const {db}=await import('../lib/db');
const {POST}=await import('../app/api/auth/route');
const req=(ip:string,body:unknown={action:'operator',token:'NOT_A_SECRET_TEST'})=>new Request('https://calbok.example/api/auth',{method:'POST',headers:{origin:'https://calbok.example','x-real-ip':ip,'x-forwarded-for':'SPOOFED_'+Math.random(),'Content-Type':'application/json'},body:JSON.stringify(body)});
test('trusted ingress IP limits login attempts across actions and survives DB reconnect; untrusted headers cannot choose a new bucket',async()=>{
 process.env.CALBOK_TRUST_PROXY='true';const now=Date.now();
 for(let i=0;i<30;i++)assert.equal(signInIpLimited(req('192.0.2.10'),now),false);
 assert.equal(signInIpLimited(req('192.0.2.10'),now),true);assert.equal((await POST(req('192.0.2.10'))).status,429);
 const reopened=new DatabaseSync(process.env.CALBOK_DB_PATH!);assert.equal(reopened.prepare('SELECT MAX(count) n FROM signin_ip_limits').get()?.n,30);reopened.close();
 assert.equal((await POST(req('192.0.2.10',{action:'request',email:'different@example.test'}))).status,429);
 assert.equal(signInIpLimited(req('192.0.2.11'),now),false);assert.equal(signInIpLimited(req('192.0.2.10'),now+900000),false);
 // Explicit proxy trust is required outside Railway. Spoofed XFF is never a bucket key.
 delete process.env.CALBOK_TRUST_PROXY;delete process.env.RAILWAY_PROJECT_ID;
 for(let i=0;i<30;i++)assert.equal(signInIpLimited(req('192.0.2.'+i),now),false);
 assert.equal(signInIpLimited(req('203.0.113.1'),now),true);
 assert.equal((await POST(req('203.0.113.1',{action:'logout'}))).status,200,'Rate limiting must never trap a signed-in user');
 assert.ok(!JSON.stringify(db().prepare('SELECT * FROM signin_ip_limits').all()).includes('192.0.2.10'));
});
