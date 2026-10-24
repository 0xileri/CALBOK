import {test} from 'node:test';
import assert from 'node:assert/strict';
import {receiptFragment,receiptIdFromFragment} from '../lib/receipt-links';
test('receipt links round trip only bounded CALBOK IDs and reject malformed fragments',()=>{
  assert.equal(receiptIdFromFragment(receiptFragment('CB-123-abc')),'CB-123-abc');
  for(const value of ['#receipt=%','x','#receipt=javascript:alert(1)','#receipt=CB-foo%2Fbar','#receipt=CB-'+ 'a'.repeat(101)])assert.equal(receiptIdFromFragment(value),null);
});
