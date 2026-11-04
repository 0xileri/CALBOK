'use client';
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
      <h4>Verified memories toward caution</h4><p>Win rates use completed, verified wins and losses in each exact group. Neutral outcomes do not count toward the minimum of five. Reaching five makes a group eligible for review, not a guaranteed caution.</p>
      {proof.groups.length?<ul>{proof.groups.map(group=><li key={group.key}>
        {group.caller} · {group.asset} · {group.direction} · {group.horizon} · {group.count}/5 · win rate {group.winRate===null?'—':group.winRate+'%'}{group.closest?' · Closest to caution eligibility':''}
      </li>)}</ul>:<p>No locked calls yet.</p>}
    </>}
  </section>;
}
