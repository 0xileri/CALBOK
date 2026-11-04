'use client';
import {PathToCaution} from './path-to-caution';
import {useEffect,useState} from 'react';
import type {IntegrationProof} from '@/lib/integration-proof';

import type {Receipt} from '@/lib/db';

export function LoopProgress({receipts}:{receipts:Receipt[]}) {
  const [now,setNow] = useState(0);
  const upcoming = receipts.filter(receipt=>now>0 && !receipt.outcome && Date.parse(receipt.deadline)>now)
    .sort((a,b)=>Date.parse(a.deadline)-Date.parse(b.deadline)).slice(0,5);
  const [proof,setProof] = useState<IntegrationProof|null>(null);
  const [failed,setFailed] = useState(false);
  useEffect(()=>{
    const timer = window.setInterval(()=>setNow(Date.now()),1000);
    const controller = new AbortController();
    fetch('/api/integration-proof',{cache:'no-store',signal:controller.signal})
      .then(response=>{
        if (!response.ok) throw new Error('Progress unavailable');
        return response.json();
      })
      .then(setProof)
      .catch(()=>{if(!controller.signal.aborted)setFailed(true);});
    return ()=>{controller.abort();window.clearInterval(timer);};
  },[receipts]);
  return <section className="panel info-card" aria-label="Integration progress">
    <h3>Integration progress</h3>
    <h4>Next settlement deadlines</h4>
    {upcoming.length?<ul>{upcoming.map(receipt=><li key={receipt.id}>
      {receipt.asset_symbol||receipt.asset} · {receipt.caller} · <time dateTime={receipt.deadline}>{new Date(receipt.deadline).toUTCString()}</time>
    </li>)}</ul>:<p>No upcoming deadlines.</p>}
    {!proof?<p>{failed?'Progress unavailable.':'Loading progress…'}</p>:<>
      <ul>{proof.stages.map(stage=><li key={stage.key}>{stage.label} · {stage.count}</li>)}</ul>
      <PathToCaution groups={proof.groups}/>
    </>}
  </section>;
}
