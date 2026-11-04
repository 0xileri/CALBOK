'use client';
import {useEffect,useState} from 'react';
import type {Receipt} from '@/lib/db';
import type {repeatSeriesProgress} from '@/lib/repeat-series';
import {profileOutcome} from '@/lib/caller-profiles';
type Job={prediction_id:string;status:string;blob_id:string|null};
export function RepeatSeriesStart({receipt,job,owner,onChanged}:{receipt:Receipt;job?:Job;owner:boolean;onChanged:()=>void}){
 const [confirm,setConfirm]=useState(false),[count,setCount]=useState(5),[requestId,setRequestId]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 if(!owner||!['won','lost','neutral'].includes(profileOutcome(receipt))||job?.status!=='done'||!job.blob_id)return null;
 if(!['15m','1h','4h'].includes(receipt.horizon))return <p className="series-disclosure">Repeat series require a settled 15m, 1h or 4h receipt with confirmed memory. This receipt’s horizon stays unchanged.</p>;
 async function start(){setBusy(true);setMessage('');try{const response=await fetch('/api/repeat-series',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'start',seedId:receipt.id,count,requestId,confirmed:true})});const data=await response.json();if(!response.ok)throw new Error(data.error);setMessage(data.message);setConfirm(false);onChanged();}catch(error){setMessage(error instanceof Error?error.message:'Series unavailable.');}finally{setBusy(false);}}
 return <section className="series-start" aria-label="Owner repeat series"><h3>Owner-scheduled repeat predictions</h3>
  {!confirm?<button className="button secondary" disabled={busy} onClick={()=>{setRequestId(crypto.randomUUID());setConfirm(true);setMessage('');}}>Start repeat series</button>:<form onSubmit={event=>{event.preventDefault();void start();}} aria-label="Confirm repeat series">
   <p>Schedule additional predictions in this exact group: {receipt.caller} · {receipt.asset} · {receipt.direction} · {receipt.horizon}.</p>
   <label>Additional locks (1–10)<input type="number" min={1} max={10} required value={count} onChange={event=>setCount(Number(event.target.value))}/></label>
   <p>These are owner-scheduled repeat predictions, not new caller posts. Each one locks at the worker’s current server time only after the prior call settles and its Mainnet memory completes.</p>
   <p>Confirmation authorizes up to {count} new memory submissions for these steps, using your Walrus balance and normal provider credits. The general write budget and submission rate stay unchanged. Caution, failures, or Stop prevent future locks. Already locked calls and their approved memories may finish; failed submissions require manual review.</p>
   <button className="button primary" disabled={busy||!Number.isInteger(count)||count<1||count>10}>Confirm scheduled series</button><button type="button" className="button secondary" disabled={busy} onClick={()=>setConfirm(false)}>Cancel</button>
  </form>}{message&&<p role="status">{message}</p>}
 </section>;
}
export function RepeatSeriesPanel({receipts,onOpen}:{receipts:Receipt[];onOpen:(id:string)=>void}){
 const [series,setSeries]=useState<ReturnType<typeof repeatSeriesProgress>>([]),[error,setError]=useState(''),[busy,setBusy]=useState('');
 useEffect(()=>{const controller=new AbortController();fetch('/api/repeat-series',{cache:'no-store',signal:controller.signal}).then(async r=>{if(!r.ok)throw new Error('Series unavailable.');return r.json();}).then(data=>{setSeries(data.series);setError('');}).catch(()=>{if(!controller.signal.aborted)setError('Series progress could not be checked.');});return()=>controller.abort();},[receipts]);
 async function stop(id:string){setBusy(id);try{const r=await fetch('/api/repeat-series',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'stop',id})});const data=await r.json();if(!r.ok)throw new Error(data.error);setSeries(rows=>rows.map(row=>row.id===id?{...row,status:'stopped',stop_reason:'OWNER_STOPPED'}:row));}catch(e){setError(e instanceof Error?e.message:'Could not stop series.');}finally{setBusy('');}}
 return <section className="panel series-panel" aria-label="Owner repeat series progress"><h3>Owner repeat series</h3><p>Scheduled predictions by the owner, not caller posts. Future locks stop on caution, failure, count completion, or Stop.</p>
  {!series.length&&<p>No series started. Use a settled 15m, 1h or 4h receipt with confirmed memory to opt in.</p>}
  {series.map(row=><article key={row.id}><h4>{row.caller} · {row.asset} · {row.direction} · {row.horizon}</h4><p>Series {row.id} · Step {row.created_count} of {row.target_count} · {row.status==='active'&&row.created_count>=row.target_count?'Count reached; finishing the last settlement and memory':row.status}{row.stop_reason?' · '+row.stop_reason:''}</p><p>Group memories: {row.memories}/5 · win rate: {row.winRate===null?'—':row.winRate+'%'}</p><p>Next settlement deadline: {row.nextDeadline?<time dateTime={row.nextDeadline}>{new Date(row.nextDeadline).toUTCString()}</time>:'Waiting for the next scheduled lock or memory confirmation'}</p><button className="text-button" onClick={()=>onOpen(row.current_id)}>Open current receipt</button>{row.status==='active'&&<button className="button secondary" disabled={!!busy} onClick={()=>void stop(row.id)}>Stop series</button>}</article>)}{error&&<p role="alert">{error}</p>}
 </section>;
}
