import {createHmac,randomBytes,randomInt,randomUUID,timingSafeEqual} from 'node:crypto';
import {db,hash} from './db';
export type Principal={id:string;role:'operator'|'user';email:string|null};
export const SESSION_COOKIE='calbok_session';
export function authSchema() {
  const database = db();
  database.exec(`
    CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY,email TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,email TEXT,expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS login_codes(id TEXT PRIMARY KEY,email TEXT NOT NULL,code_hash TEXT NOT NULL,expires_at INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,used INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS login_limits(subject TEXT PRIMARY KEY,window_start INTEGER NOT NULL,count INTEGER NOT NULL);
  `);
  migrateAccountEmailIndex();
}

function migrateAccountEmailIndex() {
  const database = db();
  if (database.prepare("SELECT 1 FROM sqlite_schema WHERE name='accounts_member_email'").get()) return;
  database.exec('BEGIN IMMEDIATE');
  try {
    // The owner and an existing member can share an email while the member is promoted.
    if (database.prepare("SELECT 1 FROM pragma_index_list('accounts') WHERE origin='u'").get()) {
      database.exec(`
        ALTER TABLE accounts RENAME TO accounts_legacy;
        CREATE TABLE accounts(id TEXT PRIMARY KEY,email TEXT NOT NULL,created_at TEXT NOT NULL);
        INSERT INTO accounts SELECT id,email,created_at FROM accounts_legacy;
        DROP TABLE accounts_legacy;
      `);
    }
    database.exec("CREATE UNIQUE INDEX IF NOT EXISTS accounts_member_email ON accounts(email) WHERE id<>'operator'");
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
function equal(a: string, b: string): boolean {
  return Buffer.byteLength(a)===Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a),Buffer.from(b));
}

export function matchesOperator(value: string): boolean {
  const token = process.env.CALBOK_ADMIN_TOKEN;
  return !!token && equal(value,token);
}

export function sessionToken(request: Request): string | null {
  const prefix = SESSION_COOKIE+'=';
  const value = request.headers.get('cookie')?.split(';').map(part=>part.trim())
    .find(part=>part.startsWith(prefix))?.slice(prefix.length);
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}

function ownerEmail(): string | undefined {
  return process.env.CALBOK_OWNER_EMAIL?.trim().toLowerCase() || undefined;
}

type SessionRow = {user_id:string; email:string|null};

function readSession(request: Request): Principal | null {
  const token = sessionToken(request);
  if (!token) return null;
  authSchema();
  const row = db().prepare('SELECT user_id,email FROM sessions WHERE token_hash=? AND expires_at>?')
    .get(hash(token),Date.now()) as SessionRow | undefined;
  if (!row) return null;
  if (row.user_id === 'operator' && row.email !== null && row.email !== ownerEmail()) return null;
  return {id:row.user_id, role:row.user_id === 'operator' ? 'operator' : 'user', email:row.email};
}

export function principal(request: Request): Principal | null {
  if (process.env.NODE_ENV === 'production' && !process.env.CALBOK_ADMIN_TOKEN) return null;
  const authorization = request.headers.get('authorization')?.replace(/^Bearer /,'') ?? '';
  if (matchesOperator(authorization)) {
    return {id:'operator',role:'operator',email:null};
  }
  // App Router Request does not expose the TCP peer address.
  return readSession(request);
}
export function createSession(user: Principal, now = Date.now()): string {
  authSchema();
  const token = randomBytes(32).toString('hex');
  const database = db();
  database.prepare('DELETE FROM sessions WHERE expires_at<=?').run(now);
  database.prepare('INSERT INTO sessions VALUES (?,?,?,?)').run(hash(token),user.id,user.email,now+7*86400_000);
  return token;
}

export function revokeSession(request: Request) {
  const token = sessionToken(request);
  if (!token) return;
  authSchema();
  db().prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token));
}

