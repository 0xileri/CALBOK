import {db,listReceipts,type Receipt} from './db';
import {completedMemoryProofs,recallComparison,type CompletionProof} from './integration-proof';
import {proofSchema,recordRecall} from './integration-proof-store';
import {configuration,memoryClient,namespaceFor} from './providers';
import type {MemoryJob} from './memory-ledger';

export function memoryHistory(owner: string) {
    proofSchema();
    const receipts = listReceipts(owner);
    const ownedIds = new Set(receipts.map(row=>row.id));
    const jobs = (db().prepare('SELECT * FROM memory_jobs').all() as MemoryJob[]).filter(job=>ownedIds.has(job.prediction_id));
    const completions = db().prepare('SELECT * FROM memory_completion_proofs').all() as CompletionProof[];
    const completed = completedMemoryProofs(receipts,jobs,completions);
    return {receipts,completed};
}

export async function recallReceipt(receipt: Receipt, owner: string, getClient = memoryClient) {
    const {receipts,completed} = memoryHistory(owner);
    const namespace=namespaceFor(owner==='operator'?receipt.caller:JSON.stringify([owner,receipt.caller])),client=await getClient(namespace);
    const recalled=await client.recall({query:`caller=${receipt.caller}; asset=${receipt.asset}; horizon=${receipt.horizon}; direction=${receipt.direction}`,namespace,limit:20,maxDistance:0.5});

    const retrievedIds = recalled.results.flatMap(match=>{
      try {
        const id: unknown = JSON.parse(match.text)?.predictionId;
        return typeof id==='string' && completed.some(row=>row.prediction_id===id && row.blob_id===match.blob_id) ? [id] : [];
      } catch { return []; }
    });
    const review = recallComparison(receipt,receipts,completed,retrievedIds);
    recordRecall(receipt.id,owner,{...review,retrievedIds:[...new Set(retrievedIds)]});
    return review;
}

export function matchingPriorMemory(target: Receipt, prior: Receipt, completedAt: string) {
    return prior.id !== target.id && prior.caller.trim().toLowerCase() === target.caller.trim().toLowerCase()
        && prior.asset === target.asset && prior.direction === target.direction && prior.horizon === target.horizon
        && Date.parse(completedAt) < Date.parse(target.locked_at);
}

export async function automaticRecall(owner: string, targetId?: string, getClient = memoryClient) {
    if (!configuration().walrus || (owner !== 'operator' && process.env.CALBOK_USER_PROVIDER_ACCESS !== 'true')) return;
    const {receipts,completed} = memoryHistory(owner);
    const database = db();
    database.exec('CREATE TABLE IF NOT EXISTS automatic_recall_attempts (prediction_id TEXT PRIMARY KEY REFERENCES predictions(id))');
    const reviewed = database.prepare('SELECT 1 FROM recall_proofs WHERE owner_id=? AND prediction_id=?');
    const claim = database.prepare('INSERT OR IGNORE INTO automatic_recall_attempts VALUES (?)');
    const byId = new Map(receipts.map(receipt => [receipt.id,receipt]));
    for (const receipt of receipts) {
        if (targetId && receipt.id !== targetId) continue;
        if (reviewed.get(owner,receipt.id)) continue;
        if (!completed.some(proof => {
            const prior = byId.get(proof.prediction_id);
            return prior && matchingPriorMemory(receipt,prior,proof.completed_at);
        })) continue;
        if (!claim.run(receipt.id).changes) continue;
        // One provider request per automatic invocation. The worker handles remaining receipts.
        return recallReceipt(receipt,owner,getClient);
    }
}
