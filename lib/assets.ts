import catalog from './catalog/tatum-symbols.json';
export type Asset = {id:string;symbol:string;name:string;provider:'Tatum'|'GMGN';chain?:string;address?:string;discoveredAt?:string};
export const TATUM_SYMBOLS=catalog.symbols;
export const TATUM_CATALOG={source:catalog.source,checkedAt:catalog.checkedAt,count:catalog.symbols.length};
const symbols=new Set(TATUM_SYMBOLS);
export const GMGN_CHAINS=['sol','bsc','base','eth','arbitrum','hyperevm','robinhood','arc','stable'] as const;
export function gmgnAssetId(chain:string,address:string) {
  if(!(GMGN_CHAINS as readonly string[]).includes(chain))return null;
  if(!(chain==='sol'?/^[1-9A-HJ-NP-Za-km-z]{32,44}$/:/^0x[0-9a-fA-F]{40}$/).test(address))return null;
  return `gmgn:${chain}:${chain==='sol'?address:address.toLowerCase()}`;
}
export function parseGmgnAssetId(id:string) {
  const [prefix,chain,address,...extra]=id.split(':');
  if(prefix!=='gmgn'||!chain||!address||extra.length||gmgnAssetId(chain,address)!==id)return null;
  return {chain,address};
}
export function isAllowedAsset(id:string){return symbols.has(id)||!!parseGmgnAssetId(id);}
export function tatumAssets(query=''):Asset[]{
  const q=query.trim().toUpperCase();
  return TATUM_SYMBOLS.filter(symbol=>symbol.includes(q)).sort((a,b)=>(a===q?-1:b===q?1:0)||a.localeCompare(b)).map(symbol=>({id:symbol,symbol,name:`${symbol} · provider market`,provider:'Tatum'}));
}
