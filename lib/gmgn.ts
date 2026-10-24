import {request as httpsRequest} from 'node:https';
import {randomUUID,createHash} from 'node:crypto';
import {z} from 'zod';
import {gmgnAssetId,type Asset} from './assets';
import type {Candle} from './domain';
import {ProviderError} from './provider-error';
let cooldownUntil=0;
export async function gmgnGet(path:'/v1/market/search'|'/v1/market/token_kline',params:Record<string,string>):Promise<unknown>{
  const key=process.env.GMGN_API_KEY;
  if(!key)throw new ProviderError('GMGN_NOT_CONFIGURED');
  if(Date.now()<cooldownUntil)throw new ProviderError('GMGN_RATE_LIMITED_WAIT');
  const url=new URL(path,'https://openapi.gmgn.ai');
  url.search=new URLSearchParams({...params,timestamp:String(Math.floor(Date.now()/1000)),client_id:randomUUID()}).toString();
  // The official GMGN client uses X-APIKEY + timestamp + client_id for read routes.
  // Pin IPv4 per GMGN requirements; never load signing keys or expose provider errors.
  return new Promise((resolve,reject)=>{
    const req=httpsRequest(url,{family:4,method:'GET',headers:{'X-APIKEY':key,'Accept':'application/json','User-Agent':'CALBOK/0.1'},signal:AbortSignal.timeout(15_000)},res=>{
      const chunks:Buffer[]=[];let bytes=0;
      res.on('data',(chunk:Buffer)=>{bytes+=chunk.length;if(bytes>2_000_000){res.destroy();reject(new ProviderError('GMGN_RESPONSE_TOO_LARGE'));}else chunks.push(chunk);});
      res.on('error',()=>reject(new ProviderError('GMGN_NETWORK_UNAVAILABLE')));
      res.on('end',()=>{
        let json:unknown;try{json=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return reject(new ProviderError('GMGN_RESPONSE_UNVERIFIED'));}
        const envelope=z.object({code:z.number(),data:z.unknown().optional(),reset_at:z.number().optional()}).safeParse(json);
        if(res.statusCode===429 || (envelope.success&&envelope.data.code===429)){
          const header=Number(res.headers['x-ratelimit-reset']);
          cooldownUntil=Math.max(Date.now()+60_000,(envelope.success?envelope.data.reset_at||0:0)*1000,Number.isFinite(header)?header*1000:0);
          return reject(new ProviderError('GMGN_RATE_LIMITED_WAIT'));
        }
        if(res.statusCode!==200||!envelope.success||envelope.data.code!==0)return reject(new ProviderError(`GMGN_REQUEST_FAILED_${res.statusCode||0}`));
        resolve(envelope.data.data);
      });
    });req.on('error',()=>reject(new ProviderError('GMGN_NETWORK_UNAVAILABLE')));req.end();
  });
}
const coinSchema=z.object({chain:z.string(),address:z.string(),symbol:z.string().trim().min(1).max(40),name:z.string().trim().max(160)});
export function normalizeGmgnSearch(raw:unknown):Asset[]{
  const parsed=z.object({coins:z.array(z.unknown())}).safeParse(raw);
  if(!parsed.success)throw new ProviderError('GMGN_SEARCH_SCHEMA_UNVERIFIED');
  const assets:Asset[]=[];
  for(const rawCoin of parsed.data.coins){
    const coin=coinSchema.safeParse(rawCoin);if(!coin.success)continue;
    const {chain,address,symbol,name}=coin.data,id=gmgnAssetId(chain,address);if(!id)continue;
    if(!assets.some(a=>a.id===id))assets.push({id,chain,address:id.split(':')[2],symbol,name,provider:'GMGN',discoveredAt:new Date().toISOString()});
  }return assets;
}
export async function searchGmgn(query:string,chain?:string){return normalizeGmgnSearch(await gmgnGet('/v1/market/search',{q:query,...(chain?{chain}:{})}));}
const decimal=z.string().regex(/^\d+(\.\d+)?$/);
const klineSchema=z.object({list:z.array(z.object({time:z.number().int().nonnegative(),open:decimal,high:decimal,low:decimal,close:decimal}))});
export function normalizeGmgnCandles(raw:unknown):Candle[]{
  const parsed=klineSchema.safeParse(raw);if(!parsed.success)throw new ProviderError('GMGN_CANDLE_SCHEMA_UNVERIFIED');
  const byTime=new Map<number,string>();
  return parsed.data.list.map(row=>{
    // Live GMGN OpenAPI 1m responses use milliseconds (verified 2026-10-24),
    // despite the skills page describing seconds. Pin the observed wire format.
    const openTime=row.time,hash=createHash('sha256').update(JSON.stringify(row)).digest('hex');
    if(row.time<1_000_000_000_000||row.time%60_000!==0)throw new ProviderError('GMGN_CANDLE_TIMESTAMP_UNVERIFIED');
    if(byTime.has(openTime)&&byTime.get(openTime)!==hash)throw new ProviderError('GMGN_CONFLICTING_CANDLES');
    byTime.set(openTime,hash);
    return {openTime,closeTime:openTime+60_000,open:row.open,high:row.high,low:row.low,close:row.close,hash};
  });
}
export async function gmgnCandles(chain:string,address:string,boundary:number){
  if(!gmgnAssetId(chain,address))throw new ProviderError('GMGN_ASSET_INVALID');
  const from=Math.ceil(boundary/60_000)*60_000;
  // Official GMGN CLI converts from/to to milliseconds before the HTTP request.
  return normalizeGmgnCandles(await gmgnGet('/v1/market/token_kline',{chain,address,resolution:'1m',from:String(from),to:String(from+120_000)}));
}
