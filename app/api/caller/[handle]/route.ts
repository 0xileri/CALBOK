import {parseFeedQuery,publicCaller} from '@/lib/public-feed';
export const runtime='nodejs';
export async function GET(request:Request,{params}:{params:Promise<{handle:string}>}){
  try{
    const {handle}=await params,result=publicCaller(handle,parseFeedQuery(new URL(request.url).searchParams));
    return Response.json(result||{error:'Public caller not found.'},{status:result?200:404,headers:{'Cache-Control':'no-store'}});
  }catch{return Response.json({error:'Invalid caller filters or page.'},{status:400,headers:{'Cache-Control':'no-store'}});}
}
