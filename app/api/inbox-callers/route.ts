import {authorize} from '@/lib/http';
import {principal} from '@/lib/auth';
import {inboxCallerGroups,listInbox,parseInboxCursor} from '@/lib/call-inbox';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};
export async function GET(request:Request){const denied=authorize(request);if(denied)return denied;try{const params=new URL(request.url).searchParams,caller=params.get('caller');if(caller!==null&&caller.length>60)throw new Error('Invalid caller');return Response.json(caller===null?{callers:inboxCallerGroups(principal(request)!.id)}:listInbox(principal(request)!.id,parseInboxCursor(params.get('before')),caller),{headers});}catch{return Response.json({error:'Could not load captured caller history.'},{status:400,headers});}}
