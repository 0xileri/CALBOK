'use client';
import {useState} from 'react';
import {Download} from 'lucide-react';
import type {Receipt} from '@/lib/db';
import {downloadJournal,downloadJournalCsv} from '@/lib/journal';
export function JournalExport({all,visible,disabled}:{all:Receipt[];visible:Receipt[];disabled:boolean}) {
  const [message,setMessage]=useState(''),[format,setFormat]=useState('json');
  function save(rows:Receipt[],name:string){try{if(format==='csv')downloadJournalCsv(rows,name.replace(/\.json$/,'.csv'));else downloadJournal(rows,name);setMessage(`${format.toUpperCase()} export requested for ${rows.length} receipt${rows.length===1?'':'s'}. Keep downloaded journal files private.`);}catch{setMessage('Download unavailable. Try again in another browser.');}}
  return <div className="journal-export"><div><strong>Your records, portable.</strong><p>JSON contains original text, identities, hashes and stored settlement evidence. It excludes credentials and memory contents. Import is not available yet.</p></div><label className="export-format">File format<select aria-label="Export format" value={format} onChange={e=>setFormat(e.target.value)}><option value="json">JSON / full evidence</option><option value="csv">CSV / spreadsheet</option></select></label><p>CSV includes receipt fields without raw candle JSON. Formula-like text is prefixed with an apostrophe for spreadsheet safety; JSON preserves the original strings.</p><div className="journal-export-buttons"><button className="button secondary" disabled={disabled||!visible.length} onClick={()=>save(visible,'calbok-filtered-receipts.json')}><Download size={14}/>Export filtered ({visible.length})</button><button className="button secondary" disabled={disabled||!all.length} onClick={()=>save(all,'calbok-journal.json')}><Download size={14}/>Export all ({all.length})</button></div><p role="status">{message}</p></div>;
}
