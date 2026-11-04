import {z} from 'zod';
import {authorize,originGuard,body} from '@/lib/http';
import {principal} from '@/lib/auth';
import {publishReceipt,hidePublicReceipt,PublicationError} from '@/lib/publication';
export const runtime='nodejs';
export async function POST(request:Request){
  const denied=originGuard(request,true)||authorize(request);if(denied)return denied;
  try{
    const input=z.object({id:z.string().regex(/^CB-[a-zA-Z0-9-]{1,100}$/),action:z.enum(['publish','hide']),confirmed:z.literal(true)}).strict().parse(await body(request));
    const actor=principal(request)!;
    if(input.action==='hide'&&(actor.id!=='operator'||actor.role!=='operator'))return Response.json({error:'Owner access required.'},{status:403});
    if(input.action==='publish')publishReceipt(input.id,actor);else hidePublicReceipt(input.id,actor);
    return Response.json({message:input.action==='publish'?'Receipt published. Publication cannot be undone.':'Public call hidden for abuse; its record and audit event are retained.'});
  }catch(error){return Response.json({error:error instanceof PublicationError?error.message:'Check the receipt and confirm the public action.'},{status:400});}
}
