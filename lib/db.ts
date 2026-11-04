import type {ScheduledRepeat} from './scheduled-repeat';
import {lockAgainSeed} from './lock-again';
import {reserveUserBudget} from './user-limits';
import {horizonHours} from './horizons';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import type { Claim } from './domain';
import {parseGmgnAssetId,type Asset} from './assets';
let instance: DatabaseSync;
export function db() {
  if (instance) return instance;
  const path = resolve(/* turbopackIgnore: true */ process.env.CALBOK_DB_PATH || './data/calbok.sqlite');
  mkdirSync(dirname(path),{recursive:true});
  instance = new DatabaseSync(path);
  instance.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS call_drafts(owner_id TEXT PRIMARY KEY,fields TEXT NOT NULL,version INTEGER NOT NULL,updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS assets (id TEXT PRIMARY KEY, symbol TEXT NOT NULL, name TEXT NOT NULL, provider TEXT NOT NULL, chain TEXT, address TEXT, discovered_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS asset_checks (id TEXT PRIMARY KEY, asset_id TEXT NOT NULL, checked_at TEXT NOT NULL, evidence TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS predictions (
      id TEXT PRIMARY KEY, caller TEXT NOT NULL, asset TEXT NOT NULL, direction TEXT NOT NULL,
      horizon TEXT NOT NULL, text TEXT NOT NULL, source_url TEXT NOT NULL,
      locked_at TEXT NOT NULL, deadline TEXT NOT NULL, fingerprint TEXT NOT NULL UNIQUE,
      snapshot_hash TEXT NOT NULL, provenance TEXT NOT NULL, snapshot TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS settlements (
      prediction_id TEXT PRIMARY KEY REFERENCES predictions(id), outcome TEXT NOT NULL,
      evidence TEXT NOT NULL, method TEXT NOT NULL, settled_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS memory_jobs (
      prediction_id TEXT PRIMARY KEY REFERENCES predictions(id), namespace TEXT NOT NULL,
      status TEXT NOT NULL, job_id TEXT, blob_id TEXT, completed_at TEXT, error TEXT);
    CREATE TABLE IF NOT EXISTS onchain_evidence (
      id TEXT PRIMARY KEY, asset TEXT NOT NULL, method TEXT NOT NULL, evidence TEXT NOT NULL, verified_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY, entity_id TEXT NOT NULL, action TEXT NOT NULL, content_hash TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS settlement_jobs (
      prediction_id TEXT PRIMARY KEY REFERENCES predictions(id), status TEXT NOT NULL DEFAULT 'queued',
      attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at TEXT NOT NULL, lease_token TEXT, lease_until TEXT,
      last_error TEXT, updated_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS settlement_jobs_due ON settlement_jobs(status,next_attempt_at);
    CREATE TABLE IF NOT EXISTS worker_state (
      id INTEGER PRIMARY KEY CHECK(id=1), owner TEXT, lease_until TEXT, next_tick_at TEXT NOT NULL,
      heartbeat_at TEXT, last_error TEXT);
    CREATE TRIGGER IF NOT EXISTS freeze_prediction BEFORE UPDATE ON predictions BEGIN SELECT RAISE(ABORT,'Locked predictions are immutable'); END;
    CREATE TRIGGER IF NOT EXISTS freeze_settlement BEFORE UPDATE ON settlements BEGIN SELECT RAISE(ABORT,'Settlements are immutable'); END;`);
  instance.exec(`CREATE TABLE IF NOT EXISTS prediction_owners(prediction_id TEXT PRIMARY KEY REFERENCES predictions(id),owner_id TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS prediction_owner_idx ON prediction_owners(owner_id);
    CREATE TRIGGER IF NOT EXISTS freeze_prediction_owner BEFORE UPDATE ON prediction_owners BEGIN SELECT RAISE(ABORT,'Receipt ownership is immutable'); END;
    CREATE TRIGGER IF NOT EXISTS keep_prediction_owner BEFORE DELETE ON prediction_owners BEGIN SELECT RAISE(ABORT,'Receipt ownership is immutable'); END;`);
  instance.exec('CREATE TABLE IF NOT EXISTS receipt_inbox_links (prediction_id TEXT PRIMARY KEY REFERENCES predictions(id), inbox_id TEXT NOT NULL REFERENCES call_inbox(id))');
  if(!instance.prepare("SELECT 1 FROM pragma_table_info('settlement_jobs') WHERE name='first_checked_at'").get())instance.exec('ALTER TABLE settlement_jobs ADD COLUMN first_checked_at TEXT');
  instance.exec(`CREATE TABLE IF NOT EXISTS repeat_series (
    id TEXT PRIMARY KEY,owner_id TEXT NOT NULL,request_id TEXT NOT NULL,group_key TEXT NOT NULL,
    seed_id TEXT NOT NULL REFERENCES predictions(id),current_id TEXT NOT NULL REFERENCES predictions(id),
    target_count INTEGER NOT NULL CHECK(target_count BETWEEN 1 AND 10),created_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',stop_reason TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,
    UNIQUE(owner_id,request_id));
    CREATE UNIQUE INDEX IF NOT EXISTS repeat_series_active_group ON repeat_series(owner_id,group_key) WHERE status='active';
    CREATE TABLE IF NOT EXISTS repeat_series_steps (
      series_id TEXT NOT NULL REFERENCES repeat_series(id),step INTEGER NOT NULL,prediction_id TEXT NOT NULL UNIQUE REFERENCES predictions(id),
      recall_state TEXT NOT NULL DEFAULT 'pending',recall_started_at TEXT,PRIMARY KEY(series_id,step));`);
  return instance;
}
export type Receipt = {inbox_id?:string|null;snapshot?:string;id:string;caller:string;asset:string;asset_symbol:string|null;asset_provider:string|null;direction:string;horizon:string;text:string;source_url:string;locked_at:string;deadline:string;snapshot_hash:string;provenance:string;outcome:string|null;evidence:string|null;method:string|null};
export const hash = (value:string) => createHash('sha256').update(value).digest('hex');
export function listReceipts(ownerId?:string):Receipt[] { return db().prepare("SELECT p.*, l.inbox_id, a.symbol AS asset_symbol, a.provider AS asset_provider, s.outcome, s.evidence, s.method FROM predictions p LEFT JOIN receipt_inbox_links l ON l.prediction_id=p.id LEFT JOIN settlements s ON s.prediction_id=p.id LEFT JOIN assets a ON a.id=p.asset LEFT JOIN prediction_owners o ON o.prediction_id=p.id"+(ownerId?" WHERE COALESCE(o.owner_id,'operator')=?":"")+' ORDER BY p.locked_at DESC').all(...(ownerId?[ownerId]:[])) as unknown as Receipt[]; }
export function ownerOf(id:string){return (db().prepare('SELECT owner_id FROM prediction_owners WHERE prediction_id=?').get(id) as {owner_id:string}|undefined)?.owner_id||'operator';}
export function registerAsset(asset:Asset){db().prepare('INSERT OR IGNORE INTO assets VALUES (?,?,?,?,?,?,?)').run(asset.id,asset.symbol,asset.name,asset.provider,asset.chain||null,asset.address||null,asset.discoveredAt||new Date().toISOString());}
export function knownAsset(id:string):Asset|null{const row=db().prepare('SELECT * FROM assets WHERE id=?').get(id) as Record<string,string>|undefined;return row?{id:row.id,symbol:row.symbol,name:row.name,provider:row.provider as Asset['provider'],chain:row.chain,address:row.address}:null;}
export function capture(claim:Claim,ownerId='operator',draftVersion?:number,inboxId?:string,repeatOf?:string,sameGroup=false,scheduled?:ScheduledRepeat) {
  if(sameGroup&&!repeatOf)throw new Error('PRIOR_RECEIPT_REQUIRED');
  if(repeatOf){
    const prior=listReceipts(ownerId).find(row=>row.id===repeatOf);
    if(!prior||!lockAgainSeed(prior))throw new Error('VERIFIED_PRIOR_RECEIPT_REQUIRED');
    if(sameGroup){
      const memory=db().prepare("SELECT 1 FROM memory_jobs WHERE prediction_id=? AND status='done' AND blob_id IS NOT NULL AND blob_id<>''").get(repeatOf);
      if(!memory||!['caller','asset','direction','horizon'].every(key=>claim[key as keyof Claim]===prior[key as keyof Receipt]))throw new Error('COMPLETED_MEMORY_AND_SAME_GROUP_REQUIRED');
    }
  }
  db().exec('CREATE TABLE IF NOT EXISTS receipt_repeat_links (prediction_id TEXT PRIMARY KEY REFERENCES predictions(id),original_id TEXT NOT NULL REFERENCES predictions(id))');
  const assetMetadata=knownAsset(claim.asset);
  if(parseGmgnAssetId(claim.asset)&&!assetMetadata)throw new Error('GMGN token must be discovered and selected first');
  const now = new Date(), id = `CB-${randomUUID()}`;
  const deadline = new Date(now.getTime()+horizonHours[claim.horizon]*3600_000).toISOString();
  const snapshot = JSON.stringify({...claim,id,lockedAt:now.toISOString(),deadline,method:'directional-open-v1',...(repeatOf?{repeatedFrom:repeatOf}:{}),...(scheduled?{scheduledRepeat:scheduled,sourceKind:'owner_scheduled_repeat'}:{}),...(assetMetadata?{assetMetadata}:{})});
  const fingerprint = hash(JSON.stringify([...(ownerId==='operator'?[]:[ownerId]),claim.caller.toLowerCase(),claim.text.toLowerCase(),claim.asset,claim.direction,claim.horizon,...(repeatOf?['repeat',repeatOf]:[]),...(scheduled?['series',scheduled.seriesId,scheduled.step]:[])]));
  const database = db(); database.exec('BEGIN IMMEDIATE');
  try {
    if(scheduled){
      const series=database.prepare("SELECT * FROM repeat_series WHERE id=? AND owner_id=? AND status='active' AND current_id=? AND created_count=? AND target_count=?").get(scheduled.seriesId,ownerId,repeatOf||'',scheduled.step-1,scheduled.count);
      if(!sameGroup||!series||scheduled.scheduledBy!=='operator'||scheduled.step>scheduled.count)throw new Error('SERIES_CHANGED');
      const completed=database.prepare(`SELECT 1 FROM memory_jobs m JOIN memory_completion_proofs c USING(prediction_id)
        WHERE m.prediction_id=? AND m.status='done' AND m.job_id=c.job_id AND m.blob_id=c.blob_id AND c.network='mainnet' AND c.completed_at<?`).get(repeatOf!,now.toISOString());
      if(!completed)throw new Error('SERIES_MEMORY_NOT_READY');
    }
    if (inboxId && !database.prepare('SELECT 1 FROM call_inbox WHERE id=? AND owner_id=?').get(inboxId,ownerId)) throw new Error('INBOX_NOT_FOUND');
    reserveUserBudget(ownerId,'locks',now.getTime());
    database.prepare('INSERT INTO predictions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,claim.caller,claim.asset,claim.direction,claim.horizon,claim.text,claim.sourceUrl,now.toISOString(),deadline,fingerprint,hash(snapshot),'self_logged_before_outcome',snapshot);
    if(scheduled){
      database.prepare('INSERT INTO repeat_series_steps(series_id,step,prediction_id) VALUES (?,?,?)').run(scheduled.seriesId,scheduled.step,id);
      database.prepare('UPDATE repeat_series SET current_id=?,created_count=?,updated_at=? WHERE id=?').run(id,scheduled.step,now.toISOString(),scheduled.seriesId);
      database.prepare('INSERT INTO audit_events VALUES (?,?,?,?,?)').run(randomUUID(),id,'owner_scheduled_repeat_locked',hash(snapshot),now.toISOString());
    }
    if(repeatOf)database.prepare('INSERT INTO receipt_repeat_links VALUES (?,?)').run(id,repeatOf);
    if (inboxId) database.prepare('INSERT INTO receipt_inbox_links VALUES (?,?)').run(id,inboxId);
    database.prepare('INSERT INTO prediction_owners VALUES (?,?)').run(id,ownerId);
    database.prepare('INSERT INTO audit_events VALUES (?,?,?,?,?)').run(randomUUID(),id,'prediction_locked',hash(snapshot),now.toISOString());
    database.prepare('INSERT INTO settlement_jobs (prediction_id,next_attempt_at,updated_at) VALUES (?,?,?)').run(id,deadline,now.toISOString());
    if(draftVersion!==undefined)database.prepare("UPDATE call_drafts SET fields='null',version=version+1,updated_at=? WHERE owner_id=? AND version=?").run(now.toISOString(),ownerId,draftVersion);
    database.exec('COMMIT'); return id;
  } catch(error) { database.exec('ROLLBACK'); throw error; }
}
