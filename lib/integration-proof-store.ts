import {randomUUID} from 'node:crypto';
import {db} from './db';
export function proofSchema(){db().exec(`CREATE TABLE IF NOT EXISTS memory_completion_proofs(prediction_id TEXT PRIMARY KEY REFERENCES predictions(id),job_id TEXT NOT NULL,blob_id TEXT NOT NULL,network TEXT NOT NULL CHECK(network='mainnet'),completed_at TEXT NOT NULL);CREATE TABLE IF NOT EXISTS recall_proofs(id TEXT PRIMARY KEY,prediction_id TEXT NOT NULL REFERENCES predictions(id),owner_id TEXT NOT NULL,review TEXT NOT NULL,created_at TEXT NOT NULL);CREATE INDEX IF NOT EXISTS recall_proof_owner ON recall_proofs(owner_id,created_at);`);}
export function recordMemoryCompletion(id: string, job: string, blob: string, recoverUnlinked = false) {
  proofSchema();
  const database = db();
  const now = new Date().toISOString();
  database.exec('BEGIN IMMEDIATE');
  try {
    const updated = database.prepare(`UPDATE memory_jobs SET job_id=?,status='done',blob_id=?,completed_at=?,error=NULL
      WHERE prediction_id=? AND (job_id=? OR (?=1 AND job_id IS NULL AND status IN ('queued','uncertain')))`)
      .run(job,blob,now,id,job,Number(recoverUnlinked));
    if (Number(updated.changes)!==1) throw new Error('MEMORY_JOB_MISMATCH');
    database.prepare(`INSERT INTO memory_completion_proofs VALUES (?,?,?,?,?)
      ON CONFLICT(prediction_id) DO UPDATE SET job_id=excluded.job_id,blob_id=excluded.blob_id,completed_at=excluded.completed_at`)
      .run(id,job,blob,'mainnet',now);
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
export function recordRecall(id:string,owner:string,review:unknown){proofSchema();db().prepare('INSERT INTO recall_proofs VALUES (?,?,?,?,?)').run(randomUUID(),id,owner,JSON.stringify(review),new Date().toISOString());}
