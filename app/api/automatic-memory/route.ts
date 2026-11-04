import {z} from 'zod';
import {principal} from '@/lib/auth';
import {body, originGuard,rateLimit} from '@/lib/http';
import {automaticMemoryStatus, setAutomaticMemory,rememberAllSettled} from '@/lib/automatic-memory';

export const runtime = 'nodejs';
const headers = {'Cache-Control':'no-store'};
export async function GET(request: Request) {
  if (principal(request)?.role !== 'operator') return Response.json({error:'Owner access required.'},{status:403,headers});
  return Response.json(automaticMemoryStatus(),{headers});
}
export async function POST(request: Request) {
  const denied = originGuard(request,true);
  if (denied) return denied;
  if (principal(request)?.role !== 'operator') return Response.json({error:'Owner access required.'},{status:403,headers});
  try {
    const input=z.union([z.object({enabled:z.boolean()}).strict(),z.object({action:z.literal('remember-all')}).strict()]).parse(await body(request));
    if('action' in input){
      if(rateLimit())return Response.json({error:'Please wait a minute before trying again.'},{status:429,headers});
      const {status,message,...result}=rememberAllSettled(principal(request)!);
      return Response.json(status>=400?{error:message}:{message,...result},{status,headers});
    }
    const {enabled}=input;
    const status = automaticMemoryStatus();
    if (enabled && !status.available) return Response.json({error:'The settlement worker and Walrus Mainnet must be configured.'},{status:409,headers});
    setAutomaticMemory(enabled);
    return Response.json(automaticMemoryStatus(),{headers});
  } catch {
    return Response.json({error:'Could not update automatic memory.'},{status:400,headers});
  }
}
