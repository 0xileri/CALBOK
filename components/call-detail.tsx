'use client';
import {SourceLink} from './source-link';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import type {PublicCall} from '@/lib/public-feed';
import {callPath,callerPath,callStatus,assetLabel,priceChange,directionLabel,priceSourceLabel} from '@/lib/call-presentation';
import {profileOutcome} from '@/lib/caller-profiles';
import {CautionNotice} from './caution-notice';
import {sameGroupRepeatSeed,lockAgainSeed} from '@/lib/lock-again';
import {useWorkspace} from './workspace-state';
import {PublicationControls} from './publication-controls';
import {SettlementEvidence} from './settlement-evidence';
import {RecallSummary} from './recall-summary';
import {ReceiptNotes} from './receipt-notes';
import {ReceiptShare} from './receipt-share';

export function CallDetail({id,publicCall:initialPublicCall}:{id:string;publicCall:PublicCall|null}){
 const [publicCall,setPublicCall]=useState(initialPublicCall);
 const {session,data,error,refresh}=useWorkspace(),[now,setNow]=useState(0),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{const update=()=>setNow(Date.now());const initial=setTimeout(update,0),timer=setInterval(update,30000);return()=>{clearTimeout(initial);clearInterval(timer);};},[]);
 useEffect(()=>{
  if(!initialPublicCall)return;
  let active=true;const controller=new AbortController();
  const update=async()=>{if(document.visibilityState!=='visible')return;try{const r=await fetch('/api/public-calls/'+encodeURIComponent(id),{cache:'no-store',signal:controller.signal});if(!active)return;if(r.status===404){setPublicCall(null);return;}if(r.ok){const d=await r.json();if(active)setPublicCall(d.call);}}catch{/* Keep the last checked result; never infer an outcome from a network failure. */}};
  const timer=setInterval(()=>void update(),30000);document.addEventListener('visibilitychange',update);
  return()=>{active=false;controller.abort();clearInterval(timer);document.removeEventListener('visibilitychange',update);};
 },[id,initialPublicCall]);
 const owned=data?.receipts.find(row=>row.id===id),review=data?.recallReviews?.[id],job=data?.memoryJobs.find(row=>row.prediction_id===id);
 if(!publicCall&&!owned){
  if(session.loading||(session.user&&!data&&!error))return <main><p role="status">Loading call…</p></main>;
  return <main className="narrow-page"><h1>{session.user?'Call unavailable.':'This call is not public.'}</h1><p>{session.user?error||'This call is not in your account.':'Sign in to view calls you logged privately.'}</p>{!session.user&&<Link className="primary-action" href={'/signin?next='+encodeURIComponent(callPath(id))}>Sign in</Link>}</main>;
 }
 const outcome=owned?profileOutcome(owned):publicCall!.outcome;
 let evidence:{provider?:string;returnPct?:string;entry?:{hash?:string};exit?:{hash?:string}}|null=null;
 if(owned&&['won','lost','neutral'].includes(outcome)){try{evidence=JSON.parse(owned.evidence!);}catch{}}
 const caller=owned?.caller||publicCall!.caller,asset=owned?.asset||publicCall!.asset,windowLabel=owned?.horizon||publicCall!.horizon,deadline=owned?.deadline||publicCall!.deadline;
 const change=owned?evidence?.returnPct??null:publicCall!.returnPct,repeat=owned?!!lockAgainSeed(owned):false;
 let repeated=false;try{repeated=!!JSON.parse(owned?.snapshot||'{}').repeatedFrom;}catch{}
 async function action(action:string){setBusy(true);setMessage('');try{const r=await fetch('/api/actions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,id})});const d=await r.json();if(!r.ok)throw Error(d.error);setMessage(d.message);await refresh();}catch(error){setMessage(error instanceof Error?error.message:'Could not complete this action.');}finally{setBusy(false);}}
 return <main className="call-detail-page"><Link className="quiet-link" href={owned?'/my-calls':'/feed'}>← {owned?'My calls':'Feed'}</Link>
  <header style={{marginTop:32}}><Link className="quiet-link" href={callerPath(caller)}>{caller}</Link><div className="call-heading"><h1>{assetLabel(asset,owned?.asset_symbol||publicCall?.assetSymbol)}</h1><span className={'direction-badge '+(owned?.direction||publicCall!.direction)}>{directionLabel(owned?.direction||publicCall!.direction)}</span></div>
   <p className="muted">{windowLabel} window · {owned?(owned.visibility==='public'?'Public':'Private'):('Logged by @'+publicCall!.loggedBy)}</p>
  </header>
  <SourceLink source={owned?.source_url??publicCall?.source_url??''}/>
  <div className={'call-outcome '+outcome}><strong>{now?callStatus(outcome,deadline,now):['won','lost','neutral'].includes(outcome)?callStatus(outcome,deadline,0):'Open'}</strong>{priceChange(change)&&<span>{priceChange(change)}</span>}</div>
  <dl className="call-terms"><div><dt>Caller</dt><dd>{caller}</dd></div><div><dt>Locked</dt><dd><time dateTime={owned?.locked_at||publicCall!.locked_at}>{new Date(owned?.locked_at||publicCall!.locked_at).toUTCString()}</time></dd></div><div><dt>Result due</dt><dd><time dateTime={deadline}>{new Date(deadline).toUTCString()}</time></dd></div></dl>
  {(publicCall?.ownerScheduled||repeated)&&<p className="form-help">{publicCall?.ownerScheduled?'Owner-scheduled repeat prediction':'A logger’s repeat prediction'}, not a new caller post.</p>}
  <CautionNotice review={review}/>
  {owned&&repeat&&<p style={{marginTop:28}}><Link className="primary-action" href={'/log?repeat='+encodeURIComponent(id)+(sameGroupRepeatSeed(owned,job)?'&same=1':'')}>Log a call like this</Link></p>}
  <details className="proof-details"><summary>Proof details</summary><div><p className="form-help">Self-logged before outcome. Caller identity is not verified. Returns show the market price change, not trading profit.</p><dl><dt>Call ID</dt><dd>{id}</dd><dt>Price source</dt><dd>{priceSourceLabel(owned?evidence?.provider:publicCall!.provider)||'Waiting for checked prices'}</dd><dt>Record fingerprint</dt><dd>{owned?.snapshot_hash||publicCall!.snapshotHash}</dd>{evidence?.entry?.hash&&<><dt>Entry price fingerprint</dt><dd>{evidence.entry.hash}</dd></>}{evidence?.exit?.hash&&<><dt>Exit price fingerprint</dt><dd>{evidence.exit.hash}</dd></>}{!owned&&publicCall?.entryHash&&<><dt>Entry price fingerprint</dt><dd>{publicCall.entryHash}</dd></>}{!owned&&publicCall?.exitHash&&<><dt>Exit price fingerprint</dt><dd>{publicCall.exitHash}</dd></>}<dt>Walrus memory ID</dt><dd>{owned?(job?.status==='done'&&job.blob_id?job.blob_id:'Not confirmed yet'):publicCall!.blobId||'Not confirmed yet'}</dd></dl>
   {owned&&<><SettlementEvidence receipt={owned} entryPrice={data?.entryPrices?.find(row=>row.prediction_id===id)}/><RecallSummary review={review||null} onOpen={value=>window.location.assign(callPath(value))}/><details><summary>Original call and source</summary><blockquote>{owned.text}</blockquote><SourceLink source={owned.source_url}/></details></>}
  </div></details>
  {owned&&<details className="proof-details"><summary>Manage this call</summary><div><PublicationControls key={id} receipt={owned} owner={false} onChanged={()=>void refresh()}/><div className="quiet-action-row"><button className="button secondary" disabled={busy} onClick={()=>void action('settle')}>Check result</button>{['won','lost','neutral'].includes(outcome)&&<button className="button secondary" disabled={busy} onClick={()=>void action('remember')}>Remember result</button>}<button className="button secondary" disabled={busy} onClick={()=>void action('recall')}>Check past calls</button></div>{message&&<p role="status">{message}</p>}<ReceiptNotes key={id} receiptId={id}/><ReceiptShare key={id} receipt={owned}/></div></details>}
 </main>;
}