export function cookie(value: string, request: Request, clear = false): string {
  const secure = (process.env.CALBOK_PUBLIC_ORIGIN||request.url).startsWith('https:');
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${clear?0:7*86400}${secure?'; Secure':''}`;
}

function signingKey() {
  return process.env.CALBOK_SESSION_SECRET || process.env.CALBOK_ADMIN_TOKEN;
}

export function emailSetupStatus() {
  const required=['RESEND_API_KEY','CALBOK_EMAIL_FROM','CALBOK_OWNER_EMAIL','CALBOK_SESSION_SECRET'] as const;
  const missing=required.filter(name=>!process.env[name]?.trim());
  const invalid:string[]=[];
  if(process.env.CALBOK_SESSION_SECRET && process.env.CALBOK_SESSION_SECRET.length<32)invalid.push('CALBOK_SESSION_SECRET');
  if(process.env.CALBOK_OWNER_EMAIL && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail()||''))invalid.push('CALBOK_OWNER_EMAIL');
  return {configured:missing.length===0&&invalid.length===0,missing,invalid};
}

export async function testOwnerEmail() {
  if(!emailSetupStatus().configured)throw new Error('Complete the four email settings before sending a test.');
  await requestCode(ownerEmail()!);
}

export function emailReady(): boolean {
  return !!(process.env.RESEND_API_KEY && process.env.CALBOK_EMAIL_FROM && ownerEmail() && (signingKey()?.length ?? 0)>=32);
}

export function emailAllowed(email: string): boolean {
  return email===ownerEmail() || process.env.CALBOK_PUBLIC_SIGNIN_ENABLED==='true';
}

function digest(id: string, code: string): string {
  const key = signingKey();
  if (!key || key.length<32) throw new Error('Email sign-in is not configured.');
  return createHmac('sha256',key).update(id+':'+code).digest('hex');
}

function budget(subject: string, limit: number, now: number): boolean {
  const database = db();
  const row = database.prepare('SELECT window_start,count FROM login_limits WHERE subject=?').get(subject) as {window_start:number;count:number} | undefined;
  if (!row || now-row.window_start>=3600_000) {
    database.prepare('INSERT OR REPLACE INTO login_limits VALUES (?,?,1)').run(subject,now);
    return true;
  }
  if (row.count>=limit) return false;
  database.prepare('UPDATE login_limits SET count=count+1 WHERE subject=?').run(subject);
  return true;
}

async function deliver(email: string, code: string): Promise<void> {
  const response = await fetch('https://api.resend.com/emails',{
    method:'POST',
    signal:AbortSignal.timeout(15_000),
    headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','User-Agent':'CALBOK/0.1'},
    body:JSON.stringify({
      from:process.env.CALBOK_EMAIL_FROM,to:[email],subject:'Your CALBOK sign-in code',
      text:`Your CALBOK sign-in code is ${code}. It expires in 10 minutes and works once. Do not share this code. If you did not request it, ignore this email.`
    })
  });
  if (!response.ok) throw new Error('Email delivery unavailable. Please try again later.');
}

function reserveLoginBudget(email: string, now: number) {
  const database = db();
  database.exec('BEGIN IMMEDIATE');
  try {
    if (!budget('email:'+hash(email),5,now) || !budget('global',50,now)) {
      throw new Error('Too many sign-in requests. Try again later.');
    }
    database.prepare('DELETE FROM login_codes WHERE expires_at<=?').run(now);
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

export async function requestCode(email: string, send = deliver, now = Date.now()): Promise<string> {
  authSchema();
  reserveLoginBudget(email,now);
  const id = randomUUID();
  if (!emailAllowed(email)) return id;
  const code = String(randomInt(0,100_000_000)).padStart(8,'0');
  const database = db();
  database.prepare('INSERT INTO login_codes(id,email,code_hash,expires_at) VALUES (?,?,?,?)')
    .run(id,email,digest(id,code),now+600_000);
  try {
    await send(email,code);
  } catch (error) {
    database.prepare('DELETE FROM login_codes WHERE id=?').run(id);
    throw error;
  }
  return id;
}

type LoginCode = {email:string; code_hash:string; expires_at:number; attempts:number; used:number};

function accountForEmail(email: string, now: number): Principal {
  const database = db();
  if (email === ownerEmail()) {
    database.prepare(`INSERT INTO accounts VALUES ('operator',?,?)
      ON CONFLICT(id) DO UPDATE SET email=excluded.email`).run(email,new Date(now).toISOString());
    return {id:'operator',role:'operator',email};
  }
  const existing = database.prepare("SELECT id FROM accounts WHERE email=? AND id<>'operator'").get(email);
  if (existing) return {id:String(existing.id),role:'user',email};

  const id = randomUUID();
  database.prepare('INSERT INTO accounts VALUES (?,?,?)').run(id,email,new Date(now).toISOString());
  return {id,role:'user',email};
}

function consumeCode(id: string, code: string, now: number): Principal | null {
  const database = db();
  const row = database.prepare('SELECT * FROM login_codes WHERE id=?').get(id) as LoginCode | undefined;
  if (!row || row.used || row.expires_at <= now || row.attempts >= 5 || !emailAllowed(row.email)) return null;
  database.prepare('UPDATE login_codes SET attempts=attempts+1 WHERE id=?').run(id);
  if (!equal(digest(id,code),row.code_hash)) return null;
  database.prepare('UPDATE login_codes SET used=1 WHERE id=?').run(id);
  return accountForEmail(row.email,now);
}

export function verifyCode(id: string, code: string, now = Date.now()): Principal | null {
  authSchema();
  const database = db();
  database.exec('BEGIN IMMEDIATE');
  try {
    const user = consumeCode(id,code,now);
    database.exec('COMMIT');
    return user;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
