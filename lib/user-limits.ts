import {db} from './db';

type Budget = 'locks'|'memory-writes'|'provider-reads';
const limits:Record<Budget,{count:number;window:number}> = {
  locks:{count:20,window:3600_000},
  'memory-writes':{count:10,window:86400_000},
  'provider-reads':{count:60,window:3600_000},
};
export class UserLimitError extends Error {
  constructor(public readonly budget:Budget) {super(`Account ${budget} limit reached. Try again after the current ${budget==='memory-writes'?'UTC day':'hour'}.`);}
}
function usageSchema(){db().exec('CREATE TABLE IF NOT EXISTS user_usage(owner_id TEXT NOT NULL,budget TEXT NOT NULL,window_start INTEGER NOT NULL,count INTEGER NOT NULL,PRIMARY KEY(owner_id,budget,window_start))');}
export function userBudgetAvailable(owner:string,budget:Budget,now=Date.now()) {
  if(owner==='operator')return true;
  usageSchema();
  const limit=limits[budget],start=Math.floor(now/limit.window)*limit.window;
  const row=db().prepare('SELECT count FROM user_usage WHERE owner_id=? AND budget=? AND window_start=?').get(owner,budget,start);
  return Number(row?.count??0)<limit.count;
}
/** Durable atomic reservations shared by API requests and the worker; operator budgets stay unchanged. */
export function reserveUserBudget(owner:string,budget:Budget,now=Date.now()) {
  if(owner==='operator')return;
  const limit=limits[budget],start=Math.floor(now/limit.window)*limit.window;
  const database=db();
  usageSchema();
  const reserved=database.prepare(`INSERT INTO user_usage VALUES (?,?,?,1)
    ON CONFLICT(owner_id,budget,window_start) DO UPDATE SET count=count+1 WHERE count<?`)
    .run(owner,budget,start,limit.count);
  if(!reserved.changes)throw new UserLimitError(budget);
}
