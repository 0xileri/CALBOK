import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authorize, body } from '../lib/http';
test('local guard rejects cross-origin and non-loopback access',()=>{
  delete process.env.CALBOK_ADMIN_TOKEN;
  assert.equal(authorize(new Request('http://localhost:3000/api',{headers:{host:'localhost:3000'}})),undefined);
  assert.equal(authorize(new Request('http://localhost:3000/api',{headers:{host:'127.0.0.1:3000',origin:'http://127.0.0.1:3000'}})),undefined);
  assert.equal(authorize(new Request('http://localhost:3000/api',{headers:{host:'127.0.0.1:3000',origin:'http://localhost:3000'}}))?.status,403);
  assert.equal(authorize(new Request('http://evil.example/api',{headers:{host:'evil.example'}}))?.status,403);
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
