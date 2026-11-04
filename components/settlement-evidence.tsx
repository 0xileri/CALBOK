import type {Receipt} from '@/lib/db';
import type {Candle} from '@/lib/domain';
import {profileOutcome} from '@/lib/caller-profiles';

export function SettlementEvidence({receipt,entryPrice}:{receipt:Receipt;entryPrice?:{candle:string|null;error:string|null}}) {
  const outcome=profileOutcome(receipt);
  let raw:unknown;
  try {raw=receipt.evidence?JSON.parse(receipt.evidence):null;} catch {raw=null;}
  const supported=['won','lost','neutral'].includes(outcome);
  const evidence=supported?raw as {entry:Candle;exit:Candle;returnPct:string;provider:string}:null;
  let entry:Candle|undefined;
  try { entry=entryPrice?.candle?JSON.parse(entryPrice.candle):undefined; } catch { entry=undefined; }
  return <section className="evidence-reader" aria-label="Settlement explanation"><span className="eyebrow">HOW THE CALL WAS SCORED</span>
    <div className="evidence-prices"><div><small>Verified lock entry · USD candle open</small>
      <strong>{evidence?.entry.open||entry?.open||'Awaiting eligible price evidence'}</strong>
      <p>The first finalized one-minute candle at or after the server lock time supplies the scoring entry.</p>
      {entry&&<time dateTime={new Date(entry.openTime).toISOString()}>{new Date(entry.openTime).toUTCString()}</time>}
      {entryPrice?.error&&<p>{entryPrice.error==='TATUM_PRICE_BOUNDARY_UNAVAILABLE'?'The provider returned a different historical minute. Manual review is required.':'The provider has not supplied an eligible finalized entry candle. Automatic entry checks continue.'}</p>}
    </div></div><h3>{evidence?`Recorded outcome: ${outcome}`:outcome==='pending'?'Evidence is still pending.':'This result could not be reproduced.'}</h3>{evidence?<><div className="evidence-prices">{[['Entry',evidence.entry],['Exit',evidence.exit]].map(([label,candle])=>{const row=candle as Candle;return <div key={label as string}><small>{label as string} · USD candle open</small><strong>{row.open}</strong><time dateTime={new Date(row.openTime).toISOString()}>{new Date(row.openTime).toUTCString()}</time><span>Finalized {new Date(row.closeTime).toUTCString()}</span></div>;})}</div><p className="evidence-change"><span>Market price change</span><strong>{evidence.returnPct}%</strong></p><p>{receipt.direction==='bullish'?'This call required a higher exit price.':'This call required a lower exit price.'} {outcome==='neutral'?'Entry and exit prices were equal.':outcome==='won'?'The price moved in the called direction.':'The price moved against the called direction.'} Price change is not a trading return and excludes fees.</p><p>Source: {evidence.provider} · {evidence.entry.product||receipt.asset}. The stored candles reproduce this verdict under {receipt.method}.</p></>:<p>{outcome==='pending'?'No entry/exit comparison is shown until eligible pricing evidence is recorded. Open Check settlement after the deadline, or let the automatic worker check.':'The stored result or candle evidence does not pass the scoring checks. It is excluded from verified profile totals.'}</p>}<details><summary>Read the scoring rule</summary><p>Use the first finalized one-minute candle that opens at or after each boundary, within 60 seconds. Compare exit open with entry open. Higher wins for bullish; lower wins for bearish; equal is neutral. Missing eligible candles never substitute a nearby price.</p><p>Boundaries: server lock time and locked deadline. A source URL does not verify authorship.</p></details>{receipt.evidence&&<details><summary>View raw settlement evidence</summary><pre>{raw?JSON.stringify(raw,null,2):'Stored evidence is not valid JSON.'}</pre></details>}</section>;
}
