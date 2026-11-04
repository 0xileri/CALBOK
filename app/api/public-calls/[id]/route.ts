import {publicCallById} from '@/lib/public-feed';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params,call=/^CB-[a-zA-Z0-9-]{1,100}$/.test(id)?publicCallById(id):null;
  return Response.json(call?{call}:{error:'Call not found.'},{status:call?200:404,headers:{'Cache-Control':'no-store'}});
}
