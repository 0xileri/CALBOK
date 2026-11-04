export const callPath=(id:string)=>'/call/'+encodeURIComponent(id);
export const callerPath=(value:string)=>'/caller/'+encodeURIComponent(value.trim().replace(/^@/,'').toLowerCase());
export const directionLabel=(direction:string)=>direction==='bullish'?'Bullish':'Bearish';
export function callStatus(outcome:string,deadline:string,now=Date.now()){
  if(outcome==='won')return 'Won';if(outcome==='lost')return 'Lost';if(outcome==='neutral')return 'Neutral';
  if(outcome==='unverified')return 'Needs review';
  const minutes=Math.ceil((Date.parse(deadline)-now)/60000);
  if(!Number.isFinite(minutes)||minutes<=0)return 'Checking result';
  if(minutes>=1440)return `Settles in ${Math.ceil(minutes/1440)}d`;
  if(minutes>=60)return `Settles in ${Math.floor(minutes/60)}h ${minutes%60}m`;
  return `Settles in ${minutes}m`;
}
export function priceChange(value:string|null){const number=Number(value);return value!==null&&Number.isFinite(number)?`${number>0?'+':''}${number.toFixed(2)}%`:null;}
export function assetLabel(asset:string,symbol?:string|null){return symbol||(!asset.startsWith('gmgn:')?asset:asset.split(':')[1]+' · '+asset.split(':').slice(2).join(':').slice(0,8)+'…');}
