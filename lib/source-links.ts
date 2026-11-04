/** Source links are public references, never credentials or executable URLs. */
export function safeSourceUrl(value:unknown):string|null {
 if(typeof value!=='string'||!value.trim()||value.length>2048||/[\u0000-\u001f\u007f]/.test(value))return null;
 try{
  const url=new URL(value.trim());
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password)return null;
  const sensitive=/^(?:access_token|refresh_token|token|api_key|apikey|authorization|password|secret|session|cookie|private_key|email)$/i;
  for(const key of [...url.searchParams.keys(),...new URLSearchParams(url.hash.slice(1)).keys()])if(sensitive.test(key))return null;
  if(/[^\s/@]+@[^\s/@]+\.[^\s/@]+/.test(decodeURIComponent(url.href)))return null;
  return url.href;
 }catch{return null;}
}
export function sourceLabel(value:unknown){
 const safe=safeSourceUrl(value);if(!safe)return null;
 const url=new URL(safe),host=url.hostname.replace(/^www\./,'');
 const handle=url.pathname.split('/').filter(Boolean)[0];
 return ['x.com','twitter.com'].includes(host)&&handle&&/^[a-zA-Z0-9_]{1,30}$/.test(handle)&&!['i','home','search','intent'].includes(handle.toLowerCase())?host+'/'+handle:host;
}
