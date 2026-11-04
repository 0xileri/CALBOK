import {notFound} from 'next/navigation';
import {parseFeedQuery,publicCaller} from '@/lib/public-feed';
import {PublicFeedView} from '@/components/public-feed';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const metadata={title:'CALBOK — Public caller record'};
export default async function CallerPage({params,searchParams}:{params:Promise<{handle:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const {handle}=await params,search=new URLSearchParams();for(const [key,value] of Object.entries(await searchParams))if(typeof value==='string')search.set(key,value);
  const parsed=(()=>{try{return parseFeedQuery(search);}catch{return null;}})();
  if(!parsed)return <main className="public-feed-page"><h1>Invalid caller filters or page.</h1></main>;
  const caller=publicCaller(handle,parsed);if(!caller)notFound();
  return <PublicFeedView feed={caller} query={parsed} caller={caller}/>;
}
