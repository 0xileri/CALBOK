import {authorize} from '@/lib/http';
import {principal} from '@/lib/auth';
import {db,listReceipts} from '@/lib/db';
import {proofSchema} from '@/lib/integration-proof-store';
import {integrationProof,type CompletionProof,type RecallProof} from '@/lib/integration-proof';
import type {MemoryJob} from '@/lib/memory-ledger';
export const runtime='nodejs';
export async function GET(request:Request){const denied=authorize(request);if(denied)return denied;proofSchema();const user=principal(request)!,receipts=listReceipts(user.id),ids=new Set(receipts.map(row=>row.id));const jobs=(db().prepare('SELECT * FROM memory_jobs').all() as MemoryJob[]).filter(row=>ids.has(row.prediction_id));const completed=(db().prepare('SELECT * FROM memory_completion_proofs').all() as CompletionProof[]).filter(row=>ids.has(row.prediction_id));const recalls=db().prepare('SELECT prediction_id,review,created_at FROM recall_proofs WHERE owner_id=? ORDER BY created_at DESC LIMIT 200').all(user.id) as RecallProof[];const onchain=user.role==='operator'?db().prepare('SELECT id,evidence,verified_at FROM onchain_evidence').all() as {id:string;evidence:string;verified_at:string}[]:[];return Response.json(integrationProof(receipts,jobs,completed,recalls,onchain),{headers:{'Cache-Control':'no-store'}});}
