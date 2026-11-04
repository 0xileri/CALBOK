import type {Receipt} from './db';
export type ScheduledRepeat={seriesId:string;step:number;count:number;scheduledBy:'operator'};
export function scheduledRepeat(receipt:Pick<Receipt,'snapshot'>):ScheduledRepeat|null {
 try{const value=JSON.parse(receipt.snapshot||'null')?.scheduledRepeat;
  return value&&/^RS-[a-f0-9-]{36}$/.test(value.seriesId)&&Number.isInteger(value.step)&&Number.isInteger(value.count)&&value.step>=1&&value.count<=10&&value.step<=value.count&&value.scheduledBy==='operator'?value:null;
 }catch{return null;}
}
export function scheduledRepeatLabel(receipt:Pick<Receipt,'snapshot'>){const value=scheduledRepeat(receipt);return value?`scheduled repeat by owner, series ${value.seriesId} · step ${value.step} of ${value.count}`:null;}
