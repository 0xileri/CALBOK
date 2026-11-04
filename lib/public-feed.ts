import {z} from 'zod';
import {db,listReceipts,hash} from './db';
import {publicationSchema,publicCallerAllowed} from './publication';
import {profileOutcome,profileStats,profileGroups} from './caller-profiles';
import {completedMemoryProofs,type CompletionProof} from './integration-proof';
import {proofSchema} from './integration-proof-store';
import {scheduledRepeat} from './scheduled-repeat';
import type {MemoryJob} from './memory-ledger';
import {horizons} from './horizons';

export const canonicalCaller=(value:string)=>value.trim().replace(/^@/,'').toLowerCase();
export const callerPath=(value:string)=>'/caller/'+encodeURIComponent(canonicalCaller(value));
const querySchema=z.object({
  caller:z.string().trim().max(60).refine(value=>!value||publicCallerAllowed(value)).default(''),asset:z.string().max(120).refine(value=>!value||/^[a-zA-Z0-9:_-]+$/.test(value)).default(''),
  horizon:z.enum(['',...horizons]).default(''),
  outcome:z.enum(['','pending','won','lost','neutral','unverified']).default(''),
  page:z.coerce.number().int().min(1).max(100000).default(1),
  pageSize:z.coerce.number().int().min(1).max(50).default(20),
}).strict();
export function parseFeedQuery(params:URLSearchParams){return querySchema.parse(Object.fromEntries(params));}
export type FeedQuery=z.infer<typeof querySchema>;

function publicRows(){
  publicationSchema();
  const published=db().prepare(`SELECT v.prediction_id,h.handle FROM receipt_publication v
    LEFT JOIN prediction_owners o USING(prediction_id)
    JOIN public_handles h ON h.user_id=COALESCE(o.owner_id,'operator')
    WHERE v.visibility='public' AND v.hidden=0`).all() as {prediction_id:string;handle:string}[];
  const handles=new Map(published.map(row=>[row.prediction_id,row.handle]));
  return listReceipts().filter(row=>handles.has(row.id)&&publicCallerAllowed(row.caller)&&row.provenance==='self_logged_before_outcome'
    &&!!row.snapshot&&hash(row.snapshot)===row.snapshot_hash&&Date.parse(row.deadline)>Date.parse(row.locked_at))
    .map(row=>({receipt:row,loggedBy:handles.get(row.id)!}));
}
/** No raw SQL rows or snapshots leave this module. Completion uses the same proof validation as /proof. */
function projectRows(rows:ReturnType<typeof publicRows>){
  proofSchema();
  const receipts=rows.map(row=>row.receipt),ids=new Set(receipts.map(row=>row.id));
  const jobs=(db().prepare('SELECT * FROM memory_jobs').all() as MemoryJob[]).filter(row=>ids.has(row.prediction_id));
  const proofs=(db().prepare('SELECT * FROM memory_completion_proofs').all() as CompletionProof[]).filter(row=>ids.has(row.prediction_id));
  const completed=completedMemoryProofs(receipts,jobs,proofs);
  return rows.map(({receipt:row,loggedBy})=>{
    const outcome=profileOutcome(row),verified=['won','lost','neutral'].includes(outcome);
    // profileOutcome has validated the evidence before any settlement field is exposed.
    const evidence=verified?JSON.parse(row.evidence!) as {returnPct:string;provider:string;entry:{provider?:string};exit:{provider?:string}}:null;
    return {id:row.id,caller:row.caller,loggedBy,asset:row.asset,direction:row.direction,horizon:row.horizon,
      locked_at:row.locked_at,deadline:row.deadline,outcome,
      returnPct:evidence?.returnPct??null,provider:evidence?.provider??null,
      snapshotHash:row.snapshot_hash,blobId:completed.find(proof=>proof.prediction_id===row.id)?.blob_id??null,
      provenance:'self-logged before outcome' as const,ownerScheduled:!!scheduledRepeat(row)};
  });
}
function filteredRows(query:FeedQuery,caller?:string){
  return publicRows().filter(({receipt:row})=>(!caller||canonicalCaller(row.caller)===canonicalCaller(caller))
    &&(!query.caller||canonicalCaller(row.caller)===canonicalCaller(query.caller))
    &&(!query.asset||row.asset===query.asset)&&(!query.horizon||row.horizon===query.horizon)
    &&(!query.outcome||profileOutcome(row)===query.outcome))
    .sort((a,b)=>b.receipt.locked_at.localeCompare(a.receipt.locked_at)||b.receipt.id.localeCompare(a.receipt.id));
}
function paginate(rows:ReturnType<typeof publicRows>,query:FeedQuery){
  const start=(query.page-1)*query.pageSize;
  return {calls:projectRows(rows.slice(start,start+query.pageSize)),page:query.page,pageSize:query.pageSize,total:rows.length,hasMore:start+query.pageSize<rows.length};
}
export function publicFeed(query:FeedQuery){return paginate(filteredRows(query),query);}
export function publicCaller(handle:string,query:FeedQuery){
  if(!publicCallerAllowed(handle)||handle.length>60)return null;
  const all=publicRows().filter(({receipt})=>canonicalCaller(receipt.caller)===canonicalCaller(handle));
  if(!all.length)return null;
  const settled=all.map(row=>row.receipt).filter(row=>['won','lost','neutral'].includes(profileOutcome(row)));
  const summary=profileStats(settled);
  return {caller:all[0].receipt.caller,record:{settled:summary.total,scored:summary.scored,wins:summary.won,losses:summary.lost,neutral:summary.neutral,winRate:summary.rate,
    byHorizon:profileGroups(settled,'horizon').map(group=>({horizon:group.key,count:group.total,scored:group.scored,wins:group.won,losses:group.lost,winRate:group.rate}))},
    ...paginate(filteredRows(query,handle),query)};
}
export type PublicCall=ReturnType<typeof projectRows>[number];
export type PublicFeed=ReturnType<typeof publicFeed>;
export type PublicCaller=NonNullable<ReturnType<typeof publicCaller>>;
