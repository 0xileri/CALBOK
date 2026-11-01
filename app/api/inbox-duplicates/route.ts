import {authorize,originGuard,body} from '@/lib/http';
import {principal} from '@/lib/auth';
import {inboxInput,findInboxDuplicates} from '@/lib/call-inbox';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};
export async function POST(request:Request){const origin=originGuard(request,true);if(origin)return origin;const denied=authorize(request);if(denied)return denied;try{const input=inboxInput.omit({requestId:true}).parse(await body(request));return Response.json({matches:findInboxDuplicates(principal(request)!.id,input.text,input.sourceUrl)},{headers});}catch{return Response.json({error:'Could not check for duplicates. Check the call text and HTTPS source, then try again.'},{status:400,headers});}}
