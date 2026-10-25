import {authSchema,sessionToken} from './auth';
import {db,hash} from './db';
function currentSession(request:Request,now:number){const token=sessionToken(request);if(!token)return null;authSchema();const tokenHash=hash(token);const row=db().prepare('SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>?').get(tokenHash,now) as {user_id:string}|undefined;return row?{userId:row.user_id,tokenHash}:null;}
export function sessionSnapshot(request:Request,now=Date.now()) {
  const current=currentSession(request,now);if(!current)return null;
  const database=db(),total=Number(database.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id=? AND expires_at>?').get(current.userId,now)?.n||0);
  const rows=database.prepare('SELECT token_hash,expires_at FROM sessions WHERE user_id=? AND expires_at>? ORDER BY (token_hash=?) DESC,expires_at DESC LIMIT 20').all(current.userId,now,current.tokenHash) as {token_hash:string;expires_at:number}[];
  return {total,otherCount:Math.max(0,total-1),sessions:rows.map(row=>({current:row.token_hash===current.tokenHash,expiresAt:new Date(row.expires_at).toISOString()}))};
}
export function revokeOtherSessions(request:Request,now=Date.now()) {
  authSchema();const database=db();database.exec('BEGIN IMMEDIATE');
  try {const current=currentSession(request,now);if(!current){database.exec('COMMIT');return null;}
    const count=Number(database.prepare('DELETE FROM sessions WHERE user_id=? AND token_hash<>? AND expires_at>?').run(current.userId,current.tokenHash,now).changes);
    database.exec('COMMIT');return count;
  }catch(error){database.exec('ROLLBACK');throw error;}
}
