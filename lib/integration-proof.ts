import {createHash} from 'node:crypto';
import type {Receipt} from './db';
import type {MemoryJob} from './memory-ledger';
import {profileOutcome} from './caller-profiles';
import {warning, type Candle} from './domain';

export type CompletionProof = {prediction_id:string; job_id:string; blob_id:string; network:string; completed_at:string};
export type RecallProof = {prediction_id:string; review:string; created_at:string};
type OnchainProof = {id:string; evidence:string; verified_at:string};
type SettlementEvidence = {provider:string; returnPct:string; entry:Candle; exit:Candle};

function parseObject(text: string | null | undefined): Record<string,unknown> | null {
  if (!text) return null;
  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string,unknown> : null;
  } catch {
    return null;
  }
}

function isLocked(row: Receipt): boolean {
  return row.provenance === 'self_logged_before_outcome' && typeof row.snapshot === 'string' &&
    createHash('sha256').update(row.snapshot).digest('hex') === row.snapshot_hash &&
    Date.parse(row.deadline) > Date.parse(row.locked_at);
}

function exportCandle({openTime,closeTime,sourceCloseTime,open,high,low,close,hash}: Candle) {
  return {openTime,closeTime,sourceCloseTime,open,high,low,close,hash};
}

function isProofCandle(value: unknown): value is Candle {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candle = value as Record<string,unknown>;
  return Number.isFinite(candle.openTime) && Number.isFinite(candle.closeTime) &&
    (candle.sourceCloseTime === undefined || Number.isFinite(candle.sourceCloseTime)) &&
    [candle.open,candle.high,candle.low,candle.close,candle.hash].every(field=>typeof field==='string');
}

function isSettlementEvidence(value: Record<string,unknown> | null): value is SettlementEvidence {
  return value !== null && typeof value.provider==='string' && typeof value.returnPct==='string' &&
    isProofCandle(value.entry) && isProofCandle(value.exit);
}

function settlementRecord(row: Receipt) {
  const evidence = parseObject(row.evidence);
  if (!isSettlementEvidence(evidence) || !['won','lost','neutral'].includes(profileOutcome(row))) return [];
  const {provider,returnPct,entry,exit} = evidence;
  return [{
    receiptId:row.id,asset:row.asset,direction:row.direction,horizon:row.horizon,
    lockedAt:row.locked_at,deadline:row.deadline,snapshotHash:row.snapshot_hash,
    outcome:row.outcome,method:row.method,provider,returnPct,entry:exportCandle(entry),exit:exportCandle(exit)
  }];
}

export function completedMemoryProofs(receipts: Receipt[], jobs: MemoryJob[], proofs: CompletionProof[]) {
  const settled = new Set(receipts.filter(row=>isLocked(row) && settlementRecord(row).length > 0).map(row=>row.id));
  const byId = new Map(jobs.map(job=>[job.prediction_id,job]));
  const jobIds = new Set<string>(), blobs = new Set<string>();
  return proofs.filter(proof=>{
    const job = byId.get(proof.prediction_id);
    if (!settled.has(proof.prediction_id) || proof.network !== 'mainnet' || job?.status !== 'done') return false;
    if (!proof.job_id || !proof.blob_id || job.job_id !== proof.job_id || job.blob_id !== proof.blob_id) return false;
    if (!Number.isFinite(Date.parse(proof.completed_at)) || jobIds.has(proof.job_id) || blobs.has(proof.blob_id)) return false;
    // Older proof fixtures and imported job metadata may omit the duplicate timestamp.
    if (job.completed_at && job.completed_at !== proof.completed_at) return false;
    jobIds.add(proof.job_id);
    blobs.add(proof.blob_id);
    return true;
  });
}

export function recallComparison(target: Receipt, ownedReceipts: Receipt[], completed: CompletionProof[], retrievedIds: string[]) {
  const lock = Date.parse(target.locked_at);
  const eligible = completed.filter(row=>Date.parse(row.completed_at)<lock && retrievedIds.includes(row.prediction_id));
  const history = ownedReceipts.filter(isLocked).flatMap(row=>{
    const outcome = profileOutcome(row);
    return outcome==='won'||outcome==='lost' ? [{...row,outcome,verified:true}] : [];
  });
  return warning(target,history,eligible.map(row=>row.prediction_id));
}

function stringIds(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((id): id is string=>typeof id==='string') : [];
}

function replayRecall(record: RecallProof, locked: Receipt[], completed: CompletionProof[]) {
  const target = locked.find(row=>row.id===record.prediction_id);
  const saved = parseObject(record.review);
  const recalledAt = Date.parse(record.created_at);
  if (!target || !saved || !Number.isFinite(recalledAt)) return [];
  const rawIds = stringIds(saved.retrievedIds ?? saved.citedIds);
  const retrievedIds = completed.filter(row=>Date.parse(row.completed_at)<=recalledAt && rawIds.includes(row.prediction_id))
    .map(row=>row.prediction_id);
  if (!retrievedIds.length) return [];
  const comparison = recallComparison(target,locked,completed,retrievedIds);
  return [{
    receiptId:target.id,at:record.created_at,retrievedIds,...comparison,
    adapted:saved.priority==='caution' && comparison.priority==='caution'
  }];
}

