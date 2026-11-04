import {entryPriceSchema} from '@/lib/entry-price';
import {proofSchema} from '@/lib/integration-proof-store';
import {automaticRecall} from '@/lib/receipt-recall';
import {z} from 'zod';
import {principal} from '@/lib/auth';
import { authorize, body, rateLimit } from '@/lib/http';
import { capture, db, listReceipts,knownAsset } from '@/lib/db';
import {parseGmgnAssetId} from '@/lib/assets';
import {settlementStatus} from '@/lib/settlement-worker';
import { claimSchema } from '@/lib/domain';
import { configuration } from '@/lib/providers';
export const runtime='nodejs';
export async function GET(request:Request) {
  const denied=authorize(request);if(denied)return denied;
  const user=principal(request)!,receipts=listReceipts(user.id),ids=new Set(receipts.map(row=>row.id));
  proofSchema();
  entryPriceSchema();
  const entryPrices=db().prepare("SELECT e.* FROM entry_prices e JOIN prediction_owners o ON o.prediction_id=e.prediction_id WHERE o.owner_id=?").all(user.id);
  const recallReviews = Object.fromEntries(db().prepare('SELECT prediction_id,review FROM recall_proofs WHERE owner_id=? ORDER BY created_at,rowid').all(user.id).flatMap(row => {
    try { return [[String(row.prediction_id),JSON.parse(String(row.review))]]; } catch { return []; }
  }));
  const status=settlementStatus();status.jobs=status.jobs.filter(job=>ids.has(job.prediction_id));
  return Response.json({receipts,entryPrices,recallReviews,settlement:status,memoryJobs:db().prepare("SELECT m.* FROM memory_jobs m JOIN predictions p ON p.id=m.prediction_id LEFT JOIN prediction_owners o ON o.prediction_id=p.id WHERE COALESCE(o.owner_id,'operator')=?").all(user.id),onchain:user.role==='operator'?db().prepare('SELECT * FROM onchain_evidence').all():[],providers:configuration()},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:Request) {
  const denied=authorize(request);if(denied)return denied;
  if(rateLimit())return Response.json({error:'Please wait a minute before trying again.'},{status:429});
  try {
    const input=await body(request),parsed=claimSchema.safeParse(input);
    const {draftVersion,inboxId}=z.object({draftVersion:z.number().int().positive().optional(),inboxId:z.string().regex(/^LOG-[a-zA-Z0-9-]{1,100}$/).optional()}).parse(input);
    if(!parsed.success)return Response.json({error:parsed.error.issues.map(i=>i.message).join(' ')},{status:400});
    if(parseGmgnAssetId(parsed.data.asset)&&!knownAsset(parsed.data.asset))return Response.json({error:'Search for and select this GMGN token first so its identity can be preserved.'},{status:400});
    const owner = principal(request)!.id;
    const id = capture(parsed.data,owner,draftVersion,inboxId);
    const review = await automaticRecall(owner,id).catch(() => undefined);
    return Response.json({id,review},{status:201});
  } catch(error) {
    const duplicate=error instanceof Error && error.message.includes('UNIQUE');
    return Response.json({error:duplicate?'This call is already locked.':'Could not lock this call. Check the input and try again.'},{status:duplicate?409:400});
  }
}
