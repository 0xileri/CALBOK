import {horizonLabels} from '@/lib/horizons';
import {useEffect,useRef} from 'react';
import type {Asset} from '@/lib/assets';

export function CallReview({draft,asset}:{draft:Record<string,string>;asset:Asset}) {
  const preview=useRef<HTMLDivElement>(null);
  useEffect(()=>{preview.current?.focus();},[]);
  return <div ref={preview} className="call-review" aria-label="Call review" tabIndex={-1}>
    <span className="eyebrow">READY TO GO ON RECORD</span>
    <blockquote>{draft.text}</blockquote>
    <dl className="receipt-facts"><dt>Caller</dt><dd>{draft.caller}</dd><dt>Market</dt><dd>{asset.symbol} · {asset.provider}{asset.chain?` · ${asset.chain}`:''}</dd><dt>Exact market ID</dt><dd className="market-id">{asset.id}</dd><dt>Direction</dt><dd>{draft.direction==='bullish'?'Higher / bullish':'Lower / bearish'}</dd><dt>Horizon</dt><dd>{horizonLabels[draft.horizon]||draft.horizon} from the server lock time</dd><dt>Deadline</dt><dd>Assigned when you confirm. Reviewing does not start the clock.</dd><dt>Source</dt><dd className="market-id">{draft.sourceUrl||'No source URL supplied'}</dd></dl>
    <div className="form-note"><p>The structured market, direction and horizon control scoring. Check that they agree with the original text. Caller identity and source authorship are unverified; future pricing coverage is checked at settlement.</p></div>
    <p className="review-lock-note">Confirmation creates an immutable receipt. Its text, market and deadline cannot be edited afterward.</p>
  </div>;
}
