import {z} from 'zod';
import {authorize,originGuard,body} from '@/lib/http';
import {principal} from '@/lib/auth';
import {draftFields,readDraft,saveDraft} from '@/lib/call-drafts';
export const runtime='nodejs';
export async function GET(request:Request){const denied=authorize(request);if(denied)return denied;return Response.json(readDraft(principal(request)!.id),{headers:{'Cache-Control':'no-store'}});}
export async function PUT(request:Request){const origin=originGuard(request,true);if(origin)return origin;const denied=authorize(request);if(denied)return denied;
  try {const input=z.object({fields:draftFields,version:z.number().int().min(0)}).strict().parse(await body(request));return Response.json(saveDraft(principal(request)!.id,input.fields,input.version),{headers:{'Cache-Control':'no-store'}});}
  catch(error){const conflict=error instanceof Error&&error.message==='DRAFT_CONFLICT';return Response.json({error:conflict?'This draft changed in another browser. Copy your unsaved text before closing and reopening Log a call.':'Could not save draft. Check the field lengths and selected market.'},{status:conflict?409:400});}
}
