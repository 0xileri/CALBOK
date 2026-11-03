import {randomUUID} from 'node:crypto';
import {db, listReceipts, type Receipt} from './db';
import {configuration, memoryClient, namespaceFor} from './providers';
import {profileOutcome} from './caller-profiles';
import {recordMemoryCompletion} from './integration-proof-store';

const automaticLimit = 10;
type MemoryClient = Pick<Awaited<ReturnType<typeof memoryClient>>, 'remember'|'waitForRememberJob'|'getRememberStatus'|'recall'|'listMemories'>;
type ClientFactory = (namespace: string) => Promise<MemoryClient>;
function automaticSchema() {
  db().exec(`CREATE TABLE IF NOT EXISTS automatic_memory_setting (id INTEGER PRIMARY KEY CHECK(id=1), enabled INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS automatic_memory_attempts (prediction_id TEXT PRIMARY KEY REFERENCES predictions(id), checked_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS automatic_memory_poll (prediction_id TEXT PRIMARY KEY REFERENCES predictions(id), attempts INTEGER NOT NULL, due_at TEXT NOT NULL);`);
}
export function automaticMemoryStatus() {
  automaticSchema();
  const setting = db().prepare('SELECT enabled FROM automatic_memory_setting WHERE id=1').get();
  const used = Number(db().prepare('SELECT COUNT(*) AS count FROM automatic_memory_attempts').get()?.count);
  return {enabled: setting?.enabled === 1, used, limit: automaticLimit, available: configuration().walrus && configuration().mainnet && process.env.CALBOK_WORKER_ENABLED === 'true'};
}
export function setAutomaticMemory(enabled: boolean) {
  db().prepare('INSERT INTO automatic_memory_setting VALUES (1,?) ON CONFLICT(id) DO UPDATE SET enabled=excluded.enabled').run(Number(enabled));
}
export async function rememberReceipt(receipt: Receipt, owner: string, automatic = false, getClient: ClientFactory = memoryClient) {
  if (!['won','lost','neutral'].includes(profileOutcome(receipt))) {
    return {status:409, message:'A verified settled receipt is required.'};
  }
  const database = db();
  const namespace = namespaceFor(owner === 'operator' ? receipt.caller : JSON.stringify([owner, receipt.caller]));
  const existing = database.prepare('SELECT status,job_id FROM memory_jobs WHERE prediction_id=?').get(receipt.id);
  if (existing?.status === 'done') return {status:200, message:'Memory already completed.'};
  if (existing && !existing.job_id && existing.status !== 'retryable') return {status:409, message:'Write acceptance is uncertain. Reconcile with the provider before retrying.'};
  const client = await getClient(namespace);
  let jobId = existing?.job_id as string | undefined;
  if (!jobId) {
    database.exec('BEGIN IMMEDIATE');
    try {
      if (automatic) {
        const settings = automaticMemoryStatus();
        if (!settings.enabled || settings.used >= settings.limit) {
          database.exec('ROLLBACK');
          return {status:409, message:'Automatic memory is paused or its write limit was reached.'};
        }
      }
      const reserved = database.prepare(`INSERT INTO memory_jobs (prediction_id,namespace,status) VALUES (?,?,'queued')
        ON CONFLICT(prediction_id) DO UPDATE SET status='queued',job_id=NULL,blob_id=NULL,error=NULL,completed_at=NULL
        WHERE memory_jobs.status='retryable'`).run(receipt.id,namespace);
      if (!reserved.changes) {
        database.exec('ROLLBACK');
        return {status:409, message:'A memory job already exists. Check its status.'};
      }
      if (automatic) {
        database.prepare('INSERT INTO automatic_memory_attempts VALUES (?,?)').run(receipt.id,new Date().toISOString());
        database.prepare('DELETE FROM automatic_memory_poll WHERE prediction_id=?').run(receipt.id);
      }
      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
    try {
      const text = memoryText(receipt);
      const job = existing?.status==='retryable'
        ? await client.remember(text,{idempotencyKey:randomUUID()})
        : await client.remember(text);
      if (typeof job.job_id !== 'string' || !job.job_id.trim()) throw new Error('Missing provider job ID');
      jobId = job.job_id;
      const linked = database.prepare("UPDATE memory_jobs SET status='running',job_id=? WHERE prediction_id=? AND status='queued' AND job_id IS NULL")
        .run(jobId,receipt.id);
      if (!linked.changes) return {status:200,message:'Memory job was reconciled while submission was in progress.'};
      if (automatic) return {status:202, message:'Memory job accepted. Confirmation is pending.'};
    } catch (error) {
      return recordSubmissionFailure(receipt.id,error,automatic);
    }
  }
  try {
    const result = automatic ? await client.getRememberStatus(jobId) : await client.waitForRememberJob(jobId,{timeoutMs:20_000});
    if (result.job_id && result.job_id !== jobId) throw new Error('Provider returned a different job ID');
    if ('status' in result && result.status !== 'done') {
      if (result.status === 'failed' || result.status === 'not_found') {
        database.prepare("UPDATE memory_jobs SET status='failed',error=? WHERE prediction_id=? AND job_id=? AND status<>'done'").run('Provider could not confirm this job. Inspect the existing job before retrying.',receipt.id,jobId);
      }
      return {status:202, message:'Memory completion has not been confirmed.'};
    }
    if (!result.blob_id) throw new Error('Missing blob');
    const current = database.prepare('SELECT status FROM memory_jobs WHERE prediction_id=?').get(receipt.id);
    if (current?.status !== 'done') recordMemoryCompletion(receipt.id,jobId,result.blob_id);
    return {status:200, message:'Durable memory completion confirmed.',blobId:result.blob_id};
  } catch {
    database.prepare("UPDATE memory_jobs SET error=? WHERE prediction_id=? AND job_id=? AND status<>'done'").run('Completion not confirmed; retry status check.',receipt.id,jobId);
    return {status:202, message:'Memory completion is pending or could not be confirmed.'};
  }
}

function memoryText(receipt: Receipt) {
  return JSON.stringify({predictionId:receipt.id,caller:receipt.caller,asset:receipt.asset,horizon:receipt.horizon,direction:receipt.direction,outcome:receipt.outcome,sampleCaveat:'One observation; limited sample.'});
}

export function definitelyNotSent(error: unknown): boolean {
  // Only an explicit failed connect proves the HTTP request was never sent.
  const cause = error instanceof TypeError ? error.cause : error;
  if (!(cause instanceof Error)) return false;
  const detail = cause as NodeJS.ErrnoException;
  return detail.code === 'ECONNREFUSED' && detail.syscall === 'connect';
}

function recordSubmissionFailure(id: string, error: unknown, automatic: boolean) {
  const retryable = definitelyNotSent(error);
  const message = retryable
    ? 'Connection refused before submission. Retry is available.'
    : 'Submission failed without a job ID. Acceptance is uncertain. Reconcile before retrying.';
  const database = db();
  database.exec('BEGIN IMMEDIATE');
  try {
    const updated = database.prepare("UPDATE memory_jobs SET status=?,error=? WHERE prediction_id=? AND job_id IS NULL AND status='queued'")
      .run(retryable?'retryable':'uncertain',message,id);
    if (updated.changes && automatic && retryable) database.prepare('DELETE FROM automatic_memory_attempts WHERE prediction_id=?').run(id);
    database.exec('COMMIT');
  } catch (failure) {
    database.exec('ROLLBACK');
    throw failure;
  }
  return {status:retryable?503:409,message};
}

export async function reconcileMemory(receipt: Receipt, getClient: ClientFactory = memoryClient) {
  const database = db();
  const row = database.prepare('SELECT status,namespace,job_id FROM memory_jobs WHERE prediction_id=?').get(receipt.id);
  if (!row) return {status:404,message:'No memory job to reconcile.'};
  if (row.status === 'done' || row.status === 'retryable') return {status:200,message:row.status==='done'?'Memory already completed.':'Retry is available.'};
  const namespace = String(row.namespace);
  const client = await getClient(namespace);
  const jobId = row.job_id as string | null;
  if (!jobId) {
    const recalled = await client.recall({query:memoryText(receipt),namespace,limit:20});
    const blobs = new Set(recalled.results.filter(match => {
      try { return JSON.parse(match.text)?.predictionId === receipt.id; } catch { return false; }
    }).map(match=>match.blob_id));
    let cursor: string | undefined;
    for (let page=0; blobs.size && page<10; page++) {
      const listed = await client.listMemories({namespace,cursor});
      const match = listed.memories.find(memory=>memory.namespace_id===namespace && blobs.has(memory.blob_id));
      if (match) {
        const job = await client.getRememberStatus(match.memory_id);
        if (job.job_id===match.memory_id && job.status==='done' && job.blob_id===match.blob_id) {
          const current = database.prepare('SELECT status FROM memory_jobs WHERE prediction_id=?').get(receipt.id);
          if (current?.status!=='done') recordMemoryCompletion(receipt.id,job.job_id,match.blob_id,true);
          return {status:200,message:'Recovered the completed provider job.',blobId:match.blob_id};
        }
      }
      if (!listed.has_more || !listed.next_cursor) break;
      cursor = listed.next_cursor;
    }
    return {status:409,message:'No matching completed job found. Acceptance remains uncertain.'};
  }
  const job = await client.getRememberStatus(jobId);
  if (job.job_id!==jobId) return {status:409,message:'Provider returned a different job ID.'};
  if (job.status==='done' && job.blob_id) {
    const current = database.prepare('SELECT status FROM memory_jobs WHERE prediction_id=?').get(receipt.id);
    if (current?.status!=='done') recordMemoryCompletion(receipt.id,jobId,job.blob_id);
    return {status:200,message:'Provider completion confirmed.',blobId:job.blob_id};
  }
  if (job.status==='failed' && !job.blob_id) {
    database.prepare("UPDATE memory_jobs SET status='retryable',job_id=NULL,error=? WHERE prediction_id=? AND job_id=? AND status<>'done'")
      .run('Provider confirmed terminal failure. Retry is available.',receipt.id,jobId);
    return {status:200,message:'Provider confirmed failure. Retry is available.'};
  }
  return {status:202,message:'Provider completion is still unconfirmed.'};
}

export async function automaticMemoryTick(getClient: ClientFactory = memoryClient, clock = Date.now) {
  const settings = automaticMemoryStatus();
  if (!settings.enabled || !settings.available) return;
  const database = db();
  const receipts = listReceipts('operator');
  const now = new Date(clock()).toISOString();
  const pending = database.prepare(`SELECT a.prediction_id, COALESCE(p.attempts,0) AS attempts
    FROM automatic_memory_attempts a JOIN memory_jobs m USING(prediction_id)
    LEFT JOIN automatic_memory_poll p USING(prediction_id)
    WHERE m.status='running' AND m.job_id IS NOT NULL AND (p.due_at IS NULL OR p.due_at<=?)
    ORDER BY COALESCE(p.due_at,a.checked_at) LIMIT 1`).get(now);
  if (pending) {
    const attempts = Number(pending.attempts)+1;
    const delay = Math.min(15,2**Math.min(attempts-1,4))*60_000;
    database.prepare(`INSERT INTO automatic_memory_poll VALUES (?,?,?)
      ON CONFLICT(prediction_id) DO UPDATE SET attempts=excluded.attempts,due_at=excluded.due_at`)
      .run(pending.prediction_id,attempts,new Date(clock()+delay).toISOString());
    const receipt = receipts.find(row=>row.id===pending.prediction_id);
    if (receipt) await rememberReceipt(receipt,'operator',true,getClient);
    return;
  }
  if (settings.used>=settings.limit) return;
  const receipt = receipts.find(row=> {
    if (!['won','lost','neutral'].includes(profileOutcome(row))) return false;
    const job = database.prepare('SELECT status FROM memory_jobs WHERE prediction_id=?').get(row.id);
    return !job || (job.status==='retryable' &&
      !database.prepare('SELECT 1 FROM automatic_memory_attempts WHERE prediction_id=?').get(row.id));
  });
  if (receipt) await rememberReceipt(receipt,'operator',true,getClient);
}
