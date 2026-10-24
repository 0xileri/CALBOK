'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Animate the outgoing section before replacing it; rapid clicks keep the latest target. */
export function useSectionTransition<T>(initial:T) {
  const [view,setView]=useState(initial);
  const [phase,setPhase]=useState<'idle'|'leaving'|'entering'>('idle');
  const current=useRef(initial);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  const navigate=useCallback((next:T)=>{
    if(timer.current)clearTimeout(timer.current);
    if(next===current.current){setPhase('idle');return;}
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      window.scrollTo(0,0);
      current.current=next;setView(next);setPhase('idle');return;
    }
    setPhase('leaving');
    timer.current=setTimeout(()=>{
      window.scrollTo(0,0);
      current.current=next;
      setView(next);
      setPhase('entering');
      timer.current=setTimeout(()=>setPhase('idle'),280);
    },140);
  },[]);
  return [view,navigate,phase] as const;
}
