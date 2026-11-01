import test from 'node:test';
import assert from 'node:assert/strict';
import {screenshotSuggestions} from '../lib/screenshot-call';
test('screenshot suggestions preserve visible text without manufacturing call evidence',()=>{
 const text='@sandyXBT\r\nLONG $ANSEM @ $0.69\r\n5:57 PM Oct 24';
 const parsed=screenshotSuggestions(text);assert.equal(parsed.caller,'@sandyXBT');assert.deepEqual(parsed.coins,['$ANSEM']);assert.equal(parsed.text,text.replace(/\r\n/g,'\n'));assert.equal('deadline' in parsed,false);assert.equal('price' in parsed,false);assert.equal('postedAt' in parsed,false);
 assert.equal(screenshotSuggestions('LONG $SUI').caller,'');assert.deepEqual(screenshotSuggestions('$SUI $SUI $ETH').coins,['$SUI','$ETH']);assert.equal(screenshotSuggestions('  ').text,'');
});
