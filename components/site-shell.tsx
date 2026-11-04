'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import type {AccountIdentity} from './account-profile';
import {BrandMark} from './brand';
import {receiptIdFromFragment} from '@/lib/receipt-links';
import {callPath} from '@/lib/call-presentation';

type Session={loading:boolean;user:AccountIdentity|null;emailAvailable:boolean;publicSignup:boolean};
const SessionContext=createContext<Session>({loading:true,user:null,emailAvailable:false,publicSignup:false});
export const useSession=()=>useContext(SessionContext);
export function SiteShell({children}:{children:ReactNode}){
  const [session,setSession]=useState<Session>({loading:true,user:null,emailAvailable:false,publicSignup:false});
  const path=usePathname();
  useEffect(()=>{if(path!=='/')return;const id=receiptIdFromFragment(window.location.hash);if(id)window.location.replace(callPath(id));else if(window.location.hash==='#signin')window.location.replace('/signin');},[path]);
  useEffect(()=>{let active=true;fetch('/api/auth',{cache:'no-store'}).then(r=>r.json()).then(data=>{if(active)setSession({...data,loading:false});}).catch(()=>{if(active)setSession({loading:false,user:null,emailAvailable:false,publicSignup:false});});return()=>{active=false;};},[path]);
  return <SessionContext.Provider value={session}><div className="simple-site">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="site-header"><Link className="site-logo" href="/" aria-label="CALBOK home"><BrandMark/>CALBOK<span className="logo-dot">.</span></Link>
      <nav aria-label="Main navigation">{[['/feed','Feed'],['/log','Log a call'],['/my-calls','My calls']].map(([href,label])=><Link key={href} href={href} aria-current={path===href?'page':undefined}>{label}</Link>)}
        {session.user?<details className="account-menu"><summary>Account</summary><div><Link href="/account">Profile</Link>{session.user.role==='operator'&&<Link href="/admin">Admin</Link>}<button onClick={async()=>{const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});if(r.ok)window.location.assign(window.location.origin+'/');}}>Sign out</button></div></details>:<Link href="/signin" aria-current={path==='/signin'?'page':undefined}>Sign in</Link>}
      </nav>
    </header>
    <div id="main-content" className="site-content" tabIndex={-1}>{children}</div>
    <footer className="site-footer"><Link href="/">CALBOK</Link><span>Real calls. Checked results.</span><span>Self-logged calls, not financial advice.</span></footer>
  </div></SessionContext.Provider>;
}
