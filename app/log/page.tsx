import {LogCall} from '@/components/log-call';
export const metadata={title:'Log a call — CALBOK'};
export default async function LogPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const params=await searchParams;const repeatId=typeof params.repeat==='string'&&/^CB-[a-zA-Z0-9-]{1,100}$/.test(params.repeat)?params.repeat:undefined;return <LogCall repeatId={repeatId} sameGroup={params.same==='1'}/>;}
