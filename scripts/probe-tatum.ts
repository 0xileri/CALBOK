import env from '@next/env';
env.loadEnvConfig(process.cwd());
const minute=Number(process.argv[2]||1793710740000);
const variants=[
 ['milliseconds',{unix:String(minute)}],['seconds',{unix:String(minute/1000)}],
 ['omitted',{}],['iso',{time:new Date(minute).toISOString()}]
] as const;
// Current OHLCV docs specify unix (milliseconds) or time (ISO), plus interval.
// They do not document from/to, start/end or limit for this endpoint.
if(!process.env.TATUM_API_KEY)throw new Error('TATUM_API_KEY is required');
for(const asset of ['BTC','STX']) {
 for(const [variant,params] of variants) {
  const url=new URL('https://api.tatum.io/v4/data/rate/symbol/OHLCV');
  url.search=new URLSearchParams({symbol:asset,interval:'1m',...params}).toString();
  try {
   const response=await fetch(url,{headers:{'x-api-key':process.env.TATUM_API_KEY},signal:AbortSignal.timeout(15000)});
   const raw=await response.json();
   console.log(JSON.stringify({asset,variant,openTime:raw.openTime??null,closeTime:raw.closeTime??null}));
  } catch {console.log(JSON.stringify({asset,variant,openTime:null,closeTime:null}));}
 }
}
