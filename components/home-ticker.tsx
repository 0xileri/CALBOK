'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import type {PublicCall} from '@/lib/public-feed';
import {CallCard} from './call-card';

export function HomeTicker(){
  const [calls,setCalls]=useState<PublicCall[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(false),[paused,setPaused]=useState(false),[now,setNow]=useState(0);
  useEffect(()=>{const controller=new AbortController();let active=true;
    async function refresh(){try{const r=await fetch('/api/public-feed?limit=24',{signal:controller.signal});if(!r.ok)throw Error();const data=await r.json();if(!Array.isArray(data.calls))throw Error();if(active){setCalls(data.calls);setNow(Date.now());setError(false);}}catch{if(active){setError(true);setCalls([]);}}finally{if(active)setLoading(false);}}
    void refresh();const clock=setInterval(()=>setNow(Date.now()),30000),poll=setInterval(()=>void refresh(),45000);return()=>{active=false;controller.abort();clearInterval(clock);clearInterval(poll);};
  },[]);
  return <TickerDisplay calls={calls} loading={loading} error={error} paused={paused} now={now} onPause={setPaused}/>;
}
export function TickerDisplay({calls,loading,error,paused,now,onPause}:{calls:PublicCall[];loading:boolean;error:boolean;paused:boolean;now:number;onPause:(paused:boolean)=>void}){
  return <section className="home-live" aria-labelledby="live-calls-heading"><div className="section-top"><div><span className="overline">ON THE RECORD</span><h2 id="live-calls-heading">Calls, in real time.</h2></div>{calls.length>0&&<button className="quiet-button" onClick={()=>onPause(!paused)} aria-pressed={paused}>{paused?'Play':'Pause'} scrolling</button>}</div>
    {loading?<div className="ticker-empty" role="status">Loading live calls…</div>:error&&!calls.length?<div className="ticker-empty" role="status">Live calls could not be loaded. <Link href="/feed">Open the feed</Link></div>:!calls.length?<div className="ticker-empty"><h3>No public calls yet. Be the first.</h3><Link className="button secondary" href="/log">Log a call →</Link></div>:<div className={'ticker-viewport '+(paused?'is-paused':'')} onTouchStart={()=>onPause(true)} aria-label="Live public calls; swipe to explore">
      <div className="ticker-track">{[false,true].map(copy=><div className={'ticker-group '+(copy?'ticker-copy':'')} key={String(copy)} aria-hidden={copy||undefined}>{calls.map(call=><CallCard key={call.id} call={call} now={now} duplicate={copy}/>)}</div>)}</div>
    </div>}
  </section>;
}
