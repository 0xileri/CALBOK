import {reserveUserBudget,UserLimitError} from '@/lib/user-limits';
import {reconcileMemory,rememberReceipt,resolveMemoryReview} from '@/lib/automatic-memory';
import {automaticRecall,recallReceipt} from '@/lib/receipt-recall';
import {principal} from '@/lib/auth';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { authorize, body, originGuard, rateLimit } from '@/lib/http';
import { db, listReceipts } from '@/lib/db';
import { ProviderError, suiMetadata } from '@/lib/providers';
import {runSettlement} from '@/lib/settlement-worker';
export const runtime='nodejs';
export async function POST(request:Request) {
  const denied=authorize(request);if(denied)return denied;
  if(rateLimit())return Response.json({error:'Request budget reached. Retry in one minute.'},{status:429});
  try {
    const user=principal(request)!;
    if(user.role!=='operator'&&process.env.CALBOK_USER_PROVIDER_ACCESS!=='true')return Response.json({error:'Provider actions are not enabled for member accounts yet.'},{status:403});
    const input=z.object({action:z.enum(['sui','settle','remember','recall','reconcile','resolve-memory']),id:z.string().max(80).optional(),decision:z.enum(['link','fail']).optional(),blobId:z.string().trim().min(1).max(256).optional()}).parse(await body(request));
    if(input.action==='sui') {
      reserveUserBudget(user.id,'provider-reads');
      const evidence=await suiMetadata();db().prepare('INSERT INTO onchain_evidence VALUES (?,?,?,?,?)').run(randomUUID(),'SUI',evidence.method,JSON.stringify(evidence),evidence.verifiedAt);
      return Response.json({message:'SUI coin identity verified through Tatum Mainnet RPC. This is metadata, not pricing.',evidence});
    }
    if (input.action==='resolve-memory' && user.role!=='operator') return Response.json({error:'Owner access required.'},{status:403});
    const receipt=listReceipts(user.id).find(r=>r.id===input.id);
    if(!receipt)return Response.json({error:'Receipt not found.'},{status:404});
    if(input.action==='settle') return Response.json(await runSettlement(receipt.id,{force:true}));
    if (input.action==='resolve-memory') {
      const origin=originGuard(request,true);if(origin)return origin;
      if (!input.decision || !input.blobId) return Response.json({error:'A decision and matching blob ID are required.'},{status:400});
      const {status,message}=resolveMemoryReview(receipt.id,input.decision,input.blobId,user);
      if (status<400 && db().prepare("SELECT 1 FROM memory_jobs WHERE prediction_id=? AND status='done' AND blob_id IS NOT NULL").get(receipt.id)) {
        await automaticRecall(user.id).catch(() => undefined);
      }
      return Response.json(status>=400?{error:message}:{message},{status});
    }
    if(input.action==='reconcile') {
      if(user.role!=='operator')return Response.json({error:'Owner access required.'},{status:403});
      const origin=originGuard(request,true);if(origin)return origin;
      const {status,...result}=await reconcileMemory(receipt);
      if (status<400 && db().prepare("SELECT 1 FROM memory_jobs WHERE prediction_id=? AND status='done' AND blob_id IS NOT NULL").get(receipt.id)) {
        await automaticRecall(user.id).catch(() => undefined);
      }
      return Response.json(status>=400?{error:result.message}:result,{status});
    }
    if(input.action==='remember') {
      const {status,...result}=await rememberReceipt(receipt,user.id);
      if (status<400 && db().prepare("SELECT 1 FROM memory_jobs WHERE prediction_id=? AND status='done' AND blob_id IS NOT NULL").get(receipt.id)) {
        await automaticRecall(user.id).catch(() => undefined);
      }
      return Response.json(status>=400?{error:result.message}:result,{status});
    }
    const review = await recallReceipt(receipt,user.id);
    return Response.json({message:'Context checked against verified receipts completed before this call was locked.',review});
  } catch(error) {if(error instanceof UserLimitError)return Response.json({error:error.message},{status:429});return Response.json({error:error instanceof ProviderError?error.code:'Action unavailable. Check configuration or provider response; no success was recorded.'},{status:503});}
}
