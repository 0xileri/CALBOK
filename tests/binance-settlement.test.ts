import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
process.env.CALBOK_DB_PATH=join(mkdtempSync(join(tmpdir(),'calbok-binance-settlement-')),'test.sqlite');
const {db,hash,listReceipts}=await import('../lib/db');
const {runSettlement}=await import('../lib/settlement-worker');
const {profileOutcome}=await import('../lib/caller-profiles');
test('partial Coinbase coverage settles with two Binance USDT boundaries and queues the verified outcome',async()=>{
 const original=globalThis.fetch,key=process.env.TATUM_API_KEY;
 process.env.TATUM_API_KEY='synthetic-test-only';
 const exit=Math.floor(Date.now()/60000)*60000-600000,entry=exit-86400000,id='CB-synthetic-binance-test';
 let binanceCalls=0;
 try {
  db().prepare('INSERT INTO predictions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,'TEST','STX','bullish','24h','SYNTHETIC TEST ONLY','',new Date(entry-35000).toISOString(),new Date(exit-35000).toISOString(),id,hash(id),'test','{}');
  globalThis.fetch=async input=>{const url=new URL(String(input));
   if(url.hostname==='api.tatum.io')return Response.json({openTime:entry-86400000,closeTime:entry-86400000+59999,open:'1',high:'1',low:'1',close:'1'});
   if(url.hostname==='api.exchange.coinbase.com')return Response.json(Date.parse(url.searchParams.get('start')!)===entry?[[entry/1000,.32,.35,.33,.34,100]]:[]);
   const minute=Number(url.searchParams.get('startTime'));binanceCalls++;
   return Response.json([[minute,minute===entry?'0.33':'0.34','0.35','0.32','0.34','100',minute+59999,'34',10,'50','17','0']]);
  };
  assert.equal((await runSettlement(id)).result?.outcome,'won');
  const receipt=listReceipts()[0],evidence=JSON.parse(receipt.evidence!);
  assert.equal(evidence.entry.product,'STXUSDT');assert.equal(evidence.exit.product,'STXUSDT');
  assert.equal(evidence.provider,'Binance');assert.equal(profileOutcome(receipt),'won');
  assert.equal(binanceCalls,3);
  assert.ok(db().prepare('SELECT 1 FROM automatic_memory_queue WHERE prediction_id=?').get(id));
 }finally{globalThis.fetch=original;if(key===undefined)delete process.env.TATUM_API_KEY;else process.env.TATUM_API_KEY=key;db().close();}
});

