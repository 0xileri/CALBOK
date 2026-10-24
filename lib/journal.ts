import type {Receipt} from './db';
export type JournalFilters={query:string;outcome:string;asset:string;horizon:string;direction:string;order:string};
export function filterJournal(receipts:Receipt[],filters:JournalFilters) {
  return receipts.filter(row=>(filters.outcome==='All calls'||(filters.outcome==='Pending'?(!row.outcome||row.outcome==='pending'):row.outcome===filters.outcome.toLowerCase()))&&(filters.asset==='all'||row.asset===filters.asset)&&(filters.horizon==='all'||row.horizon===filters.horizon)&&(filters.direction==='all'||row.direction===filters.direction)&&`${row.text} ${row.caller} ${row.asset} ${row.asset_symbol||''} ${row.id}`.toLowerCase().includes(filters.query.trim().toLowerCase())).sort((a,b)=>{
    const field=filters.order==='deadline'?'deadline':'locked_at';
    const difference=Date.parse(a[field])-Date.parse(b[field]);
    return (filters.order==='newest'?-difference:difference)||a.id.localeCompare(b.id);
  });
}
/** Explicit allowlist: export receipt data only, never runtime credentials or provider config. */
export function journalExport(receipts:Receipt[],exportedAt=new Date().toISOString()) {
  return {format:'calbok-journal',version:1,exportedAt,count:receipts.length,note:'Private self-logged records. Authorship is unverified. This export is not an independent proof or a full SQLite backup.',receipts:receipts.map(row=>({id:row.id,caller:row.caller,asset:row.asset,asset_symbol:row.asset_symbol,asset_provider:row.asset_provider,direction:row.direction,horizon:row.horizon,text:row.text,source_url:row.source_url,locked_at:row.locked_at,deadline:row.deadline,snapshot_hash:row.snapshot_hash,provenance:row.provenance,outcome:row.outcome,evidence:row.evidence,method:row.method}))};
}
export function downloadJournal(receipts:Receipt[],filename='calbok-journal.json') {
  const url=URL.createObjectURL(new Blob([JSON.stringify(journalExport(receipts),null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30_000);
}
