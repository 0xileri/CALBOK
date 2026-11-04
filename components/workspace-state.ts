'use client';
import {useCallback,useEffect,useState} from 'react';
import type {Receipt} from '@/lib/db';
import type {RecallReview} from '@/lib/recall-types';
import type {MemoryJob} from '@/lib/memory-ledger';
import type {SettlementStatus} from './settlement-monitor';
import {useSession} from './site-shell';
export type WorkspaceData={receipts:Receipt[];memoryJobs:MemoryJob[];recallReviews?:Record<string,RecallReview>;entryPrices?:{prediction_id:string;candle:string|null;error:string|null}[];settlement?:SettlementStatus;providers:{gmgn:boolean;tatum:boolean;walrus:boolean;mainnet:boolean}};
export function useWorkspace(){
  const session=useSession(),[data,setData]=useState<WorkspaceData|null>(null),[error,setError]=useState(''),[loadedFor,setLoadedFor]=useState<string|null>(null);
  const identity=session.user?session.user.role+':'+(session.user.email||'owner'):null;
  const refresh=useCallback(async()=>{if(!identity)return;try{const r=await fetch('/api/workspace',{cache:'no-store'});const result=await r.json();if(!r.ok){if(r.status===401||r.status===403){setData(null);setLoadedFor(null);}throw Error(result.error||'Could not load your calls.');}setData(result);setLoadedFor(identity);setError('');return result as WorkspaceData;}catch(error){setError(error instanceof Error?error.message:'Could not load your calls.');}},[identity]);
  useEffect(()=>{let active=true;const load=async()=>{if(active&&document.visibilityState==='visible')await refresh();};void load();const timer=setInterval(()=>void load(),30000);document.addEventListener('visibilitychange',load);return()=>{active=false;clearInterval(timer);document.removeEventListener('visibilitychange',load);};},[refresh]);
  return {session,data:identity&&loadedFor===identity?data:null,error,refresh};
}
