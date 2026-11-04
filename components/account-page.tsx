'use client';
import {useState} from 'react';
import {useSession} from './site-shell';
import {AccessPrompt} from './access-prompt';
import {AccountProfile,type AccountIdentity} from './account-profile';
export function AccountPage(){
 const session=useSession(),[edited,setEdited]=useState<AccountIdentity|null>(null),[error,setError]=useState('');
 if(session.loading)return <main><p role="status">Loading account…</p></main>;
 if(!session.user)return <AccessPrompt next="/account"/>;
 async function save(displayName:string,publicHandle?:string){const r=await fetch('/api/profile',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({displayName,publicHandle})});const d=await r.json();if(!r.ok)throw Error(d.error);setEdited(d.user);}
 async function signOut(){const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});if(r.ok)window.location.assign(window.location.origin+'/');else setError('Could not sign out. Please try again.');}
 return <main className="narrow-page"><header className="page-intro"><h1>Your account</h1><p>Choose the public username shown beside your calls.</p></header><AccountProfile user={edited||session.user} onSave={save} onSignOut={()=>void signOut()}/>{error&&<p role="alert">{error}</p>}</main>;
}
