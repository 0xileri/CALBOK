import {z} from 'zod';
import {db} from './db';
import type {Principal} from './auth';
export const profileSchema=z.object({displayName:z.string().trim().max(60).refine(value=>!/[\u0000-\u001f\u007f-\u009f]/.test(value),'Use a single-line display name without control characters.')}).strict();
function schema(){db().exec('CREATE TABLE IF NOT EXISTS account_profiles(user_id TEXT PRIMARY KEY,display_name TEXT NOT NULL,updated_at TEXT NOT NULL)');}
export function accountDetails(user:Principal){schema();const row=db().prepare('SELECT display_name FROM account_profiles WHERE user_id=?').get(user.id) as {display_name:string}|undefined;return {role:user.role,email:user.email,displayName:row?.display_name||''};}
export function saveAccountProfile(user:Principal,input:unknown){const parsed=profileSchema.parse(input);schema();db().prepare('INSERT INTO account_profiles VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name,updated_at=excluded.updated_at').run(user.id,parsed.displayName,new Date().toISOString());return accountDetails(user);}
