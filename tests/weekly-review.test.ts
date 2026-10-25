import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {Receipt} from '../lib/db';
import {reviewWeek,weeklyReview,weeklySummary} from '../lib/weekly-review';
test('weekly review uses Monday–Sunday UTC and current outcomes for the lock-date cohort',()=>{
  assert.deepEqual(reviewWeek(new Date('2026-10-25T23:59:59Z')),{from:'2026-10-19',to:'2026-10-25'});
  assert.deepEqual(reviewWeek(new Date('2026-10-26T00:00:00Z')),{from:'2026-10-26',to:'2026-11-01'});
  assert.deepEqual(reviewWeek(new Date('2026-01-01T12:00:00Z'),1),{from:'2025-12-22',to:'2025-12-28'});
  const pending={id:'CB-pending',caller:'Test only',text:'Synthetic test',asset:'BTC',asset_symbol:'BTC',asset_provider:'Tatum',direction:'bullish',horizon:'24h',locked_at:'2026-10-19T00:00:00Z',deadline:'2026-10-20T00:00:00Z',outcome:null,evidence:null,method:null} as Receipt;
  const entryTime=Date.parse(pending.locked_at),exitTime=Date.parse(pending.deadline);
  const candle=(openTime:number,open:string)=>({openTime,closeTime:openTime+60_000,open,close:open,high:'120',low:'80',hash:'a'.repeat(64)});
  const won={...pending,id:'CB-win',outcome:'won',method:'directional-open-v1',evidence:JSON.stringify({asset:'BTC',provider:'Tatum',outcome:'won',returnPct:'10.00000000',entry:candle(entryTime,'100'),exit:candle(exitTime,'110')})};
  const rows=[pending,won,{...pending,id:'CB-invalid',outcome:'won',method:'invented'},{...pending,id:'CB-outside',locked_at:'2026-10-26T00:00:00Z'}];
  const result=weeklyReview(rows,'2026-10-19','2026-10-25');
  assert.equal(result.total,3);assert.equal(result.won,1);assert.equal(result.scored,1);assert.equal(result.pending,1);assert.equal(result.unverified,1);assert.equal(result.rate,'100.0');
  const summary=weeklySummary(rows,'2026-10-19','2026-10-25');assert.ok(summary.includes('not outcomes settled during this week'));assert.ok(!summary.includes('CB-outside'));assert.ok(!summary.includes('Synthetic test'));assert.ok(!summary.includes('returnPct'));
  assert.equal(weeklyReview([],'2026-10-19','2026-10-25').rate,null);
});
