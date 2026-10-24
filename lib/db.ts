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
  instance.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
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
    CREATE TRIGGER IF NOT EXISTS freeze_prediction BEFORE UPDATE ON predictions BEGIN SELECT RAISE(ABORT,'Locked predictions are immutable'); END;
    CREATE TRIGGER IF NOT EXISTS freeze_settlement BEFORE UPDATE ON settlements BEGIN SELECT RAISE(ABORT,'Settlements are immutable'); END;`);
  return instance;
}
export type Receipt = {id:string;caller:string;asset:string;asset_symbol:string|null;asset_provider:string|null;direction:string;horizon:string;text:string;source_url:string;locked_at:string;deadline:string;snapshot_hash:string;provenance:string;outcome:string|null;evidence:string|null;method:string|null};
export const hash = (value:string) => createHash('sha256').update(value).digest('hex');
export function listReceipts():Receipt[] { return db().prepare('SELECT p.*, a.symbol AS asset_symbol, a.provider AS asset_provider, s.outcome, s.evidence, s.method FROM predictions p LEFT JOIN settlements s ON s.prediction_id=p.id LEFT JOIN assets a ON a.id=p.asset ORDER BY p.locked_at DESC').all() as unknown as Receipt[]; }
export function registerAsset(asset:Asset){db().prepare('INSERT OR IGNORE INTO assets VALUES (?,?,?,?,?,?,?)').run(asset.id,asset.symbol,asset.name,asset.provider,asset.chain||null,asset.address||null,asset.discoveredAt||new Date().toISOString());}
export function knownAsset(id:string):Asset|null{const row=db().prepare('SELECT * FROM assets WHERE id=?').get(id) as Record<string,string>|undefined;return row?{id:row.id,symbol:row.symbol,name:row.name,provider:row.provider as Asset['provider'],chain:row.chain,address:row.address}:null;}
export function capture(claim:Claim) {
  const assetMetadata=knownAsset(claim.asset);
  if(parseGmgnAssetId(claim.asset)&&!assetMetadata)throw new Error('GMGN token must be discovered and selected first');
  const now = new Date(), id = `CB-${randomUUID()}`;
  const deadline = new Date(now.getTime()+(claim.horizon==='24h'?24:168)*3600_000).toISOString();
  const snapshot = JSON.stringify({...claim,id,lockedAt:now.toISOString(),deadline,method:'directional-open-v1',...(assetMetadata?{assetMetadata}:{})});
  const fingerprint = hash(JSON.stringify([claim.caller.toLowerCase(),claim.text.toLowerCase(),claim.asset,claim.direction,claim.horizon]));
  const database = db(); database.exec('BEGIN IMMEDIATE');
  try {
    database.prepare('INSERT INTO predictions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,claim.caller,claim.asset,claim.direction,claim.horizon,claim.text,claim.sourceUrl,now.toISOString(),deadline,fingerprint,hash(snapshot),'self_logged_before_outcome',snapshot);
    database.prepare('INSERT INTO audit_events VALUES (?,?,?,?,?)').run(randomUUID(),id,'prediction_locked',hash(snapshot),now.toISOString());
    database.exec('COMMIT'); return id;
  } catch(error) { database.exec('ROLLBACK'); throw error; }
}
