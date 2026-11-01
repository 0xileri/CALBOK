import {recordMemoryCompletion,recordRecall} from '@/lib/integration-proof-store';
import {profileOutcome} from '@/lib/caller-profiles';
import {principal} from '@/lib/auth';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { authorize, body, rateLimit } from '@/lib/http';
import { db, listReceipts } from '@/lib/db';
import { warning } from '@/lib/domain';
import { memoryClient, namespaceFor, ProviderError, suiMetadata } from '@/lib/providers';
import {runSettlement} from '@/lib/settlement-worker';
export const runtime='nodejs';
export async function POST(request:Request) {
  const denied=authorize(request);if(denied)return denied;
  if(rateLimit())return Response.json({error:'Request budget reached. Retry in one minute.'},{status:429});
  try {
    const user=principal(request)!;
    if(user.role!=='operator'&&process.env.CALBOK_USER_PROVIDER_ACCESS!=='true')return Response.json({error:'Provider actions are not enabled for member accounts yet.'},{status:403});
    const input=z.object({action:z.enum(['sui','settle','remember','recall']),id:z.string().max(80).optional()}).parse(await body(request));
    if(input.action==='sui') {
      const evidence=await suiMetadata();db().prepare('INSERT INTO onchain_evidence VALUES (?,?,?,?,?)').run(randomUUID(),'SUI',evidence.method,JSON.stringify(evidence),evidence.verifiedAt);
      return Response.json({message:'SUI coin identity verified through Tatum Mainnet RPC. This is metadata, not pricing.',evidence});
    }
    const receipt=listReceipts(user.id).find(r=>r.id===input.id);
    if(!receipt)return Response.json({error:'Receipt not found.'},{status:404});
    if(input.action==='settle') return Response.json(await runSettlement(receipt.id,{force:true}));
    const namespace=namespaceFor(user.id==='operator'?receipt.caller:JSON.stringify([user.id,receipt.caller])),client=await memoryClient(namespace);
    if(input.action==='remember') {
      if(!['won','lost','neutral'].includes(receipt.outcome || ''))return Response.json({error:'A verified settled receipt is required.'},{status:409});
      const existing=db().prepare('SELECT * FROM memory_jobs WHERE prediction_id=?').get(receipt.id) as {status:string;job_id:string|null}|undefined;
      if(existing?.status==='done')return Response.json({message:'Memory already completed.'});
      if(existing && !existing.job_id)return Response.json({error:'Write acceptance is uncertain. Reconcile with the provider before retrying.'},{status:409});
      let jobId=existing?.job_id;
      if(!jobId) {
        // Reserve before network I/O: uncertainty never triggers duplicate writes.
        db().prepare('INSERT INTO memory_jobs (prediction_id,namespace,status) VALUES (?,?,?)').run(receipt.id,namespace,'queued');
        const job=await client.remember(JSON.stringify({predictionId:receipt.id,caller:receipt.caller,asset:receipt.asset,horizon:receipt.horizon,direction:receipt.direction,outcome:receipt.outcome,sampleCaveat:'One observation; not predictive certainty.'}));
        jobId=job.job_id;db().prepare('UPDATE memory_jobs SET status=?,job_id=? WHERE prediction_id=?').run('running',jobId,receipt.id);
      }
      try {
        const result=await client.waitForRememberJob(jobId,{timeoutMs:20_000});
        if(!result.blob_id)throw new ProviderError('MEMORY_BLOB_UNCONFIRMED');
        recordMemoryCompletion(receipt.id,jobId,result.blob_id);
        return Response.json({message:'Durable memory completion confirmed.',blobId:result.blob_id});
      } catch {db().prepare('UPDATE memory_jobs SET error=? WHERE prediction_id=?').run('Completion not confirmed; retry status check.',receipt.id);return Response.json({message:'Memory pending or failed. Completion has not been confirmed.'},{status:202});}
    }
    const recalled=await client.recall({query:`caller=${receipt.caller}; asset=${receipt.asset}; horizon=${receipt.horizon}; direction=${receipt.direction}`,namespace,limit:20,maxDistance:0.5});
    const ids=recalled.results.flatMap(match=>{try {const parsed=JSON.parse(match.text);return typeof parsed.predictionId==='string'?[parsed.predictionId]:[];}catch{return [];}});
    const history=listReceipts(user.id).map(r=>({id:r.id,caller:r.caller,asset:r.asset,direction:r.direction,horizon:r.horizon,outcome:r.outcome||'pending',verified:['won','lost'].includes(profileOutcome(r))}));
    const review=warning(receipt,history,ids);recordRecall(receipt.id,user.id,review);
    return Response.json({message:'Contextual recall complete. Only SQL-confirmed matching outcomes are counted.',review});
  } catch(error) {return Response.json({error:error instanceof ProviderError?error.code:'Action unavailable. Check configuration or provider response; no success was recorded.'},{status:503});}
}
