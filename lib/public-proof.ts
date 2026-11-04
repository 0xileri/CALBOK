import {db,listReceipts} from './db';
import {integrationProof,type IntegrationProof,type CompletionProof,type RecallProof} from './integration-proof';
import {proofSchema} from './integration-proof-store';
import type {MemoryJob} from './memory-ledger';

/** Deliberate public allowlist: never spread SQL rows, snapshots, reviews or memory content. */
export function publicProof(proof:IntegrationProof) {
  return {
    checkedAt:proof.checkedAt,
    stages:proof.stages.map(({key,label,count})=>({key,label,count})),
    receipts:proof.settlements.map(row=>({
      id:row.receiptId,asset:row.asset,direction:row.direction,horizon:row.horizon,
      outcome:row.outcome,returnPct:row.returnPct,provider:row.provider,snapshotHash:row.snapshotHash,
      ownerScheduled:!!row.scheduledRepeat,
      blobId:proof.completed.find(memory=>memory.prediction_id===row.receiptId)?.blob_id??null,
    })),
  };
}
export function ownerPublicProof() {
  proofSchema();
  const receipts=listReceipts('operator').filter(row=>row.visibility==='public'&&!row.public_hidden),ids=new Set(receipts.map(row=>row.id));
  const jobs=(db().prepare('SELECT * FROM memory_jobs').all() as MemoryJob[]).filter(row=>ids.has(row.prediction_id));
  const completed=(db().prepare('SELECT * FROM memory_completion_proofs').all() as CompletionProof[]).filter(row=>ids.has(row.prediction_id));
  const recalls=db().prepare('SELECT prediction_id,review,created_at FROM recall_proofs WHERE owner_id=?').all('operator') as RecallProof[];
  return publicProof(integrationProof(receipts,jobs,completed,recalls,[]));
}
export type PublicProof=ReturnType<typeof publicProof>;
