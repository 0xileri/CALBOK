import Link from 'next/link';
export function AccessPrompt({next='/my-calls'}:{next?:string}){return <main className="narrow-page"><div className="page-intro"><h1>Your calls start here.</h1><p>Sign in with your email to log a call and track your results.</p></div><Link className="primary-action" href={'/signin?next='+encodeURIComponent(next)}>Sign in</Link></main>;}
