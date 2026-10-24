import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authorize, body } from '../lib/http';
test('local guard rejects cross-origin and non-loopback access',()=>{
  delete process.env.CALBOK_ADMIN_TOKEN;
  assert.equal(authorize(new Request('http://localhost:3000/api',{headers:{host:'localhost:3000'}})),undefined);
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
