import {z} from 'zod';
import {body,originGuard} from '@/lib/http';
import {sessionSnapshot,revokeOtherSessions} from '@/lib/account-sessions';
export const runtime='nodejs';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const missing=()=>reply({error:'Sign in with email or owner access to manage browser sessions.'},401);
export async function GET(request:Request){const denied=originGuard(request);if(denied)return denied;const snapshot=sessionSnapshot(request);return snapshot?reply(snapshot):missing();}
export async function POST(request:Request){
  const denied=originGuard(request,true);if(denied)return denied;
  if(!sessionSnapshot(request))return missing();
  try {z.object({action:z.literal('revoke_others')}).strict().parse(await body(request));const count=revokeOtherSessions(request),snapshot=sessionSnapshot(request);return count===null||!snapshot?missing():reply({revoked:count,...snapshot});}
  catch{return reply({error:'Could not sign out other sessions. Refresh and try again.'},400);}
}
