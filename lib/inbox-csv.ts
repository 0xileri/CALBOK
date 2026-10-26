import type {InboxCall} from './call-inbox';
import {csvCell} from './journal';

/** Explicit fields keep private notes and unrelated data out of exports. */
export function inboxCsv(calls:InboxCall[]) {
 const fields=['id','caller','text','source_url','logged_at','review_status','scoring_status'];
 return '\uFEFF'+[fields.map(csvCell).join(','),...calls.map(call=>[call.id,call.caller,call.text,call.source_url,call.logged_at,call.reviewed?'reviewed':'awaiting_review','unscored'].map(csvCell).join(','))].join('\r\n');
}
