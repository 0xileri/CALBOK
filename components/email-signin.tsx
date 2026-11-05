'use client';
import Link from 'next/link';
import {useState} from 'react';
import {useSession} from './site-shell';

export function EmailSignIn({next}:{next:string}){
 const session=useSession(),[email,setEmail]=useState(''),[code,setCode]=useState(''),[id,setId]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[failed,setFailed]=useState(false);
 async function submit(){setBusy(true);setMessage('');setFailed(false);try{const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(id?{action:'verify',id,code}:{action:'request',email})});const d=await r.json();if(!r.ok)throw Error(d.error||'Sign-in is unavailable.');if(d.id){setId(d.id);setMessage('If your email can sign in, a code is on its way.');}else window.location.assign(next);}catch(error){setFailed(true);setMessage(error instanceof Error?error.message:'Please try again.');}finally{setBusy(false);}}
 if(session.user)return <main className="clean-auth"><header className="page-intro"><h1>You’re signed in.</h1></header><Link className="primary-action" href={next}>Continue →</Link></main>;
 return <main className="clean-auth"><header className="page-intro"><span className="overline">WELCOME TO CALBOK</span><h1>{id?'Check your email.':'Log in to your account'}</h1><p>{id?'Enter the eight-digit code. It works once and expires in 10 minutes.':'Enter your email. We’ll send a one-time sign-in code.'}</p></header>
  <form onSubmit={event=>{event.preventDefault();void submit();}}>{id?<label>One-time code<input autoFocus required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" maxLength={8} value={code} onChange={event=>setCode(event.target.value)}/></label>:<label>Email<input required type="email" autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)}/></label>}
   <button className="primary-action" disabled={busy||session.loading||!session.emailAvailable}>{busy?'One moment…':id?'Sign in':'Send me a code'}</button>
   {!session.loading&&!session.emailAvailable&&<p role="status" className="form-help">Email sign-in is temporarily unavailable. Please try again later.</p>}
   {!session.loading&&session.emailAvailable&&!session.publicSignup&&<p className="form-help">Sign-in is currently limited to existing owner access.</p>}
   {message&&<p role={failed?'alert':'status'} className={failed?'form-message':'form-help'}>{message}</p>}
  </form><div className="auth-explore">Just looking around? <Link href="/feed">Explore live calls ↗</Link></div>{id&&<button className="quiet-button auth-back" onClick={()=>{setId('');setCode('');setMessage('');}}>Use another email</button>}
 </main>;
}