function validSuiRead(row: OnchainProof) {
  const evidence = parseObject(row.evidence);
  return evidence?.provider==='Tatum' && evidence.network==='mainnet' &&
    evidence.method==='sui.rpc.v2.StateService/GetCoinInfo' && evidence.symbol==='SUI' && evidence.decimals===9 &&
    typeof evidence.coinType==='string' && /^0x0*2::sui::SUI$/.test(evidence.coinType) &&
    typeof evidence.id==='string' && /^0x[0-9a-fA-F]{64}$/.test(evidence.id) &&
    typeof evidence.responseHash==='string' && /^[0-9a-f]{64}$/.test(evidence.responseHash);
}

function nextStep(locked: Receipt[], settlements: ReturnType<typeof settlementRecord>, completed: CompletionProof[], recalls: ReturnType<typeof replayRecall>) {
  if (!locked.length) return 'Lock a genuine forward-looking call. Quick captures and old screenshots do not start scored proof.';
  if (!settlements.length) return 'Wait for a locked call’s deadline and finalized evidence, then inspect its settlement.';
  if (!completed.length) return 'Open a verified settled receipt and choose Remember outcome. Confirm completion; accepted jobs do not count.';
  if (!recalls.length) return 'Open a receipt and run Recall context to record SQL-linked recall evidence.';
  if (!recalls.some(row=>row.adapted)) return 'Build relevant verified history, then lock a later call and Recall context. Caution proof requires five matching memories completed before that call was locked; never invent calls to reach the threshold.';
  if (completed.length<10) return 'Continue with genuine eligible results until ten distinct Mainnet completions are recorded.';
  return 'The stored loop is demonstrated. Still verify restart/recall, official requirements, blog, repository visibility and demo recording.';
}

export function memoryGroupProgress(receipts: Receipt[], completed: CompletionProof[]) {
  const completedIds = new Set(completed.map(row=>row.prediction_id));
  const groups = new Map<string,{key:string;caller:string;asset:string;direction:string;horizon:string;count:number;wins:number;losses:number}>();
  for (const receipt of receipts.filter(isLocked)) {
    const {caller,asset,direction,horizon} = receipt;
    const key = JSON.stringify([caller.trim().toLowerCase(),asset,direction,horizon]);
    const group = groups.get(key) ?? {key,caller,asset,direction,horizon,count:0,wins:0,losses:0};
    const outcome = profileOutcome(receipt);
    if (completedIds.has(receipt.id) && (outcome==='won' || outcome==='lost')) {group.count++;if(outcome==='won')group.wins++;else group.losses++;}
    groups.set(key,group);
  }
  const result=[...groups.values()].map(group=>({...group,winRate:group.count?(group.wins/group.count*100).toFixed(1):null,remaining:Math.max(0,5-group.count)}));
  const closest=Math.min(...result.filter(group=>group.count>0).map(group=>group.remaining));
  return result.map(group=>({...group,closest:group.count>0&&group.remaining===closest})).sort((a,b)=>a.remaining-b.remaining||b.count-a.count||a.key.localeCompare(b.key));
}

export function integrationProof(receipts: Receipt[], jobs: MemoryJob[], completions: CompletionProof[], recalls: RecallProof[], onchain: OnchainProof[]) {
  const locked = receipts.filter(isLocked);
  const settlements = locked.flatMap(settlementRecord);
  const exportedIds = new Set(settlements.map(row=>row.receiptId));
  const invalidSettlementIds = locked.filter(row=>row.evidence!==null && !exportedIds.has(row.id)).map(row=>row.id);
  const completed = completedMemoryProofs(locked,jobs,completions);
  const recalled = recalls.flatMap(record=>replayRecall(record,locked,completed));
  const citedRecalls = recalled.filter(row=>row.citedIds.length>0);
  const adapted = citedRecalls.filter(row=>row.adapted);
  const sui = onchain.filter(validSuiRead).map(row=>({id:row.id,at:row.verified_at}));
  const stages = [
    {key:'lock',label:'Lock a forward-looking call',count:locked.length,receiptId:locked[0]?.id},
    {key:'settle',label:'Verify a settled outcome',count:settlements.length,receiptId:settlements[0]?.receiptId},
    {key:'remember',label:'Confirm a Mainnet memory',count:completed.length,receiptId:completed[0]?.prediction_id},
    {key:'recall',label:'Recall completed memory with SQL citations',count:citedRecalls.length,receiptId:citedRecalls[0]?.receiptId},
    {key:'adapt',label:'Show a later call’s memory-driven caution',count:adapted.length,receiptId:adapted[0]?.receiptId}
  ];
  const nextReceiptId = !settlements.length ? locked[0]?.id : !completed.length ? settlements[0]?.receiptId :
    !citedRecalls.length ? completed[0]?.prediction_id : locked[0]?.id;
  return {
    settlements,invalidSettlementIds,groups:memoryGroupProgress(locked,completed),checkedAt:new Date().toISOString(),stages,next:nextStep(locked,settlements,completed,citedRecalls),
    nextReceiptId,mainnetCompleted:completed.length,target:10,completed,recalls:recalled.slice(0,20),sui,
    locked:locked.length,settled:settlements.length,unconfirmedJobs:jobs.length-completed.length
  };
}
export type IntegrationProof = ReturnType<typeof integrationProof>;
