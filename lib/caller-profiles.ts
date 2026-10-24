import type {Receipt} from './db';
import {METHOD,settle,stats as scoredStats,type Candle} from './domain';

export type ProfileOutcome='won'|'lost'|'neutral'|'pending'|'unverified';
/** Count only a matching stored verdict that can be reproduced from its candle evidence. */
export function profileOutcome(receipt:Receipt):ProfileOutcome {
  if(!receipt.outcome || receipt.outcome==='pending')return 'pending';
  if(!['won','lost','neutral'].includes(receipt.outcome) || receipt.method!==METHOD || !receipt.evidence)return 'unverified';
  try {
    const evidence=JSON.parse(receipt.evidence) as {asset:string;provider:string;outcome:string;returnPct:string;entry:Candle;exit:Candle};
    if(evidence.asset!==receipt.asset || evidence.provider!==(receipt.asset_provider||'Tatum') || evidence.outcome!==receipt.outcome)return 'unverified';
    if(!/^[a-f0-9]{64}$/.test(evidence.entry.hash) || !/^[a-f0-9]{64}$/.test(evidence.exit.hash))return 'unverified';
    if(!['bullish','bearish'].includes(receipt.direction))return 'unverified';
    const checked=settle(receipt.direction as 'bullish'|'bearish',Date.parse(receipt.locked_at),Date.parse(receipt.deadline),[evidence.entry,evidence.exit],evidence.exit.closeTime);
    return checked.outcome===receipt.outcome && checked.returnPct===evidence.returnPct ? receipt.outcome as ProfileOutcome : 'unverified';
  } catch {return 'unverified';}
}

export function profileStats(receipts:Receipt[]) {
  const counts={won:0,lost:0,neutral:0,pending:0,unverified:0};
  const outcomes=receipts.map(profileOutcome);
  for(const outcome of outcomes)counts[outcome]++;
  const scored=counts.won+counts.lost;
  return {...counts,total:receipts.length,scored,rate:scoredStats(outcomes).rate};
}
export type ProfileScope={asset:string;horizon:string;direction:string};
export function scopeReceipts(receipts:Receipt[],caller:string,scope:ProfileScope) {
  return receipts.filter(row=>row.caller===caller && (scope.asset==='all'||row.asset===scope.asset) && (scope.horizon==='all'||row.horizon===scope.horizon) && (scope.direction==='all'||row.direction===scope.direction));
}
export function profileGroups(receipts:Receipt[],field:'asset'|'horizon') {
  return Array.from(new Set(receipts.map(row=>row[field]))).sort().map(key=>{
    const rows=receipts.filter(row=>row[field]===key),sample=rows[0];
    return {key,label:field==='asset'?(sample.asset_symbol||sample.asset):key,provider:sample.asset_provider||'Tatum',...profileStats(rows)};
  });
}
