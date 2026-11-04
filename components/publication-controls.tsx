'use client';
import {useEffect,useState} from 'react';
import type {Receipt} from '@/lib/db';

export function PublicationControls({receipt,owner,onChanged}:{receipt:Receipt;owner:boolean;onChanged:()=>void}){
  const [confirm,setConfirm]=useState<'publish'|'hide'|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function submit(){setBusy(true);try{const response=await fetch('/api/publication',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:receipt.id,action:confirm,confirmed:true})});const result=await response.json();if(!response.ok)throw Error(result.error);setMessage(confirm==='publish'?'This call is public. It cannot be made private again.':'This call is hidden. Its locked record is kept.');setConfirm(null);onChanged();}catch(error){setMessage(error instanceof Error?error.message:'Could not update publication.');}finally{setBusy(false);}}
  return <section className="panel publication-controls"><h3>Visibility: {receipt.visibility||'private'}{receipt.public_hidden?' · hidden for abuse':''}</h3>
    {receipt.visibility!=='public'?<button className="button secondary" onClick={()=>setConfirm('publish')}>Publish call</button>:owner&&!receipt.public_hidden?<button className="button secondary" onClick={()=>setConfirm('hide')}>Hide public call for abuse</button>:<p>Publication is one-way. The immutable record is retained.</p>}
    {confirm&&<div role="group" aria-label="Confirm publication action"><p>{confirm==='publish'?'Make this call public under your public username? The caller, market, terms and checked results will be visible to everyone. You cannot make it private again. Original text and private notes stay private.':'Hide this call from public views for abuse? The record and moderation audit event will be retained.'}</p><button className="button primary" disabled={busy} onClick={()=>void submit()}>Confirm {confirm}</button><button className="button secondary" disabled={busy} onClick={()=>setConfirm(null)}>Cancel</button></div>}
    {message&&<p role="status">{message}</p>}
  </section>;
}

export function PublicFeedModeration({ids}:{ids:string[]}){
  const [owner,setOwner]=useState(false),[id,setId]=useState(ids[0]||''),[confirm,setConfirm]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{let active=true;fetch('/api/auth').then(r=>r.json()).then(data=>{if(active)setOwner(data.user?.role==='operator');}).catch(()=>undefined);return()=>{active=false;};},[]);
  if(!owner||!ids.length)return null;
  return <section className="panel public-call"><h2>Owner moderation</h2><label>Public receipt<select value={id} onChange={event=>{setId(event.target.value);setConfirm(false);}}>{ids.map(value=><option key={value}>{value}</option>)}</select></label>
    {!confirm?<button className="button secondary" onClick={()=>setConfirm(true)}>Hide for abuse</button>:<><p>Confirm hiding this public call. Its locked record and audit event stay intact.</p><button className="button primary" disabled={busy} onClick={async()=>{setBusy(true);try{const r=await fetch('/api/publication',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,action:'hide',confirmed:true})});const d=await r.json();if(!r.ok)throw Error(d.error);window.location.reload();}catch(error){setMessage(error instanceof Error?error.message:'Moderation failed.');}finally{setBusy(false);}}}>Confirm hide</button><button className="button secondary" onClick={()=>setConfirm(false)}>Cancel</button></>}{message&&<p role="status">{message}</p>}
  </section>;
}
