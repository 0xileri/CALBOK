import {principal} from './auth';
export function originGuard(request:Request,requireOrigin=false) {
  const origin=request.headers.get('origin');
  const expected=process.env.CALBOK_PUBLIC_ORIGIN||`${new URL(request.url).protocol}//${(request.headers.get('host')||'').toLowerCase()}`;
  if((requireOrigin&&!origin)||(origin&&origin!==expected))return Response.json({error:'Cross-origin requests refused.'},{status:403});
}
export function authorize(request:Request) {
  const denied=originGuard(request);if(denied)return denied;
  if(principal(request))return;
  return Response.json({error:process.env.CALBOK_ADMIN_TOKEN?'Sign in to open your private journal.':'Configure an operator token before remote access.'},{status:process.env.CALBOK_ADMIN_TOKEN?401:403});
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
