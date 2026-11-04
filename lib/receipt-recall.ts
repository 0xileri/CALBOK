import {stopSeriesForReceipt} from './repeat-series-store';
import type {SqlRecallCitation,RecallReview} from './recall-types';
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

type RecallClientFactory=(namespace:string)=>Promise<Pick<Awaited<ReturnType<typeof memoryClient>>,'recall'>>;

export const RECALL_SQL=`SELECT p.id AS receiptId,m.job_id AS jobId,m.blob_id AS blobId,c.completed_at AS completedAt,CASE WHEN json_valid(p.snapshot) THEN json_extract(p.snapshot,'$.scheduledRepeat.seriesId') END AS seriesId
FROM predictions p
LEFT JOIN prediction_owners o ON o.prediction_id=p.id
JOIN settlements s ON s.prediction_id=p.id
JOIN memory_jobs m ON m.prediction_id=p.id
JOIN memory_completion_proofs c ON c.prediction_id=p.id
WHERE COALESCE(o.owner_id,'operator')=? AND p.caller=? AND p.asset=? AND p.direction=? AND p.horizon=?
  AND p.id IN (SELECT value FROM json_each(?)) AND s.outcome IN ('won','lost')
  AND m.status='done' AND m.blob_id IS NOT NULL AND c.network='mainnet'
  AND m.job_id=c.job_id AND m.blob_id=c.blob_id
  AND (m.completed_at IS NULL OR m.completed_at=c.completed_at) AND c.completed_at<?
ORDER BY p.id`;
function sqlCitation(receipt:Receipt,owner:string,ids:string[]):SqlRecallCitation {
  proofSchema();
  const parameters=[owner,receipt.caller,receipt.asset,receipt.direction,receipt.horizon,JSON.stringify(ids),receipt.locked_at];
  const rows=db().prepare(RECALL_SQL).all(...parameters) as unknown as SqlRecallCitation['rows'];
  return {query:RECALL_SQL,parameters,rows};
}
/** Rebuild display evidence from owned SQL records, never trust a saved banner or provider text. */
export function verifiedRecallReview(receipt:Receipt,owner:string,saved:unknown,at:string,history=memoryHistory(owner)):RecallReview|null {
  if(!saved||typeof saved!=='object'||!Number.isFinite(Date.parse(at)))return null;
  const record=saved as {retrievedIds?:unknown;citedIds?:unknown};
  const raw=record.retrievedIds??record.citedIds;
  const ids=Array.isArray(raw)?raw.filter((id):id is string=>typeof id==='string'):[];
  const completed=history.completed.filter(row=>Date.parse(row.completed_at)<=Date.parse(at));
  const review=recallComparison(receipt,history.receipts,completed,ids);
  const citation=sqlCitation(receipt,owner,review.citedIds);
  const checked=recallComparison(receipt,history.receipts,completed,citation.rows.map(row=>row.receiptId));
  return {...checked,sqlCitation:citation};
}

export async function recallReceipt(receipt: Receipt, owner: string, getClient:RecallClientFactory = memoryClient) {
    const namespace=namespaceFor(owner==='operator'?receipt.caller:JSON.stringify([owner,receipt.caller]));
    let recalled;
    try{const client=await getClient(namespace);recalled=await client.recall({query:`caller=${receipt.caller}; asset=${receipt.asset}; horizon=${receipt.horizon}; direction=${receipt.direction}`,namespace,limit:20,maxDistance:0.5});}
    catch(error){stopSeriesForReceipt(receipt.id,'RECALL_FAILED');throw error;}

    const {receipts,completed} = memoryHistory(owner);
    const retrievedIds = recalled.results.flatMap(match=>{
      try {
        const id: unknown = JSON.parse(match.text)?.predictionId;
        return typeof id==='string' && completed.some(row=>row.prediction_id===id && row.blob_id===match.blob_id) ? [id] : [];
      } catch { return []; }
    });
    const comparison = recallComparison(receipt,receipts,completed,retrievedIds);
    const sql=sqlCitation(receipt,owner,comparison.citedIds);
    const review:RecallReview={...recallComparison(receipt,receipts,completed,sql.rows.map(row=>row.receiptId)),sqlCitation:sql};
    recordRecall(receipt.id,owner,{...review,retrievedIds:[...new Set(retrievedIds)]});
    if(review.priority==='caution')stopSeriesForReceipt(receipt.id,'CAUTION_TRIGGERED');
    return review;
}

export function matchingPriorMemory(target: Receipt, prior: Receipt, completedAt: string) {
    return prior.id !== target.id && prior.caller.trim().toLowerCase() === target.caller.trim().toLowerCase()
        && prior.asset === target.asset && prior.direction === target.direction && prior.horizon === target.horizon
        && Date.parse(completedAt) < Date.parse(target.locked_at);
}

export async function automaticRecall(owner: string, targetId?: string, getClient:RecallClientFactory = memoryClient) {
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
