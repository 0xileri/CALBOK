import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
process.env.CALBOK_DB_PATH=join(mkdtempSync(join(tmpdir(),'calbok-short-horizons-')),'test.sqlite');
const {capture,db,listReceipts}=await import('../lib/db');
const {claimSchema}=await import('../lib/domain');
const {automaticMemoryStatus,automaticMemoryTick,setAutomaticMemory}=await import('../lib/automatic-memory');

test('supported horizons persist their exact deadline and queue boundary',()=>{
  for (const [horizon,hours] of [['1h',1],['4h',4],['24h',24],['7d',168]] as const) {
    const claim=claimSchema.parse({caller:'TEST',text:'SYNTHETIC HORIZON TEST ONLY',asset:'BTC',direction:'bullish',horizon});
    const id=capture(claim);
    const receipt=listReceipts('operator').find(row=>row.id===id)!;
    assert.equal(Date.parse(receipt.deadline)-Date.parse(receipt.locked_at),hours*3600000);
    const job=db().prepare('SELECT next_attempt_at FROM settlement_jobs WHERE prediction_id=?').get(id);
    assert.equal(Date.parse(String(job?.next_attempt_at)),Date.parse(receipt.deadline)+60000);
  }
});

test('automatic memory defaults off and skips pending calls even when enabled',async()=>{
  assert.equal(automaticMemoryStatus().enabled,false);
  await automaticMemoryTick();
  process.env.CALBOK_WORKER_ENABLED='true';
  process.env.MEMWAL_NETWORK='mainnet';
  process.env.MEMWAL_PRIVATE_KEY='test-only';
  process.env.MEMWAL_ACCOUNT_ID='test-only';
  setAutomaticMemory(true);
  assert.equal(automaticMemoryStatus().available,true);
  await automaticMemoryTick();
  assert.equal(automaticMemoryStatus().used,0);
  assert.equal(db().prepare('SELECT COUNT(*) AS count FROM memory_jobs').get()?.count,0);
  db().close();
});
