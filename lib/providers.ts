import {binanceCandles} from './binance-pricing';
import {coinbaseCandles} from './coinbase-pricing';
import { z } from 'zod';
import { hash } from './db';
import type { Candle } from './domain';
import {parseGmgnAssetId} from './assets';
import {gmgnCandles} from './gmgn';
import {ProviderError} from './provider-error';
export {ProviderError} from './provider-error';

export function configuration() { return {tatum:!!process.env.TATUM_API_KEY,gmgn:!!process.env.GMGN_API_KEY,walrus:!!(process.env.MEMWAL_PRIVATE_KEY && process.env.MEMWAL_ACCOUNT_ID),mainnet:process.env.MEMWAL_NETWORK==='mainnet'}; }
async function tatum(url:string, body?:unknown) {
  if (!process.env.TATUM_API_KEY) throw new ProviderError('TATUM_NOT_CONFIGURED');
  let response:Response;
  try {
    response = await fetch(url,{method:body?'POST':'GET',headers:{'x-api-key':process.env.TATUM_API_KEY,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15_000),cache:'no-store'});
  } catch {throw new ProviderError('TATUM_UNAVAILABLE');}
  if (!response.ok) throw new ProviderError(`TATUM_HTTP_${response.status}`);
  try {return await response.json() as unknown;}
  catch {throw new ProviderError('TATUM_RESPONSE_UNVERIFIED');}
}
export async function suiMetadata() {
  if(!process.env.TATUM_API_KEY)throw new ProviderError('TATUM_NOT_CONFIGURED');
  const [{SuiGrpcClient},{GrpcTransport},{ChannelCredentials}]=await Promise.all([import('@mysten/sui/grpc'),import('@protobuf-ts/grpc-transport'),import('@grpc/grpc-js')]);
  const transport=new GrpcTransport({host:'sui-mainnet-grpc.gateway.tatum.io:443',channelCredentials:ChannelCredentials.createSsl()});
  try {
    const client=new SuiGrpcClient({network:'mainnet',transport});
    const {response:raw}=await client.stateService.getCoinInfo({coinType:'0x2::sui::SUI'},{meta:{'x-api-key':process.env.TATUM_API_KEY},timeout:15_000});
    const parsed=z.object({coinType:z.string().regex(/^0x0*2::sui::SUI$/),metadata:z.object({id:z.string().regex(/^0x[0-9a-fA-F]{64}$/),symbol:z.literal('SUI'),decimals:z.literal(9),name:z.string().min(1)})}).safeParse(raw);
    if(!parsed.success)throw new ProviderError('SUI_RESPONSE_UNVERIFIED');
    return {network:'mainnet',provider:'Tatum',transport:'gRPC',method:'sui.rpc.v2.StateService/GetCoinInfo',coinType:parsed.data.coinType,...parsed.data.metadata,responseHash:hash(JSON.stringify(raw,(_,value)=>typeof value==='bigint'?value.toString():value)),verifiedAt:new Date().toISOString()};
  }catch(error){if(error instanceof ProviderError)throw error;
    const code=typeof error==='object' && error!==null && 'code' in error ? String(error.code) : 'UNKNOWN';
    const message=error instanceof Error ? error.message.replaceAll(process.env.TATUM_API_KEY,'[redacted]').slice(0,500) : 'Unknown gRPC failure';
    console.error('Tatum Sui gRPC failed',{code,message});
    throw new ProviderError('TATUM_SUI_GRPC_UNAVAILABLE');}
  finally{transport.close();}
}
const price = z.union([z.string().regex(/^\d+(\.\d+)?$/),z.number().positive()]).transform(String);
const candleSchema = z.object({openTime:z.number().int().nonnegative(),closeTime:z.number().int().positive(),open:price,high:price,low:price,close:price});
export function normalizeTatumCandle(raw:unknown):Candle {
  const parsed=candleSchema.safeParse(raw);
  if(!parsed.success)throw new ProviderError('PRICE_SCHEMA_UNVERIFIED');
  const candle=parsed.data,duration=candle.closeTime-candle.openTime;
  if(duration!==59_999 && duration!==60_000)throw new ProviderError('PRICE_INTERVAL_UNVERIFIED');
  return {...candle,sourceCloseTime:candle.closeTime,closeTime:candle.openTime+60_000,hash:hash(JSON.stringify(raw))};
}
export function validateTatumBoundary(candle:Candle,boundary:number):Candle {
  if (candle.openTime<boundary || candle.openTime-boundary>60_000) {
    throw new ProviderError('TATUM_PRICE_BOUNDARY_UNAVAILABLE');
  }
  return candle;
}

