import {createHmac,randomBytes,randomInt,randomUUID,timingSafeEqual} from 'node:crypto';
import {db,hash} from './db';
export type Principal={id:string;role:'operator'|'user';email:string|null};
export const SESSION_COOKIE='calbok_session';
export function authSchema(){db().exec(`
  CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,email TEXT,expires_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS login_codes(id TEXT PRIMARY KEY,email TEXT NOT NULL,code_hash TEXT NOT NULL,expires_at INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,used INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS login_limits(subject TEXT PRIMARY KEY,window_start INTEGER NOT NULL,count INTEGER NOT NULL);
`);}
function equal(a:string,b:string){return Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));}
export function matchesOperator(value:string){const token=process.env.CALBOK_ADMIN_TOKEN;return !!token&&equal(value,token);}
export function sessionToken(request:Request){const value=request.headers.get('cookie')?.split(';').map(part=>part.trim()).find(part=>part.startsWith(SESSION_COOKIE+'='))?.slice(SESSION_COOKIE.length+1);return value&&/^[a-f0-9]{64}$/.test(value)?value:null;}
export function principal(request:Request):Principal|null {
  if(matchesOperator(request.headers.get('authorization')?.replace(/^Bearer /,'')||''))return {id:'operator',role:'operator',email:null};
  const token=sessionToken(request);
  if(token){authSchema();const row=db().prepare('SELECT user_id,email FROM sessions WHERE token_hash=? AND expires_at>?').get(hash(token),Date.now()) as {user_id:string;email:string|null}|undefined;if(row)return {id:row.user_id,role:row.user_id==='operator'?'operator':'user',email:row.email};}
  if(!process.env.CALBOK_ADMIN_TOKEN&&/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(request.headers.get('host')||''))return {id:'operator',role:'operator',email:null};
  return null;
}
export function createSession(user:Principal,now=Date.now()){authSchema();const token=randomBytes(32).toString('hex');db().prepare('DELETE FROM sessions WHERE expires_at<=?').run(now);db().prepare('INSERT INTO sessions VALUES (?,?,?,?)').run(hash(token),user.id,user.email,now+7*86400_000);return token;}
export function revokeSession(request:Request){const token=sessionToken(request);if(token){authSchema();db().prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token));}}
export function cookie(value:string,request:Request,clear=false){const secure=(process.env.CALBOK_PUBLIC_ORIGIN||request.url).startsWith('https:');return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${clear?0:7*86400}${secure?'; Secure':''}`;}
export function emailReady(){return !!(process.env.RESEND_API_KEY&&process.env.CALBOK_EMAIL_FROM&&process.env.CALBOK_OWNER_EMAIL&&(process.env.CALBOK_SESSION_SECRET||process.env.CALBOK_ADMIN_TOKEN||'').length>=32);}
export function emailAllowed(email:string){return email===process.env.CALBOK_OWNER_EMAIL?.trim().toLowerCase()||process.env.CALBOK_PUBLIC_SIGNIN_ENABLED==='true';}
function digest(id:string,code:string){const key=process.env.CALBOK_SESSION_SECRET||process.env.CALBOK_ADMIN_TOKEN;if(!key||key.length<32)throw new Error('Email sign-in is not configured.');return createHmac('sha256',key).update(id+':'+code).digest('hex');}
function budget(subject:string,limit:number,now:number){const database=db();const row=database.prepare('SELECT window_start,count FROM login_limits WHERE subject=?').get(subject) as {window_start:number;count:number}|undefined;if(!row||now-row.window_start>=3600_000){database.prepare('INSERT OR REPLACE INTO login_limits VALUES (?,?,1)').run(subject,now);return true;}if(row.count>=limit)return false;database.prepare('UPDATE login_limits SET count=count+1 WHERE subject=?').run(subject);return true;}
async function deliver(email:string,code:string){const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(15_000),headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','User-Agent':'CALBOK/0.1'},body:JSON.stringify({from:process.env.CALBOK_EMAIL_FROM,to:[email],subject:'Your CALBOK sign-in code',text:`Your CALBOK sign-in code is ${code}. It expires in 10 minutes and works once. Do not share this code. If you did not request it, ignore this email.`})});if(!response.ok)throw new Error('Email delivery unavailable. Please try again later.');}
export async function requestCode(email:string,send=deliver,now=Date.now()){
  authSchema();const database=db();
  database.exec('BEGIN IMMEDIATE');
  try {if(!budget('email:'+hash(email),5,now)||!budget('global',50,now))throw new Error('Too many sign-in requests. Try again later.');database.prepare('DELETE FROM login_codes WHERE expires_at<=?').run(now);database.exec('COMMIT');}catch(error){database.exec('ROLLBACK');throw error;}
  const id=randomUUID();if(!emailAllowed(email))return id;
  const code=String(randomInt(0,100_000_000)).padStart(8,'0');database.prepare('INSERT INTO login_codes(id,email,code_hash,expires_at) VALUES (?,?,?,?)').run(id,email,digest(id,code),now+600_000);
  try{await send(email,code);}catch(error){database.prepare('DELETE FROM login_codes WHERE id=?').run(id);throw error;}
  return id;
}
export function verifyCode(id:string,code:string,now=Date.now()):Principal|null {
  authSchema();const database=db();database.exec('BEGIN IMMEDIATE');
  try {const row=database.prepare('SELECT * FROM login_codes WHERE id=?').get(id) as {email:string;code_hash:string;expires_at:number;attempts:number;used:number}|undefined;
    if(!row||row.used||row.expires_at<=now||row.attempts>=5||!emailAllowed(row.email)){database.exec('COMMIT');return null;}
    database.prepare('UPDATE login_codes SET attempts=attempts+1 WHERE id=?').run(id);
    if(!equal(digest(id,code),row.code_hash)){database.exec('COMMIT');return null;}
    database.prepare('UPDATE login_codes SET used=1 WHERE id=?').run(id);
    let account=database.prepare('SELECT id FROM accounts WHERE email=?').get(row.email) as {id:string}|undefined;
    if(!account){account={id:row.email===process.env.CALBOK_OWNER_EMAIL?.trim().toLowerCase()?'operator':randomUUID()};database.prepare('INSERT INTO accounts VALUES (?,?,?)').run(account.id,row.email,new Date(now).toISOString());}
    database.exec('COMMIT');return {id:account.id,role:account.id==='operator'?'operator':'user',email:row.email};
  }catch(error){database.exec('ROLLBACK');throw error;}
}
