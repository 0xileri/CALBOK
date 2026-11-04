import {notFound} from 'next/navigation';
import {publicCallById} from '@/lib/public-feed';
import {CallDetail} from '@/components/call-detail';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const metadata={title:'Call — CALBOK'};
export default async function CallPage({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!/^CB-[a-zA-Z0-9-]{1,100}$/.test(id))notFound();return <CallDetail key={id} id={id} publicCall={publicCallById(id)}/>;}
