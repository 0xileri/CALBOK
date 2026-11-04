import type {PublicProof} from '@/lib/public-proof';
import Link from 'next/link';

export function PublicProofView({proof}:{proof:PublicProof}) {
  return <main style={{maxWidth:1100,margin:'auto',padding:'48px 24px'}}>
    <Link href="/">CALBOK · Open your journal</Link><h1>Public integration proof</h1>
    <p>The owner&apos;s published, visible, reproducible evidence. Private and hidden calls are excluded. Your own account starts empty. This page performs no provider requests or memory writes.</p>
    <p>Checked {proof.checkedAt}. Missing proof is not proof of failure.</p>
    <section aria-label="Integration proof stages">{proof.stages.map(stage=><p key={stage.key}><strong>{stage.count}</strong> · {stage.label}</p>)}</section>
    <p>Memory completion records describe the configured Walrus Mainnet path, rather than independent chain attestations. Returns are directional market changes, not trading returns.</p>
    <section aria-label="Settled public receipts">{proof.receipts.map(row=><article className="panel" id={row.id} key={row.id} style={{padding:24,marginTop:16,overflowWrap:'anywhere'}}>
      <h2>{row.asset} · {row.direction} · {row.horizon}</h2><a href={'#'+row.id}>{row.id}</a>
      {row.ownerScheduled&&<p>Owner-scheduled repeat prediction, not a new caller post.</p>}
      <dl><dt>Outcome</dt><dd>{row.outcome}</dd><dt>Market change</dt><dd>{row.returnPct}%</dd><dt>Price provider</dt><dd>{row.provider}</dd><dt>Snapshot SHA-256</dt><dd>{row.snapshotHash}</dd><dt>Mainnet memory blob ID</dt><dd>{row.blobId||'Completion proof pending'}</dd></dl>
    </article>)}</section>
    {!proof.receipts.length&&<p>No qualifying settled receipts yet.</p>}
  </main>;
}
