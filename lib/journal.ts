import {scheduledRepeat,scheduledRepeatLabel} from './scheduled-repeat';
import type {Receipt} from './db';
export type JournalFilters={query:string;outcome:string;asset:string;horizon:string;direction:string;order:string;from?:string;to?:string;dateField?:string};
function utcDay(value:string) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return NaN;
  const time=Date.parse(value+'T00:00:00.000Z');
  return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===value?time:NaN;
}
export function journalDateError(from='',to='') {
  if((from&&!Number.isFinite(utcDay(from)))||(to&&!Number.isFinite(utcDay(to))))return 'Choose valid calendar dates.';
  if(from&&to&&from>to)return 'The start date must be on or before the end date.';
  return '';
}
export function journalDatePreset(days:number,now=new Date()) {
  const to=now.toISOString().slice(0,10),end=utcDay(to);
  return {from:new Date(end-(days-1)*86400_000).toISOString().slice(0,10),to};
}
export function filterJournal(receipts:Receipt[],filters:JournalFilters) {
  if(journalDateError(filters.from,filters.to))return [];
  const start=filters.from?utcDay(filters.from):-Infinity,end=filters.to?utcDay(filters.to)+86400_000:Infinity;
  const dateField=filters.dateField==='deadline'?'deadline':'locked_at';
  const inRange=(row:Receipt)=>{if(!filters.from&&!filters.to)return true;const time=Date.parse(row[dateField]);return time>=start&&time<end;};
  return receipts.filter(row=>inRange(row)&&(filters.outcome==='All calls'||(filters.outcome==='Pending'?(!row.outcome||row.outcome==='pending'):row.outcome===filters.outcome.toLowerCase()))&&(filters.asset==='all'||row.asset===filters.asset)&&(filters.horizon==='all'||row.horizon===filters.horizon)&&(filters.direction==='all'||row.direction===filters.direction)&&`${row.text} ${row.caller} ${row.asset} ${row.asset_symbol||''} ${row.id}`.toLowerCase().includes(filters.query.trim().toLowerCase())).sort((a,b)=>{
    const field=filters.order==='deadline'?'deadline':'locked_at';
    const difference=Date.parse(a[field])-Date.parse(b[field]);
    return (filters.order==='newest'?-difference:difference)||a.id.localeCompare(b.id);
  });
}
/** Explicit allowlist: export receipt data only, never runtime credentials or provider config. */
export function journalExport(receipts:Receipt[],exportedAt=new Date().toISOString()) {
  return {format:'calbok-journal',version:1,exportedAt,count:receipts.length,note:'Private self-logged records. Authorship is unverified. This export is not an independent proof or a full SQLite backup.',receipts:receipts.map(row=>({...(scheduledRepeat(row)?{scheduledRepeat:scheduledRepeat(row),origin_label:scheduledRepeatLabel(row)}:{}),id:row.id,caller:row.caller,asset:row.asset,asset_symbol:row.asset_symbol,asset_provider:row.asset_provider,direction:row.direction,horizon:row.horizon,text:row.text,source_url:row.source_url,locked_at:row.locked_at,deadline:row.deadline,snapshot_hash:row.snapshot_hash,provenance:row.provenance,outcome:row.outcome,evidence:row.evidence,method:row.method}))};
}
export function downloadJournal(receipts:Receipt[],filename='calbok-journal.json') {
  const url=URL.createObjectURL(new Blob([JSON.stringify(journalExport(receipts),null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30_000);
}

/** Quote every cell and neutralize spreadsheet formulas, including leading control/space characters. */
export function csvCell(value:unknown) {
  let text=value===null||value===undefined?'':String(value);
  if(/^[\s\u0000-\u001f]*[=+@-]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;
  return `"${text.replace(/"/g,'""')}"`;
}
export function journalCsv(receipts:Receipt[]) {
  const fields=['id','caller','asset','asset_symbol','asset_provider','direction','horizon','text','source_url','locked_at','deadline','snapshot_hash','provenance','outcome','method','origin_label'] as const;
  return '\uFEFF'+[fields.map(csvCell).join(','),...receipts.map(row=>fields.map(field=>csvCell(field==='origin_label'?scheduledRepeatLabel(row):row[field])).join(','))].join('\r\n');
}
export function downloadJournalCsv(receipts:Receipt[],filename='calbok-journal.csv') {
  const url=URL.createObjectURL(new Blob([journalCsv(receipts)],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30_000);
}
