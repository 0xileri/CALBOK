import {z} from 'zod';
import {publicHomeData} from '@/lib/public-feed';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
  try{
    const {limit}=z.object({limit:z.coerce.number().int().min(1).max(24).default(24)}).strict().parse(Object.fromEntries(new URL(request.url).searchParams));
    return Response.json(publicHomeData(limit),{headers:{'Cache-Control':'public, max-age=45, s-maxage=45'}});
  }catch{return Response.json({error:'Choose a limit between 1 and 24.'},{status:400,headers:{'Cache-Control':'no-store'}});}
}
