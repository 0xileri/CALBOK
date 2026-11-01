import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import type {Receipt} from '../lib/db';
import {integrationProof,type CompletionProof} from '../lib/integration-proof';
import {warning} from '../lib/domain';
function receipt(id:string):Receipt{const snapshot=JSON.stringify({id,test:'SYNTHETIC PROOF TEST ONLY'}),candle=(time:number,open:string)=>({openTime:time,closeTime:time+60_000,open,high:'120',low:'80',close:open,hash:'a'.repeat(64)});return {id,caller:'TEST',asset:'BTC',asset_symbol:'BTC',asset_provider:'Tatum',direction:'bullish',horizon:'24h',text:'SYNTHETIC PROOF TEST ONLY',source_url:'',locked_at:new Date(0).toISOString(),deadline:new Date(86400_000).toISOString(),snapshot,snapshot_hash:createHash('sha256').update(snapshot).digest('hex'),provenance:'self_logged_before_outcome',outcome:'lost',method:'directional-open-v1',evidence:JSON.stringify({asset:'BTC',provider:'Tatum',outcome:'lost',returnPct:'-10.00000000',entry:candle(0,'100'),exit:candle(86400_000,'90')})};}
test('integration proof counts evidence, not configuration, pending jobs or unsupported verdicts',()=>{
 const rows=Array.from({length:5},(_,i)=>receipt('CB-'+i));const proofs:CompletionProof[]=rows.map(row=>({prediction_id:row.id,job_id:'job-'+row.id,blob_id:'blob-'+row.id,network:'mainnet',completed_at:'1970-01-03T00:00:00.000Z'}));const jobs=proofs.map(row=>({...row,status:'done',namespace:'TEST'}));
 assert.equal(integrationProof([],[],[],[],[]).mainnetCompleted,0);assert.equal(integrationProof(rows,jobs,[],[],[]).mainnetCompleted,0);
 const summary=integrationProof(rows,jobs,proofs,[],[]);assert.equal(summary.locked,5);assert.equal(summary.settled,5);assert.equal(summary.mainnetCompleted,5);assert.equal(summary.recalls.length,0);
 assert.equal(integrationProof(rows,jobs,proofs.map(row=>({...row,network:'testnet'})),[],[]).mainnetCompleted,0);
 assert.equal(integrationProof(rows,jobs.map(row=>({...row,status:'running'})),proofs,[],[]).mainnetCompleted,0);
 assert.equal(integrationProof(rows,jobs,proofs.map(row=>({...row,blob_id:'same'})),[],[]).mainnetCompleted,0);
 assert.equal(integrationProof(rows.map(row=>({...row,snapshot_hash:'bad'})),jobs,proofs,[],[]).locked,0);
 assert.equal(integrationProof(rows.map(row=>({...row,evidence:'bad'})),jobs,proofs,[],[]).settled,0);
 const history=rows.map(row=>({...row,outcome:'lost',verified:true})),review=warning(rows[0],history,rows.map(row=>row.id)),recall={prediction_id:rows[0].id,review:JSON.stringify(review),created_at:'1970-01-04T00:00:00.000Z'};
 const completed=integrationProof(rows,jobs,proofs,[recall],[]);assert.equal(completed.recalls.length,1);assert.equal(completed.stages[4].count,0);const later={...receipt('CB-later'),outcome:null,evidence:null,method:null,locked_at:'1970-01-04T00:00:00.000Z',deadline:'1970-01-05T00:00:00.000Z'};const laterRecall={...recall,prediction_id:later.id,created_at:'1970-01-06T00:00:00.000Z'};assert.equal(integrationProof([...rows,later],jobs,proofs,[laterRecall],[]).stages[4].count,1);assert.equal(completed.recalls[0].citedIds.length,5);
 assert.equal(integrationProof(rows,jobs,proofs,[{...recall,created_at:'1970-01-02T00:00:00.000Z'}],[]).recalls.length,0);
 assert.equal(integrationProof(rows,jobs,proofs,[{...recall,review:'not-json'}],[]).recalls.length,0);
});
