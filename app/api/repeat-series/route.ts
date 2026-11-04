import {z} from 'zod';
import {principal} from '@/lib/auth';
import {body,originGuard,rateLimit} from '@/lib/http';
import {repeatSeriesProgress,startRepeatSeries,stopRepeatSeries} from '@/lib/repeat-series';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};
function denied(request:Request){const actor=principal(request);return actor?.id==='operator'&&actor.role==='operator'?null:Response.json({error:'Owner access required.'},{status:403,headers});}
export async function GET(request:Request){const blocked=denied(request);if(blocked)return blocked;return Response.json({series:repeatSeriesProgress(principal(request)!)},{headers});}
export async function POST(request:Request){
 const blocked=originGuard(request,true)||denied(request);if(blocked)return blocked;
 if(rateLimit())return Response.json({error:'Please wait a minute before trying again.'},{status:429,headers});
 try{
  const input=z.discriminatedUnion('action',[
   z.object({action:z.literal('start'),seedId:z.string().regex(/^CB-[a-zA-Z0-9-]{1,100}$/),count:z.number().int().min(1).max(10),requestId:z.uuid(),confirmed:z.literal(true)}).strict(),
   z.object({action:z.literal('stop'),id:z.string().regex(/^RS-[a-f0-9-]{36}$/)}).strict()
  ]).parse(await body(request));
  const result=input.action==='start'?startRepeatSeries(principal(request)!,input.seedId,input.count,input.requestId):stopRepeatSeries(principal(request)!,input.id);
  const {status,message,...rest}=result;return Response.json(status>=400?{error:message}:{message,...rest},{status,headers});
 }catch{return Response.json({error:'Could not update the series. Check the confirmation and count (1–10).'},{status:400,headers});}
}
