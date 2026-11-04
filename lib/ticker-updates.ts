import type {PublicCall} from './public-feed';
export type TickerEvent='new'|'won'|'lost';
/** Events describe server-confirmed changes only; deadlines never manufacture outcomes. */
export function tickerEvents(previous:PublicCall[],next:PublicCall[]):Record<string,TickerEvent>{
 const known=new Map(previous.map(call=>[call.id,call]));
 return Object.fromEntries(next.flatMap<[string,TickerEvent]>(call=>{
  const prior=known.get(call.id);
  if(!prior)return [[call.id,'new']];
  return prior.outcome!==call.outcome&&['won','lost'].includes(call.outcome)?[[call.id,call.outcome as 'won'|'lost']]:[];
 }));
}
export function tickerRows(calls:PublicCall[]){
 const count=Math.min(3,calls.length);
 return Array.from({length:count},(_,row)=>calls.filter((_,index)=>index%count===row));
}
export function animatedCount(from:number,to:number,progress:number){return Math.round(from+(to-from)*(1-Math.pow(1-Math.min(1,Math.max(0,progress)),3)));}