/**
 * Tatum is the primary price source. It gets this long after the boundary minute opens
 * to publish a valid candle before the Coinbase USD, then Binance USDT, backups are tried.
 */
export const TATUM_GRACE_MS = 5*60_000;
// Tatum answered, but definitively not with the boundary minute: back up immediately.
const TATUM_DEFINITE_MISS = ['TATUM_STALE_CANDLE','TATUM_PRICE_BOUNDARY_UNAVAILABLE','TATUM_HTTP_404'];

type PriceCandleOptions = {clock?:()=>number;request?:(url:string)=>Promise<unknown>};
export async function priceCandle(asset:string, boundary:number, {clock=Date.now,request=tatum}:PriceCandleOptions={}):Promise<Candle> {
  // Query inside the first eligible minute, avoiding inclusive/exclusive endpoint ambiguity.
  // An overlapping pre-lock candle remains inadmissible.
  const requested = Math.ceil(boundary/60_000)*60_000;
  const url = new URL('https://api.tatum.io/v4/data/rate/symbol/OHLCV');
  url.search = new URLSearchParams({symbol:asset,unix:String(requested+1),interval:'1m'}).toString();
  const raw = await request(url.toString());
  // Tatum's live 1m response uses an inclusive final millisecond (duration 59,999).
  // Normalize only this exact convention and retain the raw boundary for audits.
  if(raw===null) throw new ProviderError(clock()<requested+TATUM_GRACE_MS?'TATUM_CANDLE_NOT_YET_AVAILABLE':'TATUM_PRICE_BOUNDARY_UNAVAILABLE');
  const candle=normalizeTatumCandle(raw);
  try {
    if (Math.abs(candle.openTime-requested)>120_000) throw new ProviderError('TATUM_STALE_CANDLE');
    validateTatumBoundary(candle,boundary);
    if (candle.closeTime>clock()) throw new ProviderError('TATUM_CANDLE_NOT_YET_AVAILABLE');
    return candle;
  } catch (error) {
    if (!(error instanceof ProviderError)) throw error;
    // Log only public timing fields. Provider payloads and request headers stay private.
    console.warn('Tatum candle boundary rejected',{
      asset,unix:requested+1,boundary,openTime:candle.openTime,closeTime:candle.sourceCloseTime
    });
    if (error.code==='TATUM_CANDLE_NOT_YET_AVAILABLE' ||
        (candle.openTime<requested && clock()<requested+TATUM_GRACE_MS)) {
      throw new ProviderError('TATUM_CANDLE_NOT_YET_AVAILABLE');
    }
    throw error;
  }
}
export async function assetCandles(asset:string,boundary:number):Promise<Candle[]> {
  const token=parseGmgnAssetId(asset);
  if (token) return gmgnCandles(token.chain,token.address,boundary);
  try {return [await priceCandle(asset,boundary)];}
  catch (error) {
    // Missing credentials stay an explicit error. A definite miss backs up at once; lag,
    // outages and malformed responses keep retrying Tatum until its grace window ends.
    const graceOver=Date.now()>=Math.ceil(boundary/60_000)*60_000+TATUM_GRACE_MS;
    if (!(error instanceof ProviderError) || error.code==='TATUM_NOT_CONFIGURED' ||
        !(TATUM_DEFINITE_MISS.includes(error.code) || graceOver)) throw error;
    try {return await coinbaseCandles(asset,boundary);}
    catch (fallbackError) {
      if (!(fallbackError instanceof ProviderError) || !['COINBASE_MARKET_UNSUPPORTED','COINBASE_BOUNDARY_UNAVAILABLE'].includes(fallbackError.code)) throw fallbackError;
      try {return await binanceCandles(asset,boundary);} catch {throw error;}
    }
  }
}
export async function memoryClient(namespace:string) {
  if (!configuration().walrus || !configuration().mainnet) throw new ProviderError('WALRUS_MAINNET_NOT_CONFIGURED');
  const { MemWal } = await import('@mysten-incubation/memwal');
  return MemWal.create({key:process.env.MEMWAL_PRIVATE_KEY!,accountId:process.env.MEMWAL_ACCOUNT_ID!,namespace, ...(process.env.MEMWAL_SERVER_URL?{serverUrl:process.env.MEMWAL_SERVER_URL}:{}),requestTimeoutMs:15_000});
}
export const namespaceFor = (caller:string) => `calbok-v1-${hash(caller).slice(0,24)}`;
