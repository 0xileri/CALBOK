import {headers} from 'next/headers';
import {isOwnerRequest} from '@/lib/admin-access';
import {AdminGate} from '@/components/admin-gate';
import {AdminWorkspace} from '@/components/admin-workspace';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const metadata={title:'Admin — CALBOK'};
export default async function AdminPage(){const request=new Request((process.env.CALBOK_PUBLIC_ORIGIN||'http://localhost:3000')+'/admin',{headers:await headers()});return isOwnerRequest(request)?<AdminWorkspace/>:<AdminGate/>;}
