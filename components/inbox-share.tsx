'use client';
import {useState} from 'react';
import {Copy,Download,LoaderCircle} from 'lucide-react';
import type {InboxCall} from '@/lib/call-inbox';
import {downloadInboxPng,inboxSummary} from '@/lib/inbox-export';
export function InboxShare({call}:{call:InboxCall}) {
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const summary=inboxSummary(call);
  async function download(){setBusy(true);setMessage('');try{await downloadInboxPng(call);setMessage('PNG export requested. Keep the file private unless you choose to share it.');}catch(error){setMessage(error instanceof Error?error.message:'PNG unavailable. Copy the summary instead.');}finally{setBusy(false);}}
  async function copy(){try{await navigator.clipboard.writeText(summary);setMessage('Copy requested. The text summary is available below.');}catch{setMessage('Clipboard unavailable. Open the text summary below to select and copy it.');}}
  return <details className="inbox-share"><summary><Download size={14}/>Share or export this call</summary><p>The image and summary include the original text, caller, source link and logging time. They label the call as unscored. Exporting does not publish your inbox.</p><div className="inbox-share-buttons"><button className="button secondary" disabled={busy} onClick={()=>void download()}>{busy?<LoaderCircle size={14} className="spin"/>:<Download size={14}/>}Download call PNG</button><button className="button secondary" onClick={()=>void copy()}><Copy size={14}/>Copy call summary</button></div>{message&&<p role="status" className="inbox-share-status">{message}</p>}<details className="inbox-share-text"><summary>View call text summary</summary><textarea aria-label="Captured call summary" readOnly value={summary} rows={10} onFocus={event=>event.currentTarget.select()}/></details></details>;
}
