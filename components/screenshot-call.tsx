'use client';
import {useEffect,useRef,useState} from 'react';
import Image from 'next/image';
import {ImagePlus,LoaderCircle} from 'lucide-react';
import type {Worker} from 'tesseract.js';
import {screenshotSuggestions} from '@/lib/screenshot-call';

export function ScreenshotCall({disabled,onApply,onBusy}:{disabled:boolean;onApply:(text:string,caller:string)=>void;onBusy:(busy:boolean)=>void}){
 const [preview,setPreview]=useState(''),[extracted,setExtracted]=useState(''),[caller,setCaller]=useState(''),[coins,setCoins]=useState<string[]>([]),[status,setStatus]=useState(''),[reading,setReading]=useState(false),[ready,setReady]=useState(false),[dragging,setDragging]=useState(false);
 const worker=useRef<Worker|null>(null),generation=useRef(0);
 useEffect(()=>()=>{generation.current++;void worker.current?.terminate();},[]);
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
 function cancel(){generation.current++;void worker.current?.terminate();worker.current=null;setReading(false);onBusy(false);setStatus('Reading cancelled. You can choose another image or type the call.');}
 async function read(file:File){
  if(disabled||reading)return;
  setReady(false);
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8*1024*1024){setStatus('Choose a PNG, JPEG or WebP screenshot up to 8 MB.');return;}
  const token=++generation.current;setReading(true);onBusy(true);setReady(false);setExtracted('');setStatus('Preparing screenshot…');let timer:ReturnType<typeof setTimeout>|undefined;
  try{
   const bitmap=await createImageBitmap(file);const pixels=bitmap.width*bitmap.height;bitmap.close();if(pixels>12_000_000)throw new Error('Image too large. Crop it to the call first (up to 12 megapixels).');
   if(token!==generation.current)return;setPreview(URL.createObjectURL(file));
   timer=setTimeout(()=>{if(token===generation.current){cancel();setStatus('Reading took too long. Try a smaller, clearer crop.');}},90_000);
   const {createWorker}=await import('tesseract.js');
   const instance=await createWorker('eng',1,{workerPath:'/ocr/worker.min.js',corePath:'/ocr/core',langPath:'/ocr/lang',logger:message=>{if(token===generation.current)setStatus(message.status==='recognizing text'?`Reading text… ${Math.round(message.progress*100)}%`:'Loading screenshot reader…');}});
   if(token!==generation.current){await instance.terminate();return;}worker.current=instance;
   const result=await instance.recognize(file);if(token!==generation.current)return;
   const suggested=screenshotSuggestions(result.data.text);setExtracted(suggested.text);setCaller(suggested.caller);setCoins(suggested.coins);setReady(!!suggested.text);setStatus(suggested.text?'Review every line, caller and number before using this text.':'No readable text found. Crop tightly around the post or type the call.');
  }catch{if(token===generation.current)setStatus('Could not read this screenshot. Try a clearer PNG/JPEG crop, or type the call.');}
  finally{if(timer)clearTimeout(timer);if(token===generation.current){void worker.current?.terminate();worker.current=null;setReading(false);onBusy(false);}}
 }
 function paste(event:React.ClipboardEvent){const images=Array.from(event.clipboardData.items).filter(item=>item.kind==='file'&&item.type.startsWith('image/'));if(!images.length)return;event.preventDefault();if(disabled||reading)return;if(images.length>1){setStatus('Paste one screenshot at a time.');return;}const file=images[0].getAsFile();if(file)void read(file);}
 return <div className="screenshot-call" onPaste={paste}><div className={'screenshot-dropzone'+(dragging?' dragging':'')} role="group" aria-label="Paste or drop a screenshot" aria-disabled={disabled||reading} tabIndex={0} onDragOver={event=>{if(Array.from(event.dataTransfer.types).includes('Files')){event.preventDefault();event.dataTransfer.dropEffect=disabled||reading?'none':'copy';if(!disabled&&!reading)setDragging(true);}}} onDragLeave={event=>{if(!(event.relatedTarget instanceof Node)||!event.currentTarget.contains(event.relatedTarget))setDragging(false);}} onDrop={event=>{event.preventDefault();setDragging(false);if(disabled||reading)return;const files=Array.from(event.dataTransfer.files);if(files.length!==1){setStatus('Drop one screenshot at a time.');return;}void read(files[0]);}}><strong>Drop a screenshot here</strong><span>Or click this area and press Ctrl+V (⌘V on Mac) to paste an image.</span><small>Text paste in the call fields still works normally. You can also choose a file below.</small></div><label className="screenshot-upload"><ImagePlus size={17}/>Upload screenshot<input aria-label="Call screenshot" type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled||reading} onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void read(file);}}/></label><small>PNG, JPEG or WebP · up to 8 MB. English text is read on this device. The image is not uploaded or stored; only text you confirm is saved.</small>{preview&&<Image src={preview} alt="Selected call screenshot" width={420} height={220} unoptimized className="screenshot-preview"/>}{reading&&<button type="button" className="text-button" onClick={cancel}><LoaderCircle size={14} className="spin"/>Cancel reading</button>}{status&&<p role="status">{status}</p>}{ready&&<div className="screenshot-extracted"><label>Extracted call text<textarea rows={5} value={extracted} onChange={event=>setExtracted(event.target.value)}/></label><label>Suggested caller (unverified)<input maxLength={60} value={caller} onChange={event=>setCaller(event.target.value)}/></label>{coins.length>0&&<small>Visible tickers: {coins.join(', ')} · token identity is unverified.</small>}<p>Remove buttons, chart labels and unrelated text. Visible post times stay in the text; they do not change when CALBOK logs the call. No price or authorship is verified.</p>{extracted.length>2000&&<p role="alert">Trim the extracted text to 2,000 characters ({extracted.length} currently).</p>}<button type="button" className="button secondary" disabled={disabled||!extracted.trim()||extracted.length>2000} onClick={()=>{onApply(extracted,caller);setReady(false);setStatus('Text added below. Check the call, then select Save call.');}}>Use this text in the call</button></div>}</div>;
}
