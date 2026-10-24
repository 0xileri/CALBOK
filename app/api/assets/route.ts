import {principal} from '@/lib/auth';
import {z} from 'zod';
import {authorize,rateLimit,body} from '@/lib/http';
import {GMGN_CHAINS,TATUM_CATALOG,tatumAssets,isAllowedAsset,parseGmgnAssetId} from '@/lib/assets';
import {registerAsset,knownAsset,db} from '@/lib/db';
import {assetCandles} from '@/lib/providers';
import {boundaryCandle} from '@/lib/domain';
import {randomUUID} from 'node:crypto';
import {searchGmgn} from '@/lib/gmgn';
import {ProviderError} from '@/lib/provider-error';
export const runtime='nodejs';
const cache=new Map<string,{expires:number;assets:Awaited<ReturnType<typeof searchGmgn>>}>();
export async function GET(request:Request){
  const denied=authorize(request);if(denied)return denied;
  const url=new URL(request.url);
  const input=z.object({q:z.string().trim().max(100),provider:z.enum(['Tatum','GMGN']),chain:z.enum([...GMGN_CHAINS,'all'])}).safeParse({q:url.searchParams.get('q')||'',provider:url.searchParams.get('provider')||'Tatum',chain:url.searchParams.get('chain')||'all'});
  if(!input.success)return Response.json({error:'Invalid asset search.'},{status:400});
  const {q,provider,chain}=input.data;
  if(provider==='Tatum')return Response.json({assets:tatumAssets(q),catalog:TATUM_CATALOG,note:'Documented provider markets. Historical candle coverage is verified per call.'});
  if(principal(request)!.role!=='operator'&&process.env.CALBOK_USER_PROVIDER_ACCESS!=='true')return Response.json({error:'Live provider search is not enabled for member accounts yet.'},{status:403});
  if(q.length<2)return Response.json({assets:[],note:'Enter at least 2 characters or paste a contract address.'});
  const key=JSON.stringify([q,chain]),cached=cache.get(key);
  if(cached&&cached.expires>Date.now())return Response.json({assets:cached.assets,cached:true});
  if(rateLimit())return Response.json({error:'Search budget reached. Retry in one minute.'},{status:429});
  try{
    const assets=await searchGmgn(q,chain==='all'?undefined:chain);
    for(const asset of assets)registerAsset(asset);
    if(cache.size>=100)cache.clear();cache.set(key,{expires:Date.now()+60_000,assets});
    return Response.json({assets,note:'Select by chain and contract address. Pricing history is not guaranteed by a search match.'});
  }catch(error){return Response.json({error:error instanceof ProviderError?error.code:'Token search unavailable.'},{status:503});}
}
export async function POST(request:Request){
  const denied=authorize(request);if(denied)return denied;
  if(principal(request)!.role!=='operator'&&process.env.CALBOK_USER_PROVIDER_ACCESS!=='true')return Response.json({error:'Provider checks are not enabled for member accounts yet.'},{status:403});
  if(rateLimit())return Response.json({error:'Verification budget reached. Retry in one minute.'},{status:429});
  try{
    const input=z.object({asset:z.string().refine(isAllowedAsset)}).parse(await body(request));
    if(parseGmgnAssetId(input.asset)&&!knownAsset(input.asset))return Response.json({error:'Search for and select a token first.'},{status:400});
    const boundary=Math.floor((Date.now()-3600_000)/60_000)*60_000;
    const candles=await assetCandles(input.asset,boundary),candle=boundaryCandle(candles,boundary,Date.now());
    if(!candle)return Response.json({error:'No eligible finalized candle found. This market cannot be verified for this sample.'},{status:422});
    const evidence={asset:input.asset,provider:parseGmgnAssetId(input.asset)?'GMGN':'Tatum',interval:'1m',requestedBoundary:boundary,candle,checkedAt:new Date().toISOString()};
    db().prepare('INSERT INTO asset_checks VALUES (?,?,?,?)').run(randomUUID(),input.asset,evidence.checkedAt,JSON.stringify(evidence));
    return Response.json({message:'Historical sample verified. Future settlement still requires eligible entry and exit candles.',evidence});
  }catch(error){return Response.json({error:error instanceof ProviderError?error.code:'Market verification unavailable.'},{status:503});}
}
