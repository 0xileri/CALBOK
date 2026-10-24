'use client';
import { useState, type CSSProperties } from 'react';
import { RotateCcw } from 'lucide-react';

// Fixed geometry keeps the server and client render identical.
const shards = [
  ['0 0, 26% 0, 19% 56%, 0 34%',-48,-26,-12],
  ['26% 0, 42% 0, 34% 39%, 19% 56%',-18,-49,19],
  ['42% 0, 60% 0, 53% 46%, 34% 39%',13,-37,-16],
  ['60% 0, 80% 0, 73% 48%, 53% 46%',37,-44,22],
  ['80% 0, 100% 0, 100% 37%, 73% 48%',64,-22,-12],
  ['0 34%, 19% 56%, 13% 100%, 0 100%',-57,22,18],
  ['19% 56%, 34% 39%, 43% 72%, 28% 100%, 13% 100%',-24,40,-23],
  ['34% 39%, 53% 46%, 60% 100%, 43% 72%',12,51,17],
  ['43% 72%, 60% 100%, 28% 100%',-4,64,-8],
  ['53% 46%, 73% 48%, 79% 100%, 60% 100%',43,39,-20],
  ['73% 48%, 100% 37%, 100% 100%, 79% 100%',70,29,15],
] as const;

export function ShatterHeadline() {
  const [play,setPlay]=useState(0);
  return <div className="headline-motion"><h2 key={play} className="glass-headline" aria-label="Calls fade. Receipts stay."><span className="glass-word" aria-hidden="true"><span className="glass-original">Calls fade.</span><span className="glass-shards">{shards.map(([polygon,x,y,rotation],i)=><span key={i} className="glass-shard" style={{clipPath:`polygon(${polygon})`,'--shard-x':`${x}px`,'--shard-y':`${y}px`,'--shard-rotation':`${rotation}deg`,'--shard-delay':`${i*13}ms`} as CSSProperties}>Calls fade.</span>)}</span><svg className="glass-cracks" viewBox="0 0 400 90" preserveAspectRatio="none"><path d="m0 30 76 20 60-15 76 6 80 2 108-10M104 0 76 50 52 90M168 0 136 35 172 65 112 90M240 0 212 41 240 90M320 0 292 43 316 90"/></svg></span><em className="glass-stays" aria-hidden="true">Receipts stay.</em></h2><button className="motion-replay" type="button" onClick={()=>setPlay(value=>value+1)} aria-label="Replay glass animation" title="Replay glass animation"><RotateCcw size={14}/></button></div>;
}
