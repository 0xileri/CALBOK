import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import type {Receipt} from '../lib/db';
import {integrationProof,completedMemoryProofs,recallComparison,type CompletionProof} from '../lib/integration-proof';
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
 const completed=integrationProof(rows,jobs,proofs,[recall],[]);assert.equal(completed.recalls.length,1);assert.equal(completed.stages[3].count,0);assert.equal(completed.stages[4].count,0);const later={...receipt('CB-later'),outcome:null,evidence:null,method:null,locked_at:'1970-01-04T00:00:00.000Z',deadline:'1970-01-05T00:00:00.000Z'};const laterRecall={...recall,prediction_id:later.id,created_at:'1970-01-06T00:00:00.000Z'};assert.equal(integrationProof([...rows,later],jobs,proofs,[laterRecall],[]).stages[4].count,1);assert.equal(completed.recalls[0].citedIds.length,0);assert.equal(completed.recalls[0].retrievedIds.length,5);
 assert.equal(integrationProof(rows,jobs,proofs,[{...recall,created_at:'1970-01-02T00:00:00.000Z'}],[]).recalls.length,0);
 assert.equal(integrationProof(rows,jobs,proofs,[{...recall,review:'not-json'}],[]).recalls.length,0);
});

test('recall and proof use the same prior verified memory citations',()=>{
  const valid=Array.from({length:5},(_,i)=>receipt('CB-valid-'+i));
  const target={...receipt('CB-target'),outcome:null,evidence:null,locked_at:'1970-01-04T00:00:00.000Z',deadline:'1970-01-05T00:00:00.000Z'};
  const future=receipt('CB-future'),pending=receipt('CB-pending'),foreign=receipt('CB-foreign');
  const invalid={...receipt('CB-invalid'),evidence:'{malformed'};
  const rows=[...valid,target,future,pending,invalid];
  const proofs=[...valid,future,pending,foreign,invalid].map(row=>({prediction_id:row.id,job_id:'job-'+row.id,blob_id:'blob-'+row.id,network:'mainnet',completed_at:row===future?target.locked_at:'1970-01-03T00:00:00.000Z'}));
  const jobs=proofs.map(row=>({...row,status:row.prediction_id===pending.id?'running':'done',namespace:'TEST'}));
  const ids=proofs.map(row=>row.prediction_id);
  const comparison=recallComparison(target,rows,completedMemoryProofs(rows,jobs,proofs),ids);
  assert.deepEqual(comparison.citedIds,valid.map(row=>row.id));
  assert.equal(comparison.priority,'caution');
  const proof=integrationProof(rows,jobs,proofs,[{prediction_id:target.id,review:JSON.stringify({...comparison,retrievedIds:ids}),created_at:'1970-01-06T00:00:00.000Z'}],[{id:'invalid',evidence:'null',verified_at:target.locked_at}]);
  assert.deepEqual(proof.recalls[0].citedIds,comparison.citedIds);
  assert.equal(proof.recalls[0].priority,comparison.priority);
  assert.ok(proof.settlements.some(row=>row.receiptId===valid[0].id));
  assert.ok(!proof.settlements.some(row=>row.receiptId===invalid.id));
  assert.equal(proof.sui.length,0);
  const four=recallComparison(target,rows,completedMemoryProofs(rows,jobs,proofs),ids.filter(id=>id!==valid[0].id));
  assert.equal(four.contextual.total,4);
  assert.equal(four.priority,'informational');
});

test('reports a parseable malformed settlement without excluding its valid neighbor',()=>{
  const valid=receipt('CB-valid'), invalid={...receipt('CB-empty'),evidence:'{}'};
  const result=integrationProof([valid,invalid],[],[],[],[]);
  assert.deepEqual(result.settlements.map(row=>row.receiptId),[valid.id]);
  assert.deepEqual(result.invalidSettlementIds,[invalid.id]);
});

test('a proof timestamp cannot backdate a memory that finished after the target locked',()=>{
  const source=receipt('CB-source');
  const target={...receipt('CB-later'),locked_at:'1970-01-04T00:00:00.000Z',deadline:'1970-01-05T00:00:00.000Z'};
  const proof={prediction_id:source.id,job_id:'job',blob_id:'blob',network:'mainnet',completed_at:'1970-01-03T00:00:00.000Z'};
  const job={...proof,status:'done',namespace:'TEST',completed_at:'1970-01-05T00:00:00.000Z'};
  const matching=completedMemoryProofs([source,target],[{...job,completed_at:proof.completed_at}],[proof]);
  assert.deepEqual(recallComparison(target,[source,target],matching,[source.id]).citedIds,[source.id]);
  const mismatched=completedMemoryProofs([source,target],[job],[proof]);
  assert.deepEqual(mismatched,[]);
  assert.deepEqual(recallComparison(target,[source,target],mismatched,[source.id]).citedIds,[]);
});

