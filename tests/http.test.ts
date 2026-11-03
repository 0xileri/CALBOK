import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authorize, body, originGuard } from '../lib/http';
test('spoofed loopback Host and forwarding headers cannot grant owner access',()=>{
  delete process.env.CALBOK_ADMIN_TOKEN;
  for(const host of ['localhost:3000','127.0.0.1:3000']) {
    const request=new Request('http://remote.example/api',{headers:{host,'x-forwarded-for':'127.0.0.1','x-real-ip':'127.0.0.1',origin:'http://'+host}});
    assert.equal(authorize(request)?.status,403);
  }
  assert.equal(authorize(new Request('http://localhost:3000/api',{headers:{host:'localhost:3000'}}))?.status,403);
  assert.equal(authorize(new Request('http://localhost:3000/api',{headers:{host:'localhost:3000',origin:'https://evil.example'}}))?.status,403);
});
test('operator token required when configured',()=>{
  process.env.CALBOK_ADMIN_TOKEN='test-only-token';
  assert.equal(authorize(new Request('http://localhost/api',{headers:{host:'localhost'}}))?.status,401);
  assert.equal(authorize(new Request('http://localhost/api',{headers:{host:'localhost',authorization:'Bearer test-only-token'}})),undefined);
  delete process.env.CALBOK_ADMIN_TOKEN;
});
test('request size bounded during streaming',async()=>{
  await assert.rejects(()=>body(new Request('http://localhost/api',{method:'POST',body:'a'.repeat(9000)})),/too large/);
});
test('HTTPS proxy deployment accepts only the configured browser origin',()=>{
  process.env.CALBOK_ADMIN_TOKEN='test-only-token';
  process.env.CALBOK_PUBLIC_ORIGIN='https://calbok.example';
  const headers={host:'calbok.example',authorization:'Bearer test-only-token',origin:'https://calbok.example'};
  assert.equal(authorize(new Request('http://internal:3000/api',{headers})),undefined);
  assert.equal(authorize(new Request('http://internal:3000/api',{headers:{...headers,origin:'https://evil.example'}}))?.status,403);
  delete process.env.CALBOK_PUBLIC_ORIGIN;
  delete process.env.CALBOK_ADMIN_TOKEN;
});


test('explicit owned domain aliases work while unlisted, malformed and absent origins stay blocked',()=>{
  process.env.CALBOK_PUBLIC_ORIGIN='https://calbok.example';
  process.env.CALBOK_ADDITIONAL_ORIGINS='https://calbok.xyz, https://calbok.example/path, *, null, https://calbok.xyz/';
  const request=(origin?:string)=>new Request('http://internal:3000/api/auth',{headers:{host:'internal:3000',...(origin?{origin}:{})}});
  try {
    assert.equal(originGuard(request('https://calbok.xyz'),true),undefined);
    assert.equal(originGuard(request('https://calbok.example'),true),undefined);
    for(const origin of ['https://evil.example','https://calbok.xyz.evil.example','http://calbok.xyz','null','https://calbok.example/path','https://calbok.xyz/'])assert.equal(originGuard(request(origin),true)?.status,403);
    assert.equal(originGuard(request(),true)?.status,403);
    delete process.env.CALBOK_ADDITIONAL_ORIGINS;
    assert.equal(originGuard(request('https://calbok.xyz'),true)?.status,403);
  }finally{delete process.env.CALBOK_PUBLIC_ORIGIN;delete process.env.CALBOK_ADDITIONAL_ORIGINS;}
});
