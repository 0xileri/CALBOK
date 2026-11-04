import Link from 'next/link';
import {PublicFeedModeration} from './publication-controls';
import {callerPath,type PublicFeed,type PublicCaller,type FeedQuery} from '@/lib/public-feed';
import {horizonLabels} from '@/lib/horizons';

export function PublicFeedView({feed,query,caller}:{feed:PublicFeed;query:FeedQuery;caller?:PublicCaller}){
  const path=caller?callerPath(caller.caller):'/feed';
  function pageLink(page:number){const params=new URLSearchParams();for(const [key,value] of Object.entries(query))if(value!==''&&key!=='page')params.set(key,String(value));params.set('page',String(page));return path+'?'+params;}
  return <main className="public-feed-page">
    <nav><Link href="/">CALBOK</Link><Link href="/feed">Live calls</Link><Link href="/proof">Integration proof</Link><Link href="/#signin">Sign in</Link></nav>
    <header><span className="eyebrow">PUBLIC · OPT-IN RECEIPTS</span><h1>{caller?caller.caller:'Live calls'}</h1>
      <p>Self-logged before outcome. Caller labels and public usernames do not verify authorship or identity. Only published, visible receipts appear here.</p></header>
    {caller&&<section className="panel public-caller-record"><h2>Verified public record</h2><p>{caller.record.settled} verified settled · {caller.record.scored} wins/losses · {caller.record.winRate===null?'No win rate yet':caller.record.winRate+'% wins'}</p><p>Private, hidden, pending and unverified calls do not contribute. Neutral results are excluded from win rate.</p>
      {caller.record.byHorizon.map(group=><p key={group.horizon}>{horizonLabels[group.horizon]||group.horizon}: {group.count} settled · {group.wins} won / {group.losses} lost · {group.winRate===null?'—':group.winRate+'% wins'}</p>)}
    </section>}
    <form className="panel public-feed-filters" method="GET" action={path}>
      {!caller&&<label>Caller<input name="caller" maxLength={60} defaultValue={query.caller} placeholder="@caller"/></label>}
      <label>Exact asset<input name="asset" maxLength={120} defaultValue={query.asset} placeholder="BTC or gmgn:chain:contract"/></label>
      <label>Horizon<select name="horizon" defaultValue={query.horizon}><option value="">All horizons</option>{Object.entries(horizonLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <label>Outcome<select name="outcome" defaultValue={query.outcome}><option value="">All outcomes</option>{['pending','won','lost','neutral','unverified'].map(value=><option key={value} value={value}>{value}</option>)}</select></label>
      <button className="button primary">Filter calls</button><Link href={path}>Reset</Link>
    </form>
    <p>{feed.total} public call{feed.total===1?'':'s'} · page {feed.page}</p>
    {!feed.calls.length&&<section className="panel public-call"><h2>No public calls here yet.</h2><p>Existing receipts stay private until their logger explicitly publishes them. Nothing is generated to fill this feed.</p></section>}
    {feed.calls.map(call=><article className="panel public-call" id={call.id} key={call.id}>
      <header><span className="badge">{call.provenance}</span><span>Logged by @{call.loggedBy}</span></header>
      <h2><Link href={callerPath(call.caller)}>{call.caller}</Link> · {call.asset} · {call.direction}</h2>
      {call.ownerScheduled&&<p className="series-disclosure">Owner-scheduled repeat prediction, not a new caller post.</p>}
      <dl><dt>Horizon</dt><dd>{horizonLabels[call.horizon]||call.horizon}</dd><dt>Locked</dt><dd><time dateTime={call.locked_at}>{call.locked_at}</time></dd><dt>Deadline</dt><dd><time dateTime={call.deadline}>{call.deadline}</time></dd><dt>Status / outcome</dt><dd>{call.outcome}</dd><dt>Market change</dt><dd>{call.returnPct===null?'Awaiting verified evidence':call.returnPct+'%'}</dd><dt>Price provider</dt><dd>{call.provider||'Awaiting verified evidence'}</dd><dt>Receipt</dt><dd>{call.id}</dd><dt>Snapshot SHA-256</dt><dd>{call.snapshotHash}</dd><dt>Mainnet memory blob ID</dt><dd>{call.blobId||'Completion proof pending'}</dd></dl>
    </article>)}
    <PublicFeedModeration ids={feed.calls.map(call=>call.id)}/><nav aria-label="Feed pagination">{feed.page>1&&<Link href={pageLink(feed.page-1)}>Previous</Link>}{feed.hasMore&&<Link href={pageLink(feed.page+1)}>Next</Link>}</nav>
  </main>;
}
