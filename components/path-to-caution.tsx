import type {IntegrationProof} from '@/lib/integration-proof';
export function PathToCaution({groups}:{groups:IntegrationProof['groups']}){
 return <section className="path-to-caution" aria-label="Path to caution"><h3>Path to caution</h3>
  <p>Five completed, verified wins/losses in the same caller, asset, direction and horizon make a new lock eligible for caution review. Caution applies only below a 40% win rate. Neutral outcomes do not count toward five.</p>
  {groups.length?<div className="caution-groups">{groups.map(group=><article key={group.key} className={group.closest?'caution-group closest':'caution-group'}>
   <h4>{group.caller} · {group.asset}</h4><p>{group.direction} · {group.horizon}</p>
   {group.closest&&<span className="badge">Closest to threshold</span>}
   <dl><dt>Completed scored memories</dt><dd>{group.count}/5</dd><dt>Win rate</dt><dd>{group.winRate===null?'—':group.winRate+'%'}</dd><dt>Next settlement</dt><dd>{group.nextSettlementAt?<><time dateTime={group.nextSettlementAt}>{new Date(group.nextSettlementAt).toUTCString()}</time><small>Earliest finalized exit candle; provider confirmation and queue capacity may take longer.</small></>:'No pending call in this group'}</dd></dl>
  </article>)}</div>:<p>Lock a genuine call to start a group.</p>}
 </section>;
}
