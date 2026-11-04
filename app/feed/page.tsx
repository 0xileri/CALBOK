import {parseFeedQuery,publicFeed} from '@/lib/public-feed';
import {PublicFeedView} from '@/components/public-feed';
import Link from 'next/link';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const metadata={title:'CALBOK — Live calls'};
export default async function FeedPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const params=new URLSearchParams();for(const [key,value] of Object.entries(await searchParams))if(typeof value==='string')params.set(key,value);
  const query=(()=>{try{return parseFeedQuery(params);}catch{return null;}})();
  if(!query)return <main className="public-feed-page"><h1>Invalid feed filters or page.</h1><Link href="/feed">Reset filters</Link></main>;
  return <PublicFeedView feed={publicFeed(query)} query={query}/>;
}
