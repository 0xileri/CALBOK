'use client';
import type {RecallReview} from '@/lib/recall-types';
export function RecallSummary({review,onOpen}:{review:RecallReview|null;onOpen:(id:string)=>void}){
 if(!review)return <p className="recall-empty">No completed prior memory has been cited on this receipt yet.</p>;
 const caution=review.priority==='caution'&&review.contextual.total>=5&&review.contextual.rate!==null&&Number(review.contextual.rate)<40&&review.citedIds.length>=5&&review.sqlCitation.rows.length>=5;
 return <section className={caution?'recall-summary caution-banner':'recall-summary'} aria-label="Recalled memory context" role={caution?'alert':undefined}>
  <h3>{caution?'Caution: this matching history has a low win rate':'Recalled memory context'}</h3>
  <p><strong>{review.citedIds.length} prior {review.citedIds.length===1?'memory':'memories'} cited · {caution?'Caution applied':'Caution not applied'}</strong></p>
  <p>Matching win rate: {review.contextual.rate===null?'—':review.contextual.rate+'%'}. Caution requires at least five matching verified wins/losses, a win rate under 40%, and memory completion before this lock.</p>
  <p>Caller baseline: {review.baseline.rate===null?'—':review.baseline.rate+'%'} across {review.baseline.total} scored calls.</p>
  <ul>{review.citedIds.map(id=><li key={id}><button className="text-button" onClick={()=>onOpen(id)}>{id}</button>{review.sqlCitation.rows.find(row=>row.receiptId===id)?.seriesId&&<small> scheduled repeat by owner, series {review.sqlCitation.rows.find(row=>row.receiptId===id)?.seriesId}</small>}</li>)}</ul>
  <details><summary>SQL citation · verified receipt and blob links</summary><pre>{review.sqlCitation.query}</pre><pre>{JSON.stringify({parameters:review.sqlCitation.parameters,rows:review.sqlCitation.rows},null,2)}</pre></details>
 </section>;
}
