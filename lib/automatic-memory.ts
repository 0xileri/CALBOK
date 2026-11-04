import {seriesForReceipt,seriesMemoryAllowed,stopSeriesForReceipt} from './repeat-series-store';
import {scheduledRepeat,scheduledRepeatLabel} from './scheduled-repeat';
import {automaticRecall} from './receipt-recall';
import {randomUUID} from 'node:crypto';
import {db, listReceipts, ownerOf, type Receipt} from './db';
import {configuration, memoryClient, namespaceFor} from './providers';
import {profileOutcome} from './caller-profiles';
import {recordMemoryCompletion} from './integration-proof-store';

const automaticLimit = 10;
const activeSubmissions = new Set<string>();
export const memorySubmissionInFlight=(id:string)=>activeSubmissions.has(id);
type MemoryClient = Pick<Awaited<ReturnType<typeof memoryClient>>, 'remember'|'waitForRememberJob'|'getRememberStatus'|'recall'|'listMemories'>;
type ClientFactory = (namespace: string) => Promise<MemoryClient>;
function automaticSchema() {
  db().exec(`CREATE TABLE IF NOT EXISTS automatic_memory_setting (id INTEGER PRIMARY KEY CHECK(id=1), enabled INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS automatic_memory_attempts (prediction_id TEXT PRIMARY KEY REFERENCES predictions(id), checked_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS memory_submission_keys (prediction_id TEXT PRIMARY KEY REFERENCES predictions(id), idempotency_key TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS memory_review_resolutions (
      id TEXT PRIMARY KEY, prediction_id TEXT NOT NULL REFERENCES predictions(id),
      decision TEXT NOT NULL, candidate_blob_id TEXT NOT NULL, resolved_by TEXT NOT NULL, resolved_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS automatic_memory_queue (prediction_id TEXT PRIMARY KEY REFERENCES predictions(id), failures INTEGER NOT NULL DEFAULT 0, due_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS automatic_memory_budget (id INTEGER PRIMARY KEY CHECK(id=1), write_limit INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS automatic_memory_dispatch (id INTEGER PRIMARY KEY CHECK(id=1), due_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS automatic_memory_poll (prediction_id TEXT PRIMARY KEY REFERENCES predictions(id), attempts INTEGER NOT NULL, due_at TEXT NOT NULL);`);
}
export function automaticMemoryStatus() {
  automaticSchema();
  const setting = db().prepare('SELECT enabled FROM automatic_memory_setting WHERE id=1').get();
  const used = Number(db().prepare('SELECT COUNT(*) AS count FROM automatic_memory_attempts WHERE prediction_id NOT IN (SELECT prediction_id FROM repeat_series_steps)').get()?.count);
  const limit=Number(db().prepare('SELECT write_limit FROM automatic_memory_budget WHERE id=1').get()?.write_limit??automaticLimit);
  const queued=eligibleMemoryReceipts().length;
  const seriesUsed=Number(db().prepare('SELECT COUNT(*) n FROM automatic_memory_attempts a JOIN repeat_series_steps t USING(prediction_id)').get()?.n);
  return {seriesUsed,enabled: !setting || setting.enabled === 1, used, queued, budgetBlocked:used>=limit&&queued>0, limit, available: configuration().walrus && configuration().mainnet && process.env.CALBOK_WORKER_ENABLED === 'true'};
}
export function setAutomaticMemory(enabled: boolean) {
  automaticSchema();
  db().prepare('INSERT INTO automatic_memory_setting VALUES (1,?) ON CONFLICT(id) DO UPDATE SET enabled=excluded.enabled').run(Number(enabled));
}
export async function rememberReceipt(receipt: Receipt, owner: string, automatic = false, getClient: ClientFactory = memoryClient) {
  if (!['won','lost','neutral'].includes(profileOutcome(receipt))) {
    return {status:409, message:'A verified settled receipt is required.'};
  }
  automaticSchema();
  const database = db();
  const namespace = namespaceFor(owner === 'operator' ? receipt.caller : JSON.stringify([owner, receipt.caller]));
  const existing = database.prepare('SELECT status,job_id FROM memory_jobs WHERE prediction_id=?').get(receipt.id);
  if (existing?.status === 'done') return {status:200, message:'Memory already completed.'};
  if (existing && !existing.job_id && !['retryable','manual_retryable'].includes(String(existing.status))) return {status:409, message:'Write acceptance is uncertain. Reconcile with the provider before retrying.'};
  let client:MemoryClient;
  try{client=await getClient(namespace);}catch(error){stopSeriesForReceipt(receipt.id,'MEMORY_PROVIDER_FAILURE');throw error;}
  let jobId = existing?.job_id as string | undefined;
  if (!jobId) {
    let idempotencyKey: string;
    database.exec('BEGIN IMMEDIATE');
    try {
      if (automatic) {
        const settings = automaticMemoryStatus();
        const series=seriesForReceipt(receipt.id);
        if (!settings.enabled || (series?!seriesMemoryAllowed(receipt.id):settings.used >= settings.limit)) {
          database.exec('ROLLBACK');
          return {status:409, message:'Automatic memory is paused or its write limit was reached.'};
        }
      }
      const reserved = database.prepare(`INSERT INTO memory_jobs (prediction_id,namespace,status) VALUES (?,?,'queued')
        ON CONFLICT(prediction_id) DO UPDATE SET status='queued',job_id=NULL,blob_id=NULL,error=NULL,completed_at=NULL
        WHERE memory_jobs.status='retryable' OR (memory_jobs.status='manual_retryable' AND ?=0)`).run(receipt.id,namespace,Number(automatic));
      if (!reserved.changes) {
        database.exec('ROLLBACK');
        return {status:409, message:'A memory job already exists. Check its status.'};
      }
      if (automatic) {
        database.prepare('INSERT INTO automatic_memory_attempts VALUES (?,?)').run(receipt.id,new Date().toISOString());
      }
      database.prepare('DELETE FROM automatic_memory_poll WHERE prediction_id=?').run(receipt.id);
      database.prepare('INSERT INTO memory_submission_keys VALUES (?,?) ON CONFLICT(prediction_id) DO NOTHING').run(receipt.id,randomUUID());
      idempotencyKey = String(database.prepare('SELECT idempotency_key FROM memory_submission_keys WHERE prediction_id=?').get(receipt.id)!.idempotency_key);
      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
    activeSubmissions.add(receipt.id);
    try {
      const job = await client.remember(memoryText(receipt),{idempotencyKey});
      if (typeof job.job_id !== 'string' || !job.job_id.trim()) throw new Error('Missing provider job ID');
      jobId = job.job_id;
      const linked = database.prepare("UPDATE memory_jobs SET status='running',job_id=?,error=NULL WHERE prediction_id=? AND status='queued' AND job_id IS NULL")
        .run(jobId,receipt.id);
      if (!linked.changes) return {status:200,message:'Memory job was reconciled while submission was in progress.'};
      if (automatic) return {status:202, message:'Memory job accepted. Confirmation is pending.'};
    } catch (error) {
      return recordSubmissionFailure(receipt.id,error,automatic);
    } finally {
      activeSubmissions.delete(receipt.id);
    }
  }
  try {
    const result = automatic ? await client.getRememberStatus(jobId) : await client.waitForRememberJob(jobId,{timeoutMs:20_000});
    if (result.job_id && result.job_id !== jobId) throw new Error('Provider returned a different job ID');
    if ('status' in result && result.status !== 'done') {
      if(result.status==='failed')stopSeriesForReceipt(receipt.id,'MEMORY_PROVIDER_FAILURE');
      if(result.status==='not_found')stopSeriesForReceipt(receipt.id,'MEMORY_UNCONFIRMED');
      if (result.status === 'failed' && !result.blob_id) {
        if (automatic) {
          await reconcileMemory(receipt,getClient);
          return {status:202,message:'Provider confirmed failure; retry is backed off or requires review.'};
        }
        database.prepare("UPDATE memory_jobs SET status='failed',error=? WHERE prediction_id=? AND job_id=? AND status<>'done'").run('Provider reported a failure. Reconcile the existing job before retrying.',receipt.id,jobId);
      }
      return {status:202, message:'Memory completion has not been confirmed.'};
    }
    if (!result.blob_id) throw new Error('Missing blob');
    const current = database.prepare('SELECT status FROM memory_jobs WHERE prediction_id=?').get(receipt.id);
    if (current?.status !== 'done') {
      recordMemoryCompletion(receipt.id,jobId,result.blob_id);
      await automaticRecall(owner,undefined,getClient).catch(()=>undefined);
    }
    return {status:200, message:'Durable memory completion confirmed.',blobId:result.blob_id};
  } catch {
    stopSeriesForReceipt(receipt.id,'MEMORY_CONFIRMATION_FAILURE');
    database.prepare("UPDATE memory_jobs SET error=? WHERE prediction_id=? AND job_id=? AND status<>'done'").run('Completion not confirmed; retry status check.',receipt.id,jobId);
    return {status:202, message:'Memory completion is pending or could not be confirmed.'};
  }
}

function memoryText(receipt: Receipt) {
  return JSON.stringify({...(scheduledRepeat(receipt)?{scheduledRepeat:scheduledRepeat(receipt),originLabel:scheduledRepeatLabel(receipt),sourceKind:'owner_scheduled_repeat'}:{}),predictionId:receipt.id,caller:receipt.caller,asset:receipt.asset,horizon:receipt.horizon,direction:receipt.direction,outcome:receipt.outcome,sampleCaveat:'One observation; limited sample.'});
}

export function definitelyNotSent(error: unknown): boolean {
  // Only an explicit failed connect proves the HTTP request was never sent.
  const cause = error instanceof TypeError ? error.cause : error;
  if (!(cause instanceof Error)) return false;
  const detail = cause as NodeJS.ErrnoException;
  return detail.code === 'ECONNREFUSED' && detail.syscall === 'connect';
}

function recordSubmissionFailure(id: string, error: unknown, automatic: boolean) {
  const scheduled=stopSeriesForReceipt(id,'MEMORY_SUBMISSION_FAILURE');
  const retryable = definitelyNotSent(error);
  const message = retryable
    ? 'Connection refused before submission. Retry is available.'
    : 'Submission failed without a job ID. Acceptance is uncertain. Reconcile before retrying.';
  const database = db();
  database.exec('BEGIN IMMEDIATE');
  try {
    const updated = database.prepare("UPDATE memory_jobs SET status=?,error=? WHERE prediction_id=? AND job_id IS NULL AND status='queued'")
      .run(retryable?(automatic&&!scheduled?'retryable':'manual_retryable'):'uncertain',message,id);
    if (updated.changes && automatic && retryable) {
      database.prepare('DELETE FROM automatic_memory_attempts WHERE prediction_id=?').run(id);
      backoffMemory(id);
    }
    database.exec('COMMIT');
  } catch (failure) {
    database.exec('ROLLBACK');
    throw failure;
  }
  return {status:retryable?503:409,message};
}

export async function reconcileMemory(receipt: Receipt, getClient: ClientFactory = memoryClient) {
  try{return await reconcileMemoryInner(receipt,getClient);}catch(error){stopSeriesForReceipt(receipt.id,'MEMORY_PROVIDER_FAILURE');throw error;}
}
async function reconcileMemoryInner(receipt: Receipt, getClient: ClientFactory) {
  const database = db();
  const row = database.prepare('SELECT status,namespace,job_id FROM memory_jobs WHERE prediction_id=?').get(receipt.id);
  if (!row) return {status:404,message:'No memory job to reconcile.'};
  if (row.status === 'manual_review') return {status:200,message:'Review the matching blob and choose how to resolve it.'};
  if (row.status === 'done' || row.status === 'retryable' || row.status === 'manual_retryable') return {status:200,message:row.status==='done'?'Memory already completed.':'Retry is available.'};
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
        if (activeSubmissions.has(receipt.id)) return {status:202,message:'The submission is still in progress.'};
        const message = 'A matching memory was found. Review the blob ID and choose how to resolve it.';
        const updated = database.prepare(`UPDATE memory_jobs SET status='manual_review',blob_id=?,error=?
          WHERE prediction_id=? AND job_id IS NULL AND status IN ('queued','uncertain')`)
          .run(match.blob_id,message,receipt.id);
        if(updated.changes)stopSeriesForReceipt(receipt.id,'MEMORY_ACCEPTANCE_UNCONFIRMED');
        return updated.changes ? {status:200,message} : {status:409,message:'Memory job changed. Refresh the receipt.'};
      }
      if (!listed.has_more || !listed.next_cursor) break;
      cursor = listed.next_cursor;
    }
    return {status:409,message:'No matching completed job found. Acceptance remains uncertain.'};
  }
  const job = await client.getRememberStatus(jobId);
  if (job.job_id!==jobId) {stopSeriesForReceipt(receipt.id,'MEMORY_PROVIDER_FAILURE');return {status:409,message:'Provider returned a different job ID.'};}
  if (job.status==='done' && job.blob_id) {
    const current = database.prepare('SELECT status FROM memory_jobs WHERE prediction_id=?').get(receipt.id);
    if (current?.status!=='done') {
      recordMemoryCompletion(receipt.id,jobId,job.blob_id);
      await automaticRecall(ownerOf(receipt.id),undefined,getClient).catch(()=>undefined);
    }
    return {status:200,message:'Provider completion confirmed.',blobId:job.blob_id};
  }
  if(job.status==='failed')stopSeriesForReceipt(receipt.id,'MEMORY_PROVIDER_FAILURE');
  if(job.status==='not_found')stopSeriesForReceipt(receipt.id,'MEMORY_UNCONFIRMED');
  if (job.status==='failed' && !job.blob_id) {
    const scheduled=stopSeriesForReceipt(receipt.id,'MEMORY_PROVIDER_FAILURE');
    automaticSchema();
    database.exec('BEGIN IMMEDIATE');
    try {
      const automatic = database.prepare('SELECT 1 FROM automatic_memory_attempts WHERE prediction_id=?').get(receipt.id);
      const updated = database.prepare("UPDATE memory_jobs SET status=?,job_id=NULL,error=? WHERE prediction_id=? AND job_id=? AND status<>'done'")
        .run(automatic&&!scheduled?'retryable':'manual_retryable','Provider confirmed terminal failure. Retry is available.',receipt.id,jobId);
      if (updated.changes) {
        resetFailedSubmission(receipt.id);
        if (automatic) backoffMemory(receipt.id);
      }
      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
    return {status:200,message:'Provider confirmed failure. Retry is available.'};
  }
  return {status:202,message:'Provider completion is still unconfirmed.'};
}

