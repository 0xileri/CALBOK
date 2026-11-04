import Link from 'next/link';
import {callerPath,type PublicFeed,type PublicCaller,type FeedQuery} from '@/lib/public-feed';
import {horizonLabels} from '@/lib/horizons';
import {CallCard} from './call-card';
export function PublicFeedView({feed,query,caller}:{feed:PublicFeed;query:FeedQuery;caller?:PublicCaller}){
 const path=caller?callerPath(caller.caller):'/feed',now=new Date().getTime();
 function pageLink(page:number){const params=new URLSearchParams();for(const [key,value] of Object.entries(query))if(value!==''&&key!=='page')params.set(key,String(value));params.set('page',String(page));return path+'?'+params;}
 return <main>
  <header className="page-intro"><span className="overline">{caller?'CALLER RECORD':'PUBLIC CALLS'}</span><h1>{caller?caller.caller:'See the calls. Follow the results.'}</h1><p>{caller?'A record of public calls, checked against real price data.':'Real predictions, locked before the result. No hindsight edits.'}</p></header>
  {caller&&<><div className="caller-stats"><div><strong>{caller.record.winRate===null?'—':caller.record.winRate+'%'}</strong><span>Win rate</span></div><div><strong>{caller.record.scored}</strong><span>Won or lost</span></div><div><strong>{caller.total}</strong><span>Public calls</span></div></div><details className="horizon-breakdown"><summary>Results by window</summary>{caller.record.byHorizon.map(group=><p key={group.horizon}>{horizonLabels[group.horizon]} · {group.count} settled · {group.wins} won / {group.losses} lost · {group.winRate===null?'—':group.winRate+'% wins'}</p>)}<p className="form-help">Only public, visible calls with checked results count. Neutral calls do not affect win rate.</p></details></>}
  <form className="clean-filters" method="GET" action={path}>
   {!caller&&<label>Caller<input name="caller" maxLength={60} defaultValue={query.caller} placeholder="Any caller"/></label>}
   <label>Asset<input name="asset" maxLength={120} defaultValue={query.asset} placeholder="Any asset"/></label>
   <label>Window<select name="horizon" defaultValue={query.horizon}><option value="">All windows</option>{Object.entries(horizonLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
   <label>Result<select name="outcome" defaultValue={query.outcome}><option value="">All results</option>{[['pending','Open'],['won','Won'],['lost','Lost'],['neutral','Neutral'],['unverified','Needs review']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><button className="button secondary">Apply filters</button>
  </form>
  {feed.calls.length?<div className="clean-call-grid">{feed.calls.map(call=><CallCard key={call.id} call={call} now={now}/>)}</div>:<section className="clean-empty"><h2>No public calls yet.</h2><p>Try another filter, or be the first to log one.</p><Link className="primary-action" href="/log">Log a call</Link></section>}
  <nav className="clean-pagination" aria-label="Feed pagination"><span>{feed.total} calls · Page {feed.page}</span>{feed.page>1&&<Link href={pageLink(feed.page-1)}>Previous</Link>}{feed.hasMore&&<Link href={pageLink(feed.page+1)}>Next</Link>}{(query.caller||query.asset||query.horizon||query.outcome)&&<Link href={path}>Clear filters</Link>}</nav>
  <p className="form-help">Calls are self-logged before outcome. Caller names are not verified identities.</p>
 </main>;
}
