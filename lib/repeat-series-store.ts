import {randomUUID} from 'node:crypto';
import {db,hash} from './db';
export type RepeatSeries={id:string;owner_id:string;request_id:string;group_key:string;seed_id:string;current_id:string;target_count:number;created_count:number;status:string;stop_reason:string|null;created_at:string;updated_at:string};
export function seriesForReceipt(id:string){return db().prepare('SELECT s.* FROM repeat_series s JOIN repeat_series_steps t ON t.series_id=s.id WHERE t.prediction_id=?').get(id) as RepeatSeries|undefined;}
export function seriesMemoryAllowed(id:string){const series=seriesForReceipt(id);return !!series&&(series.status==='active'||series.status==='completed'||['OWNER_STOPPED','CAUTION_TRIGGERED'].includes(series.stop_reason||''));}
export function finishSeries(id:string,reason:string,status='stopped'){
 const now=new Date().toISOString();
 const changed=db().prepare("UPDATE repeat_series SET status=?,stop_reason=?,updated_at=? WHERE id=? AND status='active'").run(status,reason,now,id);
 if(changed.changes)db().prepare('INSERT INTO audit_events VALUES (?,?,?,?,?)').run(randomUUID(),id,'repeat_series_'+status,hash(JSON.stringify({reason})),now);
 return !!changed.changes;
}
export function stopSeriesForReceipt(id:string,reason:string){const series=seriesForReceipt(id);if(series)finishSeries(series.id,reason);return !!series;}
