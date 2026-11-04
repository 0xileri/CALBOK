import Link from 'next/link';
import {HomeTicker} from '@/components/home-ticker';
export default function Home(){return <main className="clean-home">
 <section className="home-intro"><span className="overline">LESS TALK. MORE TRACK RECORD.</span><h1>Lock a crypto call before it happens.<br/><span>See who’s actually right.</span></h1><p>The call stays locked. The market decides the result.</p><Link className="primary-action" href="/log">Log a call <span aria-hidden="true">↗</span></Link></section>
 <HomeTicker/>
 <section className="how-it-works" aria-labelledby="how-heading"><div className="section-top"><h2 id="how-heading">A call. A result. A lesson.</h2></div><ol>{[{title:'Lock',text:'Pick a coin, a direction and a window. Confirm your call before the clock starts.'},{title:'Settle',text:'After the deadline, checked price data determines whether the call won or lost.'},{title:'Remember',text:'Completed outcomes become memory that can add context to your next call.'}].map((step,i)=><li key={step.title}><span>0{i+1}</span><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol></section>
 </main>;}
