'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {AssetPicker} from './asset-picker';
import type {Asset} from '@/lib/assets';
import {emptyDraft,type DraftFields} from '@/lib/draft-fields';
import {horizonLabels} from '@/lib/horizons';
import {lockAgainSeed,sameGroupRepeatSeed} from '@/lib/lock-again';
import {callPath,directionLabel} from '@/lib/call-presentation';
import {makeCallReview} from '@/lib/log-review';
import {AccessPrompt} from './access-prompt';
import {useWorkspace} from './workspace-state';

export function LogCall({repeatId,sameGroup=false}:{repeatId?:string;sameGroup?:boolean}){
 const {session,data,error}=useWorkspace();
 if(session.loading)return <main><p role="status">Checking sign-in…</p></main>;
 if(!session.user)return <AccessPrompt next="/log"/>;
 if(!data)return <main><p role={error?'alert':'status'}>{error||'Loading your call form…'}</p></main>;
 const prior=repeatId?data.receipts.find(row=>row.id===repeatId):undefined;
 const seed=prior?(sameGroup?sameGroupRepeatSeed(prior,data.memoryJobs.find(job=>job.prediction_id===prior.id)):lockAgainSeed(prior)):null;
 if(repeatId&&!seed)return <main className="narrow-page"><h1>This call cannot be repeated yet.</h1><p>A checked result{sameGroup?' and completed memory are':' is'} needed first.</p></main>;
 return <LogForm key={repeatId||'new'} gmgn={data.providers.gmgn} seed={seed?.fields} seedAsset={seed?.asset} repeatId={repeatId} sameGroup={sameGroup} publicHandle={session.user.publicHandle}/>;
}
function LogForm({gmgn,seed,seedAsset,repeatId,sameGroup,publicHandle}:{gmgn:boolean;seed?:DraftFields;seedAsset?:Asset;repeatId?:string;sameGroup:boolean;publicHandle?:string}){
 const router=useRouter(),[asset,setAsset]=useState<Asset|null>(seedAsset||null),[review,setReview]=useState<Record<string,string>|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const initial=seed||emptyDraft;
 async function lock(){if(!review||busy)return;setBusy(true);setError('');try{const r=await fetch('/api/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...review,repeatOf:repeatId,sameGroup})});const result=await r.json();if(!r.ok)throw Error(result.error||'Could not log this call.');router.push(callPath(result.id));}catch(error){setError(error instanceof Error?error.message:'Could not log this call.');}finally{setBusy(false);}}
 return <main className="narrow-page"><header className="page-intro"><span className="overline">BEFORE THE RESULT</span><h1>{review?'Ready to lock it?':'Log a call'}</h1><p>{review?'Confirm these terms. Your clock starts when you lock.':'Choose a prediction. We’ll check the result when its window ends.'}</p></header>
  {repeatId&&<p className="form-help">This is your new prediction repeating an earlier call, not a new post from the named caller. It locks at the current server time.</p>}
  <form className="clean-form" hidden={!!review} onSubmit={event=>{event.preventDefault();if(!asset){setError('Choose an asset first.');return;}const fields=Object.fromEntries(new FormData(event.currentTarget)) as Record<string,string>;
    try{setReview(makeCallReview(fields,asset));setError('');}catch{setError('Check the caller, direction, window and source link.');}}}>
   <label>Caller<input name="caller" required minLength={2} maxLength={60} defaultValue={initial.caller} placeholder="@caller or your name"/></label>
   <AssetPicker compact headers={()=>({'Content-Type':'application/json'})} gmgnConfigured={gmgn} initialAsset={seedAsset} onSelected={setAsset}/>
   <div className="form-pair"><label>Direction<select name="direction" required defaultValue={initial.direction}><option value="" disabled>Choose direction</option><option value="bullish">Bullish · higher</option><option value="bearish">Bearish · lower</option></select></label><label>Window<select name="horizon" required defaultValue={initial.horizon}><option value="" disabled>Choose window</option>{Object.entries(horizonLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div>
   <label>Source link <span className="form-help">Optional</span><input name="sourceUrl" type="url" pattern="https://.*" defaultValue={initial.sourceUrl} placeholder="https://…"/></label>
   <label>Who can see it?<select name="visibility" defaultValue="private"><option value="private">Private · only you</option><option value="public" disabled={!publicHandle}>Public · anyone can view</option></select></label>
   {!publicHandle&&<p className="form-help">Set a public username in Account → Profile to publish calls. Your email is never shown publicly.</p>}
   <details><summary>Add the original call text (optional)</summary><label>Original call<textarea name="text" maxLength={2000} minLength={10} rows={3} defaultValue={initial.text}/></label></details>
   <p className="form-help">Without pasted text, the confirmation shows your prediction using only the terms you chose. Caller labels do not prove authorship.</p>
   <button className="primary-action" type="submit">Review call →</button>
  </form>
  {review&&<section className="clean-confirm" aria-label="Confirm your call"><h2>{asset?.symbol} · {directionLabel(review.direction)}</h2><blockquote>{review.text}</blockquote><dl><dt>Caller</dt><dd>{review.caller}</dd><dt>Window</dt><dd>{horizonLabels[review.horizon]}</dd><dt>Visibility</dt><dd>{review.visibility==='public'?'Public · cannot be made private again':'Private · only you'}</dd><dt>Source</dt><dd>{review.sourceUrl||'Not supplied'}</dd></dl><p className="form-help">A new self-logged prediction. After confirmation, its terms cannot be edited. Prices and outcomes are never filled in without checked data.</p><div className="quiet-action-row"><button className="primary-action" disabled={busy} onClick={()=>void lock()}>{busy?'Locking…':'Confirm and log call'}</button><button className="quiet-button" disabled={busy} onClick={()=>setReview(null)}>Edit</button></div></section>}
  {error&&<p className="form-message" role="alert">{error}</p>}
 </main>;
}
