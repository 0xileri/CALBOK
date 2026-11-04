import Link from 'next/link';
import {HomeTicker} from '@/components/home-ticker';
import {publicHomeData} from '@/lib/public-feed';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export default function Home(){const initialData=publicHomeData(24);return <main className="calls-home">
 <HomeTicker initialData={initialData}><div className="hero-copy"><span className="overline">REAL CALLS. LIVE RESULTS.</span><h1>Lock a crypto call before it happens.<br/><span>See who’s actually right.</span></h1><p>The call stays locked.<br/>The market decides the result.</p><Link className="primary-action" href="/log">Log a call <span aria-hidden="true">↗</span></Link><Link className="hero-feed-link" href="/feed">Explore the feed →</Link></div></HomeTicker>
 <section className="how-it-works" aria-labelledby="how-heading"><div className="section-top"><h2 id="how-heading">A call. A result. A lesson.</h2></div><ol>{[{title:'Lock',text:'Pick a coin, a direction and a window. Confirm your call before the clock starts.'},{title:'Settle',text:'After the deadline, checked price data determines whether the call won or lost.'},{title:'Remember',text:'Completed outcomes become memory that can add context to your next call.'}].map((step,i)=><li key={step.title}><span>0{i+1}</span><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol></section>
 </main>;}
