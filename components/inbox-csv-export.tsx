'use client';
import {useState} from 'react';
import {Download} from 'lucide-react';
import type {InboxCall} from '@/lib/call-inbox';
import {inboxCsv} from '@/lib/inbox-csv';

export function InboxCsvExport({calls,disabled}:{calls:InboxCall[];disabled:boolean}) {
 const [message,setMessage]=useState('');
 function download(){let url:string|undefined;try{url=URL.createObjectURL(new Blob([inboxCsv(calls)],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='calbok-filtered-captured-calls.csv';document.body.appendChild(link);link.click();link.remove();setMessage(`CSV download requested for ${calls.length} captured call${calls.length===1?'':'s'}.`);}catch{setMessage('Download unavailable. Please try again.');}finally{if(url)setTimeout(()=>URL.revokeObjectURL(url!),1000);}}
 return <div className="journal-export"><div><strong>Take your captured calls with you.</strong><p>Export the current search and review filter from your latest 100 entries. Includes call text, caller, source, logging time and review status. Private review notes are excluded.</p><p>All calls remain labelled unscored. Formula-like text receives a safety prefix for spreadsheets. This file does not include older entries beyond the latest 100.</p></div><button className="button secondary" disabled={disabled||!calls.length} onClick={download}><Download size={14}/>Export captured calls CSV ({calls.length})</button>{message&&<p role="status">{message}</p>}</div>;
}
