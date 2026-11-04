import {db,ownerOf} from './db';
import {randomUUID} from 'node:crypto';
import type {Principal} from './auth';

export type Visibility='private'|'public';
export class PublicationError extends Error {}
export function publicCallerAllowed(value:string){return value.trim().length>0&&!/[^\s@]+@[^\s@]+\.[^\s@]+/.test(value)&&!/[\u0000-\u001f\u007f/\\?#]/.test(value);}
function requirePublicIdentity(id:string,owner:string){
  if(!publicHandle(owner))throw new PublicationError('Set a public username in Account profile before publishing.');
  const row=db().prepare('SELECT caller FROM predictions WHERE id=?').get(id);
  if(!row||!publicCallerAllowed(String(row.caller)))throw new PublicationError('Use a public caller name or handle, without email addresses or URL characters.');
}
export function publicationSchema(){db().exec(`
  CREATE TABLE IF NOT EXISTS public_handles(user_id TEXT PRIMARY KEY,handle TEXT NOT NULL UNIQUE);
  CREATE TABLE IF NOT EXISTS receipt_publication(prediction_id TEXT PRIMARY KEY REFERENCES predictions(id),
    visibility TEXT NOT NULL DEFAULT 'private' CHECK(visibility IN ('private','public')),
    hidden INTEGER NOT NULL DEFAULT 0 CHECK(hidden IN (0,1)));
  CREATE TABLE IF NOT EXISTS publication_events(id TEXT PRIMARY KEY,prediction_id TEXT NOT NULL REFERENCES predictions(id),
    action TEXT NOT NULL,actor_id TEXT NOT NULL,created_at TEXT NOT NULL);
  CREATE TRIGGER IF NOT EXISTS publication_one_way BEFORE UPDATE OF visibility ON receipt_publication
    WHEN OLD.visibility='public' AND NEW.visibility<>'public' BEGIN SELECT RAISE(ABORT,'Publication is one-way'); END;
  CREATE TRIGGER IF NOT EXISTS publication_keep_record BEFORE DELETE ON receipt_publication
    WHEN OLD.visibility='public' BEGIN SELECT RAISE(ABORT,'Public records are retained'); END;
`);}
export function publicHandle(owner:string){publicationSchema();return String(db().prepare('SELECT handle FROM public_handles WHERE user_id=?').get(owner)?.handle||'');}
export function publicationEvent(id:string,action:string,actor:string){db().prepare('INSERT INTO publication_events VALUES (?,?,?,?,?)').run(randomUUID(),id,action,actor,new Date().toISOString());}
/** Called within the lock transaction, so missing public identity never leaves a partial receipt. */
export function initializePublication(id:string,owner:string,visibility:Visibility){
  if(visibility==='public')requirePublicIdentity(id,owner);
  db().prepare('INSERT INTO receipt_publication(prediction_id,visibility) VALUES (?,?)').run(id,visibility);
  if(visibility==='public')publicationEvent(id,'published',owner);
}
export function publishReceipt(id:string,actor:Principal){
  publicationSchema();
  if(!db().prepare('SELECT 1 FROM predictions WHERE id=?').get(id)||ownerOf(id)!==actor.id)throw new PublicationError('Receipt not found.');
  requirePublicIdentity(id,actor.id);
  const database=db();database.exec('BEGIN IMMEDIATE');
  try{
    const changed=database.prepare(`INSERT INTO receipt_publication(prediction_id,visibility) VALUES (?,'public')
      ON CONFLICT(prediction_id) DO UPDATE SET visibility='public' WHERE visibility='private'`).run(id);
    if(changed.changes)publicationEvent(id,'published',actor.id);
    database.exec('COMMIT');
  }catch(error){database.exec('ROLLBACK');throw error;}
}
export function hidePublicReceipt(id:string,actor:Principal){
  publicationSchema();
  if(actor.id!=='operator'||actor.role!=='operator')throw new PublicationError('Owner access required.');
  const database=db();database.exec('BEGIN IMMEDIATE');
  try{
    const row=database.prepare("SELECT hidden FROM receipt_publication WHERE prediction_id=? AND visibility='public'").get(id);
    if(!row)throw new PublicationError('Public receipt not found.');
    if(!row.hidden){database.prepare('UPDATE receipt_publication SET hidden=1 WHERE prediction_id=?').run(id);publicationEvent(id,'hidden_for_abuse',actor.id);}
    database.exec('COMMIT');
  }catch(error){database.exec('ROLLBACK');throw error;}
}
