import {publicationSchema,publicHandle,PublicationError} from './publication';
import {z} from 'zod';
import {db} from './db';
import type {Principal} from './auth';
export const profileSchema=z.object({publicHandle:z.string().trim().toLowerCase().refine(value=>value===''||/^[a-z0-9_]{3,30}$/.test(value),'Use 3–30 letters, numbers or underscores for your public username.').optional(),displayName:z.string().trim().max(60).refine(value=>!/[\u0000-\u001f\u007f-\u009f]/.test(value),'Use a single-line display name without control characters.')}).strict();
function schema(){db().exec('CREATE TABLE IF NOT EXISTS account_profiles(user_id TEXT PRIMARY KEY,display_name TEXT NOT NULL,updated_at TEXT NOT NULL)');}
export function accountDetails(user:Principal){schema();const row=db().prepare('SELECT display_name FROM account_profiles WHERE user_id=?').get(user.id) as {display_name:string}|undefined;return {role:user.role,email:user.email,displayName:row?.display_name||'',publicHandle:publicHandle(user.id)};}
export function saveAccountProfile(user:Principal,input:unknown){
 const parsed=profileSchema.parse(input);schema();publicationSchema();const database=db();database.exec('BEGIN IMMEDIATE');
 try{
  if(parsed.publicHandle!==undefined){
   if(!parsed.publicHandle){
    if(database.prepare("SELECT 1 FROM receipt_publication v LEFT JOIN prediction_owners o USING(prediction_id) WHERE COALESCE(o.owner_id,'operator')=? AND v.visibility='public'").get(user.id))throw new PublicationError('A public username is required while you have published calls.');
    database.prepare('DELETE FROM public_handles WHERE user_id=?').run(user.id);
   }else{
    const claimed=database.prepare('SELECT user_id FROM public_handles WHERE handle=?').get(parsed.publicHandle);
    if(claimed&&claimed.user_id!==user.id)throw new PublicationError('That public username is already taken.');
    database.prepare('INSERT INTO public_handles VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET handle=excluded.handle').run(user.id,parsed.publicHandle);
   }
  }
  database.prepare('INSERT INTO account_profiles VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name,updated_at=excluded.updated_at').run(user.id,parsed.displayName,new Date().toISOString());
  database.exec('COMMIT');return accountDetails(user);
 }catch(error){database.exec('ROLLBACK');throw error;}
}
