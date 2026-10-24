'use client';
import { useState } from 'react';
import { Copy, Download, LoaderCircle } from 'lucide-react';
import type { Receipt } from '@/lib/db';
import { downloadReceiptPng, receiptSummary } from '@/lib/receipt-export';

export function ReceiptShare({receipt}:{receipt:Receipt}) {
  const [exporting,setExporting]=useState(false),[message,setMessage]=useState('');
  return <section className="receipt-share" aria-label="Export receipt"><div><strong>Take the receipt with you.</strong><p>Download the branded image or copy the full record.</p></div><div className="receipt-share-actions"><button type="button" className="button secondary" disabled={exporting} onClick={async()=>{setExporting(true);setMessage('');try{await downloadReceiptPng(receipt);setMessage('PNG downloaded. Your original receipt is unchanged.');}catch(error){setMessage(error instanceof Error?error.message:'Export unavailable. Try copying the summary.');}finally{setExporting(false);}}}>{exporting?<LoaderCircle size={15} className="spin"/>:<Download size={15}/>}Download PNG</button><button type="button" className="button secondary" onClick={async()=>{try{await navigator.clipboard.writeText(receiptSummary(receipt));setMessage('Full receipt summary copied.');}catch{setMessage('Clipboard access is unavailable. Open the text summary below to select and copy it manually.');}}}><Copy size={15}/>Copy summary</button></div><p className="receipt-share-message" role="status">{message}</p><details className="receipt-text-preview"><summary>View text summary</summary><textarea aria-label="Full receipt summary" readOnly rows={9} value={receiptSummary(receipt)} onFocus={event=>event.currentTarget.select()}/></details></section>;
}
