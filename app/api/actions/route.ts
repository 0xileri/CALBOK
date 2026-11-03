import {reconcileMemory,rememberReceipt} from '@/lib/automatic-memory';
import {proofSchema,recordRecall} from '@/lib/integration-proof-store';
import {completedMemoryProofs,recallComparison,type CompletionProof} from '@/lib/integration-proof';
import type {MemoryJob} from '@/lib/memory-ledger';
import {principal} from '@/lib/auth';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { authorize, body, originGuard, rateLimit } from '@/lib/http';
import { db, listReceipts } from '@/lib/db';
import { memoryClient, namespaceFor, ProviderError, suiMetadata } from '@/lib/providers';
import {runSettlement} from '@/lib/settlement-worker';
export const runtime='nodejs';
export async function POST(request:Request) {
  const denied=authorize(request);if(denied)return denied;
  if(rateLimit())return Response.json({error:'Request budget reached. Retry in one minute.'},{status:429});
  try {
    const user=principal(request)!;
    if(user.role!=='operator'&&process.env.CALBOK_USER_PROVIDER_ACCESS!=='true')return Response.json({error:'Provider actions are not enabled for member accounts yet.'},{status:403});
    const input=z.object({action:z.enum(['sui','settle','remember','recall','reconcile']),id:z.string().max(80).optional()}).parse(await body(request));
    if(input.action==='sui') {
      const evidence=await suiMetadata();db().prepare('INSERT INTO onchain_evidence VALUES (?,?,?,?,?)').run(randomUUID(),'SUI',evidence.method,JSON.stringify(evidence),evidence.verifiedAt);
      return Response.json({message:'SUI coin identity verified through Tatum Mainnet RPC. This is metadata, not pricing.',evidence});
    }
    const receipt=listReceipts(user.id).find(r=>r.id===input.id);
    if(!receipt)return Response.json({error:'Receipt not found.'},{status:404});
    if(input.action==='settle') return Response.json(await runSettlement(receipt.id,{force:true}));
    if(input.action==='reconcile') {
      if(user.role!=='operator')return Response.json({error:'Owner access required.'},{status:403});
      const origin=originGuard(request,true);if(origin)return origin;
      const {status,...result}=await reconcileMemory(receipt);
      return Response.json(status>=400?{error:result.message}:result,{status});
    }
    if(input.action==='remember') {
      const {status,...result}=await rememberReceipt(receipt,user.id);
      return Response.json(status>=400?{error:result.message}:result,{status});
    }
    const namespace=namespaceFor(user.id==='operator'?receipt.caller:JSON.stringify([user.id,receipt.caller])),client=await memoryClient(namespace);
    const recalled=await client.recall({query:`caller=${receipt.caller}; asset=${receipt.asset}; horizon=${receipt.horizon}; direction=${receipt.direction}`,namespace,limit:20,maxDistance:0.5});
    proofSchema();
    const receipts = listReceipts(user.id);
    const ownedIds = new Set(receipts.map(row=>row.id));
    const jobs = (db().prepare('SELECT * FROM memory_jobs').all() as MemoryJob[]).filter(job=>ownedIds.has(job.prediction_id));
    const completions = db().prepare('SELECT * FROM memory_completion_proofs').all() as CompletionProof[];
    const completed = completedMemoryProofs(receipts,jobs,completions);
    const retrievedIds = recalled.results.flatMap(match=>{
      try {
        const id: unknown = JSON.parse(match.text)?.predictionId;
        return typeof id==='string' && completed.some(row=>row.prediction_id===id && row.blob_id===match.blob_id) ? [id] : [];
      } catch { return []; }
    });
    const review = recallComparison(receipt,receipts,completed,retrievedIds);
    recordRecall(receipt.id,user.id,{...review,retrievedIds:[...new Set(retrievedIds)]});
    return Response.json({message:'Context checked against verified receipts completed before this call was locked.',review});
  } catch(error) {return Response.json({error:error instanceof ProviderError?error.code:'Action unavailable. Check configuration or provider response; no success was recorded.'},{status:503});}
}
