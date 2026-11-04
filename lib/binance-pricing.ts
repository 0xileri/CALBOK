import {z} from 'zod';
import {sha256} from '@noble/hashes/sha2.js';
import {bytesToHex} from '@noble/hashes/utils.js';
import {boundaryCandle,type Candle} from './domain';
import {ProviderError} from './provider-error';

const bases=new Set(['BTC','ETH','SOL','STX','ADA','APT','ATOM','AVAX','DOGE','DOT','ENA','FIL','LINK','SUI','TON','TRX','UNI','WIF','WLD','XLM','XRP','ZEC','FLOKI','ORDI','JUP','FET']);
const price=z.string().regex(/^\d+(\.\d+)?$/);
const rowSchema=z.tuple([z.number().int(),price,price,price,price,price,z.number().int(),price,z.number().int(),price,price,z.string()]);
export function normalizeBinanceCandle(asset:string,raw:unknown):Candle {
  if (!bases.has(asset)) throw new ProviderError(/^1000/.test(asset)?'BINANCE_SCALED_PAIR_UNSUPPORTED':'BINANCE_MARKET_UNSUPPORTED');
  const row=rowSchema.parse(raw);
  if(row[6]!==row[0]+59_999) throw new ProviderError('BINANCE_INTERVAL_UNVERIFIED');
  return {openTime:row[0],closeTime:row[0]+60_000,sourceCloseTime:row[6],open:row[1],high:row[2],low:row[3],close:row[4],
    provider:'Binance',product:asset+'USDT',raw,hash:bytesToHex(sha256(new TextEncoder().encode(JSON.stringify(raw))))};
}
export function verifiedBinanceCandle(asset:string,candle:Candle):boolean {
  try {
    const expected=normalizeBinanceCandle(asset,candle.raw);
    return ['openTime','closeTime','sourceCloseTime','open','high','low','close','provider','product','hash'].every(key=>expected[key as keyof Candle]===candle[key as keyof Candle]);
  } catch {return false;}
}
export async function binanceCandles(asset:string,boundary:number,clock=Date.now):Promise<Candle[]> {
  if(!bases.has(asset)) throw new ProviderError(/^1000/.test(asset)?'BINANCE_SCALED_PAIR_UNSUPPORTED':'BINANCE_MARKET_UNSUPPORTED');
  const minute=Math.ceil(boundary/60_000)*60_000;
  const url=new URL('https://api.binance.com/api/v3/klines');
  // Only exact spot base identities; never silently substitute 1000x pairs.
  url.search=new URLSearchParams({symbol:asset+'USDT',interval:'1m',startTime:String(minute),limit:'1'}).toString();
  const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!response.ok) throw new ProviderError('BINANCE_PRICE_UNAVAILABLE');
  const raw:unknown=await response.json();
  if(!Array.isArray(raw)) throw new ProviderError('BINANCE_PRICE_UNVERIFIED');
  const candles=raw.map(row=>normalizeBinanceCandle(asset,row));
  const candle=boundaryCandle(candles,boundary,clock());
  if(!candle || candle.openTime!==minute) throw new ProviderError('BINANCE_BOUNDARY_UNAVAILABLE');
  return [candle];
}