function resetFailedSubmission(id: string) {
  const database = db();
  database.prepare('DELETE FROM automatic_memory_attempts WHERE prediction_id=?').run(id);
  database.prepare('DELETE FROM automatic_memory_poll WHERE prediction_id=?').run(id);
  database.prepare(`INSERT INTO memory_submission_keys VALUES (?,?)
    ON CONFLICT(prediction_id) DO UPDATE SET idempotency_key=excluded.idempotency_key`).run(id,randomUUID());
}

export function resolveMemoryReview(id: string, decision: 'link'|'fail', blobId: string, actor: {id:string;role:string;email:string|null}) {
  if (actor.role !== 'operator' || actor.id !== 'operator' || ownerOf(id) !== actor.id) {
    return {status:403,message:'Owner access required.'};
  }
  automaticSchema();
  const database = db();
  const resolvedAt = new Date().toISOString();
  database.exec('BEGIN IMMEDIATE');
  try {
    const linked = decision === 'link';
    const updated = database.prepare(`UPDATE memory_jobs SET status=?,blob_id=?,completed_at=?,error=?
      WHERE prediction_id=? AND status='manual_review' AND job_id IS NULL AND blob_id=?`)
      .run(linked?'done':'manual_retryable',linked?blobId:null,linked?resolvedAt:null,
        linked?null:'Owner marked the job failed. Manual retry is available.',id,blobId);
    if (!updated.changes) {
      database.exec('ROLLBACK');
      return {status:409,message:'Memory review changed or the blob ID does not match. Refresh the receipt.'};
    }
    if (!linked) resetFailedSubmission(id);
    // Owner confirmation records a blob link without inventing a provider job ID or proof.
    database.prepare('INSERT INTO memory_review_resolutions VALUES (?,?,?,?,?,?)')
      .run(randomUUID(),id,decision,blobId,actor.email??actor.id,resolvedAt);
    database.exec('COMMIT');
    return {status:200,message:linked?'Owner confirmed and linked the blob.':'Owner marked the job failed. Manual retry is available.'};
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

/** Durable queue only: submissions still pass through rememberReceipt's verified evidence and budget checks. */
export function queueSettledMemory(receipt: Receipt) {
  automaticSchema();
  if (ownerOf(receipt.id)!=='operator' || !['won','lost','neutral'].includes(profileOutcome(receipt))) return;
  const job=db().prepare('SELECT status FROM memory_jobs WHERE prediction_id=?').get(receipt.id);
  if(job && job.status!=='retryable') return;
  db().prepare("INSERT OR IGNORE INTO automatic_memory_queue(prediction_id,due_at) VALUES (?,'1970-01-01T00:00:00.000Z')").run(receipt.id);
}
export function backfillSettledMemories() {
  for (const receipt of listReceipts('operator')) queueSettledMemory(receipt);
}
function eligibleMemoryReceipts() {
  return listReceipts('operator').filter(receipt=>{
    if(seriesForReceipt(receipt.id)||!['won','lost','neutral'].includes(profileOutcome(receipt)))return false;
    const job=db().prepare('SELECT status FROM memory_jobs WHERE prediction_id=?').get(receipt.id);
    return !job || job.status==='retryable';
  });
}
/** The owner approves only the currently settled backlog; the dispatch rate never increases. */
export function rememberAllSettled(actor:{id:string;role:string}) {
  if(actor.id!=='operator'||actor.role!=='operator')return {status:403,message:'Owner access required.'};
  const settings=automaticMemoryStatus();
  if(!settings.available)return {status:409,message:'Configure the worker and Walrus Mainnet first.'};
  const database=db();
  database.exec('BEGIN IMMEDIATE');
  try {
    backfillSettledMemories();
    const used=Number(database.prepare('SELECT COUNT(*) n FROM automatic_memory_attempts WHERE prediction_id NOT IN (SELECT prediction_id FROM repeat_series_steps)').get()!.n);
    const limit=Math.max(settings.limit,used+eligibleMemoryReceipts().length);
    database.prepare('INSERT INTO automatic_memory_budget VALUES (1,?) ON CONFLICT(id) DO UPDATE SET write_limit=MAX(write_limit,excluded.write_limit)').run(limit);
    setAutomaticMemory(true);
    database.exec('COMMIT');
  }catch(error){database.exec('ROLLBACK');throw error;}
  return {status:200,message:'Settled receipts queued. The worker submits at most one new job per minute.',...automaticMemoryStatus()};
}

function backoffMemory(id:string) {
  db().prepare(`INSERT INTO automatic_memory_queue(prediction_id,failures,due_at) VALUES (?,1,?)
    ON CONFLICT(prediction_id) DO UPDATE SET failures=failures+1,due_at=excluded.due_at`)
    .run(id,new Date(Date.now()+60_000).toISOString());
  const failures=Number(db().prepare('SELECT failures FROM automatic_memory_queue WHERE prediction_id=?').get(id)!.failures);
  db().prepare('UPDATE automatic_memory_queue SET due_at=? WHERE prediction_id=?')
    .run(new Date(Date.now()+Math.min(3600_000,60_000*2**(failures-1))).toISOString(),id);
  if(failures>=8) db().prepare("UPDATE memory_jobs SET status='manual_retryable',error='Automatic retry limit reached. Manual review required.' WHERE prediction_id=?").run(id);
}

export async function automaticMemoryTick(getClient: ClientFactory = memoryClient, clock = Date.now) {
  const settings = automaticMemoryStatus();
  if (!settings.available) return;
  const database = db();
  backfillSettledMemories();
  const now = new Date(clock()).toISOString();
  const pending = database.prepare(`SELECT m.prediction_id, COALESCE(p.attempts,0) AS attempts
    FROM memory_jobs m LEFT JOIN automatic_memory_attempts a USING(prediction_id)
    LEFT JOIN automatic_memory_poll p USING(prediction_id)
    WHERE m.status IN ('running','failed')
      AND m.job_id IS NOT NULL AND (p.due_at IS NULL OR p.due_at<=?)
    ORDER BY COALESCE(p.due_at,a.checked_at,''),m.prediction_id LIMIT 1`).get(now);
  if (pending) {
    const attempts = Number(pending.attempts)+1;
    const delay = Math.min(15,2**Math.min(attempts-1,4))*60_000;
    database.prepare(`INSERT INTO automatic_memory_poll VALUES (?,?,?)
      ON CONFLICT(prediction_id) DO UPDATE SET attempts=excluded.attempts,due_at=excluded.due_at`)
      .run(pending.prediction_id,attempts,new Date(clock()+delay).toISOString());
    const owner = ownerOf(String(pending.prediction_id));
    const receipt = listReceipts(owner).find(row=>row.id===pending.prediction_id);
    if (receipt) await rememberReceipt(receipt,owner,true,getClient);
    return;
  }
  if (!settings.enabled) return;
  const dispatch=database.prepare('SELECT due_at FROM automatic_memory_dispatch WHERE id=1').get();
  if(dispatch && String(dispatch.due_at)>now) return;
  const receipt = listReceipts('operator').find(row=> {
    const series=seriesForReceipt(row.id);
    if(series?!seriesMemoryAllowed(row.id):settings.used>=settings.limit)return false;
    const queued=database.prepare('SELECT due_at FROM automatic_memory_queue WHERE prediction_id=?').get(row.id);
    if(!queued || String(queued.due_at)>now) return false;
    if (!['won','lost','neutral'].includes(profileOutcome(row))) return false;
    const job = database.prepare('SELECT status FROM memory_jobs WHERE prediction_id=?').get(row.id);
    return !job || (job.status==='retryable' &&
      !database.prepare('SELECT 1 FROM automatic_memory_attempts WHERE prediction_id=?').get(row.id));
  });
  if (receipt) {
    database.prepare('INSERT INTO automatic_memory_dispatch VALUES (1,?) ON CONFLICT(id) DO UPDATE SET due_at=excluded.due_at').run(new Date(clock()+60_000).toISOString());
    await rememberReceipt(receipt,'operator',true,getClient);
  }
}
