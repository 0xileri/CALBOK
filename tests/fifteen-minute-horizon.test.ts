import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {warning,type History} from '../lib/domain';
import {draftFields} from '../lib/draft-fields';
import {horizonLabels} from '../lib/horizons';
import {CallReview} from '../components/call-review';

test('15m draft and confirmation label preserve explicitly selected terms',()=>{
 const draft=draftFields.parse({caller:'TEST',text:'SYNTHETIC 15m prediction',asset:'BTC',direction:'bearish',horizon:'15m',sourceUrl:''});
 assert.equal(draft.horizon,'15m');assert.equal(horizonLabels['15m'],'15 minutes');
 const html=renderToStaticMarkup(createElement(CallReview,{draft,asset:{id:'BTC',symbol:'BTC',name:'Bitcoin',provider:'Tatum'}}));
 assert.match(html,/15 minutes from the server lock time/);
});

test('15m caution never merges horizons, callers, assets or directions into existing groups',()=>{
 const group={caller:'TEST',asset:'BTC',direction:'bearish',horizon:'15m'};
 const history:History[]=['15m','1h','24h'].flatMap(horizon=>Array.from({length:5},(_,i)=>({...group,horizon,id:horizon+i,outcome:horizon==='15m'?'lost':'won',verified:true})));
 const ids=history.map(row=>row.id);
 assert.equal(warning(group,history,ids).priority,'caution');
 for(const horizon of ['1h','24h']){const review=warning({...group,horizon},history,ids);assert.equal(review.contextual.total,5);assert.equal(review.contextual.rate,'100.0');assert.equal(review.priority,'informational');}
 for(const mismatch of [{caller:'OTHER'},{asset:'ETH'},{direction:'bullish'}])assert.equal(warning({...group,...mismatch},history,ids).contextual.total,0);
 assert.deepEqual(warning(group,history,ids).citedIds,history.filter(row=>row.horizon==='15m').map(row=>row.id));
});