import {matchingPriorMemory} from '../lib/receipt-recall';

test('automatic recall only considers memories available before a matching lock',()=>{
  const prior=receipt('CB-prior');
  const target={...prior,id:'CB-new',locked_at:'1970-01-04T00:00:00.000Z'};
  assert.equal(matchingPriorMemory(target,prior,'1970-01-03T00:00:00.000Z'),true);
  assert.equal(matchingPriorMemory(target,prior,target.locked_at),false);
  for(const change of [{caller:'OTHER'},{asset:'ETH'},{direction:'bearish'},{horizon:'7d'}]) {
    assert.equal(matchingPriorMemory(target,{...prior,...change},'1970-01-03T00:00:00.000Z'),false);
  }
});

test('caution progress groups exact markets and counts verified completed outcomes',()=>{
  const prior=receipt('CB-progress');
  const pending={...receipt('CB-progress-pending'),outcome:null,evidence:null,method:null};
  const other={...pending,id:'CB-progress-other',direction:'bearish'};
  const proof={prediction_id:prior.id,job_id:'job',blob_id:'blob',network:'mainnet',completed_at:'1970-01-03T00:00:00.000Z'};
  const result=integrationProof([prior,pending,other],[{...proof,status:'done',namespace:'test'}],[proof],[],[]);
  assert.deepEqual(result.groups.map(group=>[group.direction,group.count]),[['bullish',1],['bearish',0]]);
});
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {db} from '../lib/db';
import {automaticRecall} from '../lib/receipt-recall';
import {proofSchema} from '../lib/integration-proof-store';
import {memoryClient} from '../lib/providers';

test('lock and worker recall share a durable claim and store one cited review',async()=>{
  process.env.CALBOK_DB_PATH=join(mkdtempSync(join(tmpdir(),'calbok-auto-recall-')),'test.sqlite');
  process.env.MEMWAL_PRIVATE_KEY='synthetic-test-only';
  process.env.MEMWAL_ACCOUNT_ID='synthetic-test-only';
  const database=db();
  try {
    proofSchema();
    const prior=receipt('CB-auto-prior');
    const target={...receipt('CB-auto-target'),locked_at:'1970-01-04T00:00:00.000Z',deadline:'1970-01-05T00:00:00.000Z'};
    for(const row of [prior,target]) {
      database.prepare('INSERT INTO predictions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(row.id,row.caller,row.asset,row.direction,row.horizon,row.text,row.source_url,row.locked_at,row.deadline,row.id,row.snapshot_hash,row.provenance,row.snapshot!);
    }
    const completedAt='1970-01-03T00:00:00.000Z';
    database.prepare('INSERT INTO settlements VALUES (?,?,?,?,?)').run(prior.id,prior.outcome,prior.evidence,prior.method,completedAt);
    database.prepare("INSERT INTO memory_jobs(prediction_id,namespace,status,job_id,blob_id,completed_at) VALUES (?,?,'done',?,?,?)").run(prior.id,'test','job','blob',completedAt);
    database.prepare("INSERT INTO memory_completion_proofs VALUES (?,?,?,'mainnet',?)").run(prior.id,'job','blob',completedAt);
    let reads=0;
    const provider=async()=>({recall:async()=>{
      reads++;
      return {results:[{text:JSON.stringify({predictionId:prior.id}),blob_id:'blob'}]};
    }}) as unknown as Awaited<ReturnType<typeof memoryClient>>;
    const [review]=await Promise.all([automaticRecall('operator',target.id,provider),automaticRecall('operator',undefined,provider)]);
    assert.deepEqual(review?.citedIds,[prior.id]);
    assert.equal(reads,1);
    assert.equal(database.prepare('SELECT COUNT(*) AS n FROM recall_proofs WHERE prediction_id=?').get(target.id)?.n,1);
  } finally {
    database.close();
  }
});

test('progress ranks the closest exact group and computes win rate from verified completed wins and losses',()=>{
 const rows=[receipt('CB-progress-a'),receipt('CB-progress-b'),{...receipt('CB-progress-c'),caller:'OTHER'}];
 const completions=rows.map(row=>({prediction_id:row.id,job_id:'job-'+row.id,blob_id:'blob-'+row.id,network:'mainnet',completed_at:'1970-01-03T00:00:00.000Z'}));
 const proof=integrationProof(rows,completions.map(row=>({...row,status:'done',namespace:'test'})),completions,[],[]);
 assert.deepEqual(proof.groups.map(g=>({caller:g.caller,count:g.count,winRate:g.winRate,closest:g.closest})),[
  {caller:'TEST',count:2,winRate:'0.0',closest:true},{caller:'OTHER',count:1,winRate:'0.0',closest:false}
 ]);
});
