import Link from 'next/link';
import type {PublicCall} from '@/lib/public-feed';
import {callerPath,callPath,callStatus,priceChange,directionLabel,assetLabel} from '@/lib/call-presentation';
import {SourceLink} from './source-link';
import type {TickerEvent} from '@/lib/ticker-updates';
export function CallCard({call,now,duplicate=false,compact=false,event}:{call:PublicCall;now:number;duplicate?:boolean;compact?:boolean;event?:TickerEvent}){
 const name=assetLabel(call.asset,call.assetSymbol),status=callStatus(call.outcome,call.deadline,now),change=priceChange(call.returnPct);
 const label=call.caller+', '+name+', '+directionLabel(call.direction)+', '+call.horizon+'. '+status+(change?', price change '+change:'');
 return <article className={'clean-call-card '+(compact?'hero-call-tab ':'')+(event?'event-'+event:'')}>
  {!compact&&<div className="call-card-byline"><Link tabIndex={duplicate?-1:undefined} href={callerPath(call.caller)}>{call.caller}</Link><span>{call.horizon}</span></div>}
  <Link tabIndex={duplicate?-1:undefined} href={callPath(call.id)} className="call-card-main" aria-label={label}>
   {compact&&<div className="call-card-byline"><strong>{call.caller}</strong><span>{call.horizon}</span></div>}
   <div className="call-card-market"><h2>{name}</h2><span className={'direction-badge '+call.direction}>{directionLabel(call.direction)}</span></div>
   <div className={'call-result '+call.outcome}><strong>{status}</strong>{change&&<span>{change}</span>}</div>
   {!compact&&<span className="call-card-logger">Logged by @{call.loggedBy}</span>}
   {call.ownerScheduled&&<small className="call-card-repeat">Owner-scheduled repeat prediction, not a new caller post.</small>}
  </Link>
  <div className="card-source"><SourceLink source={call.source_url} icon duplicate={duplicate}/></div>
 </article>;
}
