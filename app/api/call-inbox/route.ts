import {authorize,originGuard,body,rateLimit} from '@/lib/http';
import {principal} from '@/lib/auth';
import {inboxInput,listInbox,logInbox,parseInboxCursor} from '@/lib/call-inbox';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};
export async function GET(request:Request){const denied=authorize(request);if(denied)return denied;try{return Response.json(listInbox(principal(request)!.id,parseInboxCursor(new URL(request.url).searchParams.get('before'))),{headers});}catch{return Response.json({error:'Invalid inbox page. Reload your inbox to start again.'},{status:400,headers});}}
export async function POST(request:Request){const origin=originGuard(request,true);if(origin)return origin;const denied=authorize(request);if(denied)return denied;if(rateLimit())return Response.json({error:'Please wait a minute before trying again.'},{status:429,headers});try{const input=inboxInput.parse(await body(request));return Response.json({call:logInbox(principal(request)!.id,input)},{status:201,headers});}catch(error){const conflict=error instanceof Error&&error.message==='INBOX_CONFLICT';return Response.json({error:conflict?'This request was already saved with different text. Close and reopen Log a call for a new entry.':'Could not save the call. Add its text (up to 2,000 characters) and use an HTTPS source link.'},{status:conflict?409:400,headers});}}
