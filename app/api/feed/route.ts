import {parseFeedQuery,publicFeed} from '@/lib/public-feed';
export const runtime='nodejs';
export async function GET(request:Request){
  try{return Response.json(publicFeed(parseFeedQuery(new URL(request.url).searchParams)),{headers:{'Cache-Control':'no-store'}});}
  catch{return Response.json({error:'Invalid feed filters or page.'},{status:400,headers:{'Cache-Control':'no-store'}});}
}
