import {z} from 'zod';
import {sha256} from '@noble/hashes/sha2.js';
import {bytesToHex} from '@noble/hashes/utils.js';
const hash=(value:string)=>bytesToHex(sha256(new TextEncoder().encode(value)));
import {boundaryCandle,type Candle} from './domain';
import {ProviderError} from './provider-error';

// Exact base identities only. USD markets are never substituted with stablecoin pairs.
const bases = new Set(['BTC','ETH','SOL','STX','ADA','APT','ATOM','AVAX','DOGE','DOT','ENA','FIL','LINK','SUI','TON','TRX','UNI','WIF','WLD','XLM','XRP','ZEC','FLOKI','ORDI','JUP','FET']);
const rowSchema=z.tuple([z.number().int().nonnegative(),z.number().positive(),z.number().positive(),z.number().positive(),z.number().positive(),z.number().nonnegative()]);

export function normalizeCoinbaseCandle(asset:string,raw:unknown):Candle {
  if (!bases.has(asset)) throw new ProviderError('COINBASE_MARKET_UNSUPPORTED');
  const row=rowSchema.parse(raw);
  return {openTime:row[0]*1000,closeTime:row[0]*1000+60_000,low:String(row[1]),high:String(row[2]),open:String(row[3]),close:String(row[4]),
    hash:hash(JSON.stringify(raw)),provider:'Coinbase',product:asset+'-USD',raw};
}

export function verifiedCoinbaseCandle(asset:string,candle:Candle):boolean {
  try {
    const expected=normalizeCoinbaseCandle(asset,candle.raw);
    return ['openTime','closeTime','low','high','open','close','hash','provider','product'].every(key=>
      expected[key as keyof Candle]===candle[key as keyof Candle]);
  } catch {return false;}
}

export async function coinbaseCandles(asset:string,boundary:number,clock=Date.now):Promise<Candle[]> {
  if (!bases.has(asset)) throw new ProviderError('COINBASE_MARKET_UNSUPPORTED');
  const requested=Math.ceil(boundary/60_000)*60_000;
  const url=new URL('https://api.exchange.coinbase.com/products/'+asset+'-USD/candles');
  url.search=new URLSearchParams({granularity:'60',start:new Date(requested).toISOString(),end:new Date(requested+60_000).toISOString()}).toString();
  const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});
  if (!response.ok) throw new ProviderError(response.status===404?'COINBASE_MARKET_UNSUPPORTED':'COINBASE_PRICE_UNAVAILABLE');
  const raw:unknown=await response.json();
  if (!Array.isArray(raw)) throw new ProviderError('COINBASE_PRICE_UNVERIFIED');
  const candles=raw.map(row=>normalizeCoinbaseCandle(asset,row));
  const candle=boundaryCandle(candles,boundary,clock());
  if (!candle) throw new ProviderError('COINBASE_BOUNDARY_UNAVAILABLE');
  return [candle];
}
