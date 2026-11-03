import {db, listReceipts, type Receipt} from './db';
import {configuration, memoryClient, namespaceFor} from './providers';
import {profileOutcome} from './caller-profiles';
import {recordMemoryCompletion} from './integration-proof-store';

const automaticLimit = 10;
function automaticSchema() {
  db().exec(`CREATE TABLE IF NOT EXISTS automatic_memory_setting (id INTEGER PRIMARY KEY CHECK(id=1), enabled INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS automatic_memory_attempts (prediction_id TEXT PRIMARY KEY REFERENCES predictions(id), checked_at TEXT NOT NULL);`);
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
export async function rememberReceipt(receipt: Receipt, owner: string, automatic = false) {
  if (!['won','lost','neutral'].includes(profileOutcome(receipt))) {
    return {status:409, message:'A verified settled receipt is required.'};
  }
  const database = db();
  const namespace = namespaceFor(owner === 'operator' ? receipt.caller : JSON.stringify([owner, receipt.caller]));
  const existing = database.prepare('SELECT status,job_id FROM memory_jobs WHERE prediction_id=?').get(receipt.id);
  if (existing?.status === 'done') return {status:200, message:'Memory already completed.'};
  if (existing && !existing.job_id) return {status:409, message:'Write acceptance is uncertain. Reconcile with the provider before retrying.'};
  const client = await memoryClient(namespace);
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
      const reserved = database.prepare("INSERT OR IGNORE INTO memory_jobs (prediction_id,namespace,status) VALUES (?,?,'queued')").run(receipt.id,namespace);
      if (!reserved.changes) {
        database.exec('ROLLBACK');
        return {status:409, message:'A memory job already exists. Check its status.'};
      }
      if (automatic) database.prepare('INSERT INTO automatic_memory_attempts VALUES (?,?)').run(receipt.id,new Date().toISOString());
      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
    const job = await client.remember(JSON.stringify({predictionId:receipt.id,caller:receipt.caller,asset:receipt.asset,horizon:receipt.horizon,direction:receipt.direction,outcome:receipt.outcome,sampleCaveat:'One observation; limited sample.'}));
    if (!job.job_id) throw new Error('Missing provider job ID');
    jobId = job.job_id;
    database.prepare("UPDATE memory_jobs SET status='running',job_id=? WHERE prediction_id=?").run(jobId,receipt.id);
  }
  try {
    const result = automatic ? await client.getRememberStatus(jobId) : await client.waitForRememberJob(jobId,{timeoutMs:20_000});
    if ('status' in result && result.status !== 'done') {
      if (result.status === 'failed' || result.status === 'not_found') {
        database.prepare("UPDATE memory_jobs SET status='failed',error=? WHERE prediction_id=? AND status<>'done'").run('Provider could not confirm this job. Inspect the existing job before retrying.',receipt.id);
      }
      return {status:202, message:'Memory completion has not been confirmed.'};
    }
    if (!result.blob_id) throw new Error('Missing blob');
    const current = database.prepare('SELECT status FROM memory_jobs WHERE prediction_id=?').get(receipt.id);
    if (current?.status !== 'done') recordMemoryCompletion(receipt.id,jobId,result.blob_id);
    return {status:200, message:'Durable memory completion confirmed.',blobId:result.blob_id};
  } catch {
    database.prepare("UPDATE memory_jobs SET error=? WHERE prediction_id=? AND status<>'done'").run('Completion not confirmed; retry status check.',receipt.id);
    return {status:202, message:'Memory completion is pending or could not be confirmed.'};
  }
}

export async function automaticMemoryTick() {
  const settings = automaticMemoryStatus();
  if (!settings.enabled || !settings.available) return;
  const database = db();
  const receipts = listReceipts('operator');
  const candidate = database.prepare(`SELECT a.prediction_id FROM automatic_memory_attempts a JOIN memory_jobs m USING(prediction_id)
    WHERE m.status='running' AND m.job_id IS NOT NULL ORDER BY a.checked_at LIMIT 1`).get();
  const pending = receipts.find(row => row.id === candidate?.prediction_id);
  // Alternate between starting jobs and checking existing jobs when both are available.
  const newReceipt = settings.used < settings.limit ? receipts.find(row =>
    ['won','lost','neutral'].includes(profileOutcome(row)) &&
    !database.prepare('SELECT 1 FROM memory_jobs WHERE prediction_id=?').get(row.id)) : undefined;
  const receipt = pending && (!newReceipt || Math.floor(Date.now()/60_000)%2===0) ? pending : newReceipt;
  if (!receipt) return;
  database.prepare('UPDATE automatic_memory_attempts SET checked_at=? WHERE prediction_id=?').run(new Date().toISOString(),receipt.id);
  await rememberReceipt(receipt,'operator',true);
}
