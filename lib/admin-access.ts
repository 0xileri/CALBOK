import {principal} from './auth';
export function isOwnerRequest(request:Request){const user=principal(request);return user?.role==='operator'&&user.id==='operator';}
