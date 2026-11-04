import {isIP} from 'node:net';
import {db,hash} from './db';

/** Railway's public ingress supplies X-Real-IP. Other deployments must explicitly trust their proxy. */
export function signInIpLimited(request:Request,now=Date.now()){
  const trusted=!!process.env.RAILWAY_PROJECT_ID||process.env.CALBOK_TRUST_PROXY==='true';
  const address=trusted?request.headers.get('x-real-ip')?.trim():undefined;
  const subject=hash(address&&isIP(address)?address:'unavailable-shared'),start=Math.floor(now/900_000)*900_000;
  const database=db();
  database.exec('CREATE TABLE IF NOT EXISTS signin_ip_limits(subject TEXT NOT NULL,window_start INTEGER NOT NULL,count INTEGER NOT NULL,PRIMARY KEY(subject,window_start))');
  database.prepare('DELETE FROM signin_ip_limits WHERE window_start<?').run(start-900_000);
  const updated=database.prepare(`INSERT INTO signin_ip_limits VALUES (?,?,1)
    ON CONFLICT(subject,window_start) DO UPDATE SET count=count+1 WHERE count<30`).run(subject,start);
  return !updated.changes;
}
