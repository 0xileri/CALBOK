'use client';
import {useEffect,useState} from 'react';
type Setup={configured:boolean;missing:string[];invalid:string[]};
export function EmailSetup(){
 const [setup,setSetup]=useState<Setup|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{const controller=new AbortController();fetch('/api/auth',{signal:controller.signal,cache:'no-store'}).then(r=>r.json()).then(data=>setSetup(data.emailSetup||null)).catch(()=>{if(!controller.signal.aborted)setMessage('Email setup status could not be checked.');});return()=>controller.abort();},[]);
 async function test(){setBusy(true);setMessage('');try{const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'test-email'})});const data=await r.json();setMessage(data.error||data.message);}catch{setMessage('Email test could not be completed.');}finally{setBusy(false);}}
 return <section className="panel operator-settings"><h3>Email sign-in setup</h3>{setup?<>{!setup.configured?<p role="alert">Email setup needs attention. {setup.missing.length>0&&`Missing: ${setup.missing.join(', ')}. `}{setup.invalid.length>0&&`Invalid format: ${setup.invalid.join(', ')}. `}Use a verified Resend sender and a session secret of at least 32 characters.</p>:<p>All four email settings are present. Send a test to check provider acceptance, then confirm delivery in your inbox.</p>}<button className="button secondary" disabled={!setup.configured||busy} onClick={()=>void test()}>Send owner sign-in test</button></>:<p>Checking email setup…</p>}{message&&<p role="status">{message}</p>}</section>;
}
