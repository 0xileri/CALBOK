'use client';
import Link from 'next/link';
import {profileOutcome} from '@/lib/caller-profiles';
import {callPath,callStatus,assetLabel,priceChange} from '@/lib/call-presentation';
import {hasCaution} from '@/lib/caution-display';
import {useWorkspace} from './workspace-state';
import {AccessPrompt} from './access-prompt';
import {useEffect,useState} from 'react';
export function MyCalls(){
 const {session,data,error}=useWorkspace(),[filter,setFilter]=useState('all'),[now,setNow]=useState(0);
 useEffect(()=>{const update=()=>setNow(Date.now());const initial=setTimeout(update,0),timer=setInterval(update,30000);return()=>{clearTimeout(initial);clearInterval(timer);};},[]);
 if(session.loading)return <main><p role="status">Checking sign-in…</p></main>;
 if(!session.user)return <AccessPrompt/>;
 const rows=data?.receipts.filter(row=>filter==='all'||profileOutcome(row)===filter)||[];
 return <main><header className="my-calls-top"><div><span className="overline">YOUR TRACK RECORD</span><h1>My calls</h1></div><Link className="primary-action" href="/log">Log a call ↗</Link></header>
  {!data?<p role={error?'alert':'status'}>{error||'Loading your calls…'}</p>:!data.receipts.length?<section className="clean-empty"><h2>Your first call starts the record.</h2><p>Pick an asset, choose a direction and lock it before the result.</p></section>:<>
   <label style={{maxWidth:220,marginBottom:20}}>Show<select value={filter} onChange={e=>setFilter(e.target.value)}>{[['all','All calls'],['pending','Open'],['won','Won'],['lost','Lost'],['neutral','Neutral'],['unverified','Needs review']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
   {rows.map(row=>{const outcome=profileOutcome(row),review=data.recallReviews?.[row.id];let change:string|null=null;try{if(['won','lost','neutral'].includes(outcome))change=JSON.parse(row.evidence!).returnPct;}catch{}
    return <article className="private-call-row" key={row.id}><Link href={callPath(row.id)}><h2>{assetLabel(row.asset,row.asset_symbol)} · {row.direction==='bullish'?'Bullish':'Bearish'}</h2><small>{row.caller} · {row.horizon} · {row.visibility==='public'?'Public':'Private'}{row.public_hidden?' · hidden':''}</small></Link><div className={'call-result '+outcome}><strong>{now?callStatus(outcome,row.deadline,now):'Open'}</strong>{priceChange(change)&&<span>{priceChange(change)}</span>}</div>
     {hasCaution(review)&&<aside className="clean-caution" role="alert"><strong>Caution</strong> · Only {review!.contextual.rate}% of {review!.contextual.total} matching calls won. <Link href={callPath(row.id)}>See why</Link></aside>}
    </article>;})}{!rows.length&&<p className="muted">No calls match this filter.</p>}
  </>}
 </main>;
}
