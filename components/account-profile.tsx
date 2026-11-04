'use client';
import {AccountSessions} from './account-sessions';
import {useState} from 'react';
export type AccountIdentity={role:'operator'|'user';email:string|null;displayName?:string;publicHandle?:string};
export function accountInitials(email:string|null|undefined,displayName?:string){const parts=displayName?.trim().split(/\s+/).filter(Boolean);return parts?.length?(parts.length>1?Array.from(parts[0])[0]+Array.from(parts[parts.length-1])[0]:Array.from(parts[0]).slice(0,2).join('')).toUpperCase():email?Array.from(email.split('@')[0]).slice(0,2).join('').toUpperCase():'YO';}
export function AccountProfile({user,onSignOut,onSave}:{user:AccountIdentity|null;onSignOut:()=>void;onSave:(displayName:string,publicHandle?:string)=>Promise<void>}) {
 const [handle,setHandle]=useState(user?.publicHandle||''),[name,setName]=useState(user?.displayName||''),[saving,setSaving]=useState(false),[message,setMessage]=useState('');
 return <section className="panel" style={{padding:24}}><form className="clean-form" onSubmit={async event=>{event.preventDefault();setSaving(true);setMessage('');try{await onSave(name.trim(),handle.trim().toLowerCase());setName(name.trim());setHandle(handle.trim().toLowerCase());setMessage('Profile saved.');}catch(error){setMessage(error instanceof Error?error.message:'Could not save your profile.');}finally{setSaving(false);}}}>
  <label>Public username<input name="publicHandle" minLength={3} maxLength={30} pattern="[a-zA-Z0-9_]{3,30}" autoComplete="username" placeholder="your_username" value={handle} disabled={saving} onChange={event=>setHandle(event.target.value)}/></label>
  <p className="form-help">Shown beside your public calls. Use 3–30 letters, numbers or underscores. Your email stays private.</p>
  <details><summary>Display name (optional)</summary><label>Display name<input name="displayName" maxLength={60} autoComplete="nickname" value={name} onChange={event=>setName(event.target.value)}/></label><p className="form-help">For your account only. This does not change caller names.</p></details>
  <button className="primary-action" disabled={saving||(name.trim()===(user?.displayName||'')&&handle.trim()===(user?.publicHandle||''))}>{saving?'Saving…':'Save profile'}</button>{message&&<p role="status">{message}</p>}
 </form><details className="proof-details"><summary>Account details and sessions</summary><div><p>Sign-in email: {user?.email||'Owner-key session'}</p><p>Sessions expire after seven days.</p><AccountSessions/></div></details><button className="quiet-button" onClick={onSignOut}>Sign out</button></section>;
}
