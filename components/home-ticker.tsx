'use client';
import Link from 'next/link';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import type {PublicCall,PublicHomeData} from '@/lib/public-feed';
import {tickerEvents,tickerRows,animatedCount,type TickerEvent} from '@/lib/ticker-updates';
import {CallCard} from './call-card';

type Stats=PublicHomeData['stats'];
export function HomeTicker({initialData,children}:{initialData:PublicHomeData;children:ReactNode}){
 const [data,setData]=useState(initialData),[error,setError]=useState(false),[paused,setPaused]=useState(false),[now,setNow]=useState(initialData.asOf),[events,setEvents]=useState<Record<string,TickerEvent>>({});
 const previous=useRef(initialData.calls);
 useEffect(()=>{const controller=new AbortController();let active=true,flash:ReturnType<typeof setTimeout>|undefined;
  async function refresh(){if(document.visibilityState!=='visible')return;try{const r=await fetch('/api/public-feed?limit=24',{signal:controller.signal});if(!r.ok)throw Error();const next:PublicHomeData=await r.json();if(!Array.isArray(next.calls)||!next.stats||![next.stats.logged,next.stats.settled,next.stats.memories].every(value=>Number.isInteger(value)&&value>=0))throw Error();if(!active)return;
   setEvents(tickerEvents(previous.current,next.calls));previous.current=next.calls;setData(next);setNow(Date.now());setError(false);clearTimeout(flash);flash=setTimeout(()=>{if(active)setEvents({});},2400);
  }catch{if(active)setError(true);}}
  const clock=setInterval(()=>setNow(Date.now()),15000),poll=setInterval(()=>void refresh(),45000);document.addEventListener('visibilitychange',refresh);
  return()=>{active=false;controller.abort();clearInterval(clock);clearInterval(poll);clearTimeout(flash);document.removeEventListener('visibilitychange',refresh);};
 },[]);
 return <TickerDisplay calls={data.calls} stats={data.stats} loading={false} error={error} paused={paused} now={now} onPause={setPaused} events={events}>{children}</TickerDisplay>;
}
function Count({value}:{value:number}){
 const [shown,setShown]=useState(value),last=useRef(value);
 useEffect(()=>{const from=last.current,reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;let frame=0,start:number|undefined;
  const update=(time:number)=>{start??=time;const progress=reduce?1:Math.min(1,(time-start)/700),next=animatedCount(from,value,progress);last.current=next;setShown(next);if(progress<1)frame=requestAnimationFrame(update);};frame=requestAnimationFrame(update);return()=>cancelAnimationFrame(frame);
 },[value]);
 return <strong aria-label={value.toLocaleString('en-US')}><span aria-hidden="true">{shown.toLocaleString('en-US')}</span></strong>;
}
export function TickerDisplay({calls,stats,loading,error,paused,now,onPause,events={},children}:{calls:PublicCall[];stats?:Stats;loading:boolean;error:boolean;paused:boolean;now:number;onPause:(paused:boolean)=>void;events?:Record<string,TickerEvent>;children?:ReactNode}){
 const [touched,setTouched]=useState<number[]>([]),rows=tickerRows(calls);
 const counts=stats||{logged:calls.length,settled:calls.filter(call=>['won','lost','neutral'].includes(call.outcome)).length,memories:new Set(calls.flatMap(call=>call.blobId?[call.blobId]:[])).size};
 return <section className="calls-first-hero" aria-label="Live public calls">
  <div className="hero-moving-panel"><div className="hero-live-heading"><span className="overline"><i/> LIVE CALLS</span>{calls.length>0&&<button className="quiet-button motion-control" aria-pressed={paused||touched.length>0} onClick={()=>{onPause(!(paused||touched.length>0));setTouched([]);}}>{paused||touched.length>0?'Play':'Pause'} scrolling</button>}</div>
   {loading?<div className="ticker-empty" role="status">Loading live calls…</div>:error&&!calls.length?<div className="ticker-empty" role="status">Live calls could not be loaded. <Link href="/feed">Open the feed</Link></div>:!calls.length?<div className="ticker-empty"><h2>No public calls yet. Be the first.</h2><Link className="button secondary" href="/log">Log a call →</Link></div>:<div className="hero-call-rows">{rows.map((row,index)=><div className={'marquee-row row-'+index+(paused?' is-paused':'')+(touched.includes(index)?' is-touched':'')} key={index} onTouchStart={()=>setTouched(current=>current.includes(index)?current:[...current,index])} aria-label={'Public call row '+(index+1)+'; swipe to explore'}>
    <div className="marquee-track">{[false,true].map(copy=><div className={'ticker-group '+(copy?'ticker-copy':'')} key={String(copy)} aria-hidden={copy||undefined}>{row.map(call=><CallCard key={call.id} call={call} now={now} compact duplicate={copy} event={events[call.id]}/>)}</div>)}</div>
   </div>)}</div>}
   {error&&calls.length>0&&<p className="ticker-update-error" role="status">Live updates unavailable. Showing the last checked calls.</p>}
  </div>
  {children||<div className="hero-copy"><h1>Real calls. Live results.</h1><Link className="primary-action" href="/log">Log a call</Link></div>}
  <div className="hero-live-stats" aria-label="Live public call statistics">{[{key:'logged',label:'Calls logged'},{key:'settled',label:'Settled'},{key:'memories',label:'Walrus memories'}].map(({key,label})=><div key={key}><Count value={counts[key as keyof Stats]}/><span>{label}</span></div>)}<small>Public, visible calls only</small></div>
 </section>;
}
