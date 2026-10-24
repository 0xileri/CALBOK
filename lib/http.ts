import { timingSafeEqual } from 'node:crypto';
export function authorize(request:Request) {
  const token = process.env.CALBOK_ADMIN_TOKEN;
  const host = request.headers.get('host') || '';
  const origin = request.headers.get('origin');
  // Next's internal request URL may say localhost while the browser uses
  // 127.0.0.1. Compare to the actual Host header, retaining the protocol check.
  const requestOrigin=process.env.CALBOK_PUBLIC_ORIGIN || `${new URL(request.url).protocol}//${host.toLowerCase()}`;
  if (origin && origin !== requestOrigin) return Response.json({error:'Cross-origin requests refused.'},{status:403});
  if (token) {
    const supplied = request.headers.get('authorization')?.replace(/^Bearer /,'') || '';
    if (Buffer.byteLength(supplied)!==Buffer.byteLength(token) || !timingSafeEqual(Buffer.from(supplied),Buffer.from(token))) return Response.json({error:'Operator token required.'},{status:401});
  } else if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) return Response.json({error:'Configure an operator token before remote access.'},{status:403});
}
export async function body(request:Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing request body');
  let content='', size=0;
  const decoder = new TextDecoder();
  while(true) { const part=await reader.read(); if(part.done) break; size+=part.value.byteLength; if(size>8192) {await reader.cancel();throw new Error('Request too large');} content+=decoder.decode(part.value,{stream:true}); }
  return JSON.parse(content+decoder.decode());
}
const buckets = new Map<string,{start:number;count:number}>();
export function rateLimit() {
  // Single-operator local release: a global budget also caps provider costs.
  const key='operator', now=Date.now(), bucket=buckets.get(key);
  if(!bucket || now-bucket.start>60_000) {buckets.set(key,{start:now,count:1}); return false;}
  return ++bucket.count>20;
}
