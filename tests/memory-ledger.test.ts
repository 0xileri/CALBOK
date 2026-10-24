import {test} from 'node:test';
import assert from 'node:assert/strict';
import {memoryStage,type MemoryJob} from '../lib/memory-ledger';
test('memory ledger requires both completed status and blob; uncertain acceptance stays distinct',()=>{
  const job:MemoryJob={prediction_id:'test',namespace:'test',status:'queued',job_id:null,blob_id:null};
  assert.equal(memoryStage(job),'uncertain');
  assert.equal(memoryStage({...job,status:'running',job_id:'job'}),'pending');
  assert.equal(memoryStage({...job,status:'running',job_id:'job',error:'Timeout'}),'attention');
  assert.equal(memoryStage({...job,status:'done',job_id:'job'}),'attention');
  assert.equal(memoryStage({...job,status:'done',job_id:'job',blob_id:'blob'}),'completed');
});
