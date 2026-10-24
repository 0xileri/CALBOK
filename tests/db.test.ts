import {test} from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
const directory=mkdtempSync(join(tmpdir(),'calbok-test-'));
process.env.CALBOK_DB_PATH=join(directory,'test.sqlite');
const {capture,db,hash,listReceipts}=await import('../lib/db');
test('SQL receipt capture, immutable snapshot, duplicates, and independent connection persistence',()=>{
  try{
    const claim={caller:'Unit test only',text:'Synthetic test BTC higher in 24h',asset:'BTC' as const,direction:'bullish' as const,horizon:'24h' as const,sourceUrl:''};
    const id=capture(claim),receipt=listReceipts()[0];
    assert.equal(receipt.id,id);
    assert.equal(receipt.outcome,null);
    const row=db().prepare('SELECT snapshot,snapshot_hash FROM predictions WHERE id=?').get(id) as {snapshot:string;snapshot_hash:string};
    assert.equal(hash(row.snapshot),row.snapshot_hash);
    assert.throws(()=>capture(claim),/UNIQUE/);
    assert.throws(()=>db().prepare('UPDATE predictions SET direction=? WHERE id=?').run('bearish',id),/immutable/);
    const second=new DatabaseSync(process.env.CALBOK_DB_PATH!);
    assert.equal(second.prepare('SELECT COUNT(*) AS n FROM predictions').get()?.n,1);
    second.close();
    db().prepare('INSERT INTO settlements VALUES (?,?,?,?,?)').run(id,'won','{"fixture":true}','unit-test',new Date().toISOString());
    assert.throws(()=>db().prepare('UPDATE settlements SET outcome=? WHERE prediction_id=?').run('lost',id),/immutable/);
    assert.equal(listReceipts()[0].outcome,'won');
  }finally{db().close();assert.ok(resolve(directory).startsWith(resolve(tmpdir())+sep));rmSync(directory,{recursive:true,force:true});}
});
