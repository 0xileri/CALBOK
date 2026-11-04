import Link from 'next/link';
import type {PublicCall} from '@/lib/public-feed';
import {callerPath,callPath,callStatus,priceChange,directionLabel,assetLabel} from '@/lib/call-presentation';

export function CallCard({call,now,duplicate=false}:{call:PublicCall;now:number;duplicate?:boolean}){
  return <article className="clean-call-card">
    <div className="call-card-byline"><Link tabIndex={duplicate?-1:undefined} href={callerPath(call.caller)}>{call.caller}</Link><span>{call.horizon}</span></div>
    <Link tabIndex={duplicate?-1:undefined} href={callPath(call.id)} className="call-card-main" aria-label={`${call.caller}, ${assetLabel(call.asset,call.assetSymbol)}, ${directionLabel(call.direction)}, ${call.horizon}. ${callStatus(call.outcome,call.deadline,now)}${priceChange(call.returnPct)?', price change '+priceChange(call.returnPct):''}`}>
      <div className="call-card-market"><h2>{assetLabel(call.asset,call.assetSymbol)}</h2><span className={'direction-badge '+call.direction}>{directionLabel(call.direction)}</span></div>
      <div className={'call-result '+call.outcome}><strong>{callStatus(call.outcome,call.deadline,now)}</strong>{priceChange(call.returnPct)&&<span>{priceChange(call.returnPct)}</span>}</div>
      <span className="call-card-logger">Logged by @{call.loggedBy}</span>{call.ownerScheduled&&<small className="call-card-repeat">Owner-scheduled repeat prediction, not a new caller post.</small>}
    </Link>
  </article>;
}
