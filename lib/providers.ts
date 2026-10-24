import { z } from 'zod';
import { hash } from './db';
import type { Candle } from './domain';

export class ProviderError extends Error { constructor(public code:string) { super(code); } }
export function configuration() { return {tatum:!!process.env.TATUM_API_KEY,walrus:!!(process.env.MEMWAL_PRIVATE_KEY && process.env.MEMWAL_ACCOUNT_ID),mainnet:process.env.MEMWAL_NETWORK==='mainnet'}; }
async function tatum(url:string, body?:unknown) {
  if (!process.env.TATUM_API_KEY) throw new ProviderError('TATUM_NOT_CONFIGURED');
  const response = await fetch(url,{method:body?'POST':'GET',headers:{'x-api-key':process.env.TATUM_API_KEY,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15_000),cache:'no-store'});
  if (!response.ok) throw new ProviderError(`TATUM_HTTP_${response.status}`);
  return response.json() as Promise<unknown>;
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
  }catch(error){if(error instanceof ProviderError)throw error;throw new ProviderError('TATUM_SUI_GRPC_UNAVAILABLE');}
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
export async function priceCandle(asset:string, boundary:number):Promise<Candle> {
  // Align up: an overlapping pre-lock candle is not admissible.
  const requested = Math.ceil(boundary/60_000)*60_000;
  const url = new URL('https://api.tatum.io/v4/data/rate/symbol/OHLCV');
  url.search = new URLSearchParams({symbol:asset,unix:String(requested),interval:'1m'}).toString();
  const raw = await tatum(url.toString());
  // Tatum's live 1m response uses an inclusive final millisecond (duration 59,999).
  // Normalize only this exact convention and retain the raw boundary for audits.
  return normalizeTatumCandle(raw);
}
export async function memoryClient(namespace:string) {
  if (!configuration().walrus || !configuration().mainnet) throw new ProviderError('WALRUS_MAINNET_NOT_CONFIGURED');
  const { MemWal } = await import('@mysten-incubation/memwal');
  return MemWal.create({key:process.env.MEMWAL_PRIVATE_KEY!,accountId:process.env.MEMWAL_ACCOUNT_ID!,namespace, ...(process.env.MEMWAL_SERVER_URL?{serverUrl:process.env.MEMWAL_SERVER_URL}:{}),requestTimeoutMs:15_000});
}
export const namespaceFor = (caller:string) => `calbok-v1-${hash(caller).slice(0,24)}`;
