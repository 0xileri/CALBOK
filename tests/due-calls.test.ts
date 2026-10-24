import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {Receipt} from '../lib/db';
import {dueCalls} from '../lib/due-calls';
test('deadline list excludes settled calls, sorts deadlines and waits for finalized minute',()=>{
  const receipt=(id:string,deadline:number,outcome:string|null=null)=>({id,deadline:new Date(deadline).toISOString(),outcome}) as Receipt;
  const rows=[receipt('later',200_000),receipt('due',100_000),receipt('settled',0,'won')];
  assert.deepEqual(dueCalls(rows,99_999).map(row=>[row.receipt.id,row.state]),[['due','upcoming'],['later','upcoming']]);
  assert.equal(dueCalls(rows,100_000)[0].state,'finalizing');
  assert.equal(dueCalls(rows,159_999)[0].state,'finalizing');
  assert.equal(dueCalls(rows,160_000)[0].state,'eligible');
  assert.equal(dueCalls([{...rows[0],deadline:'invalid'}],0)[0].state,'unknown');
});
