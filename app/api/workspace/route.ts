import { authorize, body, rateLimit } from '@/lib/http';
import { capture, db, listReceipts,knownAsset } from '@/lib/db';
import {parseGmgnAssetId} from '@/lib/assets';
import { claimSchema } from '@/lib/domain';
import { configuration } from '@/lib/providers';
export const runtime='nodejs';
export async function GET(request:Request) {
  const denied=authorize(request);if(denied)return denied;
  return Response.json({receipts:listReceipts(),memoryJobs:db().prepare('SELECT * FROM memory_jobs').all(),onchain:db().prepare('SELECT * FROM onchain_evidence').all(),providers:configuration()},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:Request) {
  const denied=authorize(request);if(denied)return denied;
  if(rateLimit())return Response.json({error:'Please wait a minute before trying again.'},{status:429});
  try {
    const parsed=claimSchema.safeParse(await body(request));
    if(!parsed.success)return Response.json({error:parsed.error.issues.map(i=>i.message).join(' ')},{status:400});
    if(parseGmgnAssetId(parsed.data.asset)&&!knownAsset(parsed.data.asset))return Response.json({error:'Search for and select this GMGN token first so its identity can be preserved.'},{status:400});
    const id=capture(parsed.data);return Response.json({id},{status:201});
  } catch(error) {
    const duplicate=error instanceof Error && error.message.includes('UNIQUE');
    return Response.json({error:duplicate?'This call is already locked.':'Could not lock this call. Check the input and try again.'},{status:duplicate?409:400});
  }
}
