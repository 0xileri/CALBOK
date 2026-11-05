import {drawBrandLogo} from './brand-canvas';
import {scheduledRepeatLabel} from './scheduled-repeat';
import type { Receipt } from './db';

export function receiptSummary(receipt:Receipt) {
  return [
    'CALBOK / CALL RECEIPT',
    ...(scheduledRepeatLabel(receipt)?[scheduledRepeatLabel(receipt)!,'Owner-scheduled prediction, not a new caller post.']:[]),
    `${receipt.asset_symbol||receipt.asset} | ${receipt.direction} | ${receipt.horizon}`,
    `Caller: ${receipt.caller} (self-logged; authorship unverified)`,
    '',receipt.text,'',
    `Locked: ${new Date(receipt.locked_at).toUTCString()}`,
    `Deadline: ${new Date(receipt.deadline).toUTCString()}`,
    `Outcome: ${receipt.outcome || 'Pending — no verified settlement'}`,
    `Market: ${receipt.asset}`,
    `Pricing provider: ${receipt.asset_provider||'Tatum'}`,
    ...(receipt.source_url?[`Source (unverified): ${receipt.source_url}`]:[]),
    `Receipt: ${receipt.id}`,
    `Snapshot SHA-256: ${receipt.snapshot_hash}`,
    'Self-logged historical record. Not financial advice.',
  ].join('\n');
}

/** Render locally: no receipt text, fonts, or images are sent to a rendering service. */
export async function downloadReceiptPng(receipt:Receipt) {
  const canvas=document.createElement('canvas');
  const context=canvas.getContext('2d');
  if(!context)throw new Error('PNG export is unavailable in this browser. Try copying the summary.');
  const width=1200,padding=76,content=width-padding*2;
  // Wrap even an uninterrupted URL or contract string without clipping it.
  function wrap(text:string,font:string,maxWidth:number) {
    context!.font=font;
    const lines:string[]=[];
    let line='';
    for(const word of text.replace(/\s+/g,' ').trim().split(' ')) {
      if(line && context!.measureText(`${line} ${word}`).width>maxWidth){lines.push(line);line='';}
      for(const character of Array.from((line?' ':'')+word)) {
        if(line && context!.measureText(line+character).width>maxWidth){lines.push(line);line='';}
        line+=character;
      }
    }
    if(line)lines.push(line);
    return lines;
  }
  const claim=wrap(receipt.text,'38px Arial',content-68);
  const caller=wrap(receipt.caller,'bold 30px Arial',content);
  const market=wrap(receipt.asset,'20px monospace',content);
  const source=receipt.source_url?wrap(receipt.source_url.length>180?receipt.source_url.slice(0,177)+'...':receipt.source_url,'20px Arial',content):[];
  const scheduledLabel=scheduledRepeatLabel(receipt);
  const scheduled=scheduledLabel?wrap(scheduledLabel+' · not a caller post','16px monospace',content):[];
  canvas.width=width;
  canvas.height=1160+claim.length*51+caller.length*37+market.length*29+source.length*28+scheduled.length*24;
  context.fillStyle='#142c25';context.fillRect(0,0,width,canvas.height);
  context.fillStyle='#fffef8';context.fillRect(34,34,width-68,canvas.height-68);
  context.fillStyle='#ef7145';context.fillRect(34,34,width-68,9);
  context.textBaseline='top';
  function text(value:string,x:number,y:number,font:string,color='#172c26') {context!.font=font;context!.fillStyle=color;context!.fillText(value,x,y);}
  function rule(y:number){context!.strokeStyle='#bbc9ad';context!.setLineDash([6,7]);context!.beginPath();context!.moveTo(padding,y);context!.lineTo(width-padding,y);context!.stroke();context!.setLineDash([]);}
  await drawBrandLogo(context,padding,66,72);
  text('CALBOK.',padding+82,85,'bold 43px Arial');
  text('CALLS FADE. RECEIPTS STAY.',padding,164,'18px monospace','#5d7050');
  rule(212);
  text(`${receipt.asset_symbol||receipt.asset}`.slice(0,30),padding,247,'bold 65px Arial');
  text(`${receipt.direction.toUpperCase()} / ${receipt.horizon.toUpperCase()}`,padding,328,'24px monospace','#536b45');
  const status=(receipt.outcome||'pending').toUpperCase();
  text(`OUTCOME / ${status}`,padding,385,'bold 25px Arial',receipt.outcome==='lost'?'#a44729':receipt.outcome==='won'?'#174c3c':'#886723');
  let y=448;
  scheduled.forEach(line=>{text(line,padding,y,'16px monospace','#a34c20');y+=24;});
  text(scheduled.length?'ORIGINAL TERMS / OWNER-SCHEDULED REPEAT':'THE ORIGINAL CALL',padding,y,'18px monospace','#5d7050');y+=40;
  context.fillStyle='#f1efdf';context.fillRect(padding,y,content,claim.length*51+52);
  context.fillStyle='#ef7145';context.fillRect(padding,y,5,claim.length*51+52);
  claim.forEach((line,i)=>text(line,padding+32,y+24+i*51,'38px Arial'));
  y+=claim.length*51+88;
  text('CALLER / SELF-LOGGED, AUTHORSHIP UNVERIFIED',padding,y,'17px monospace','#657651');y+=30;
  caller.forEach(line=>{text(line,padding,y,'bold 30px Arial');y+=37;});y+=20;
  text(`LOCKED   ${new Date(receipt.locked_at).toUTCString()}`,padding,y,'22px monospace');y+=37;
  text(`DEADLINE ${new Date(receipt.deadline).toUTCString()}`,padding,y,'22px monospace');y+=48;
  text(`MARKET / ${receipt.asset_provider||'Tatum'}`,padding,y,'18px monospace','#657651');y+=28;
  market.forEach(line=>{text(line,padding,y,'20px monospace');y+=29;});y+=16;
  if(source.length){text(`SOURCE / UNVERIFIED${receipt.source_url.length>180?' / SHORTENED':''}`,padding,y,'17px monospace','#657651');y+=27;source.forEach(line=>{text(line,padding,y,'20px Arial');y+=28;});y+=16;}
  rule(y);y+=27;
  text(receipt.id,padding,y,'19px monospace');y+=33;
  text('SNAPSHOT SHA-256',padding,y,'15px monospace','#657651');y+=23;
  text(receipt.snapshot_hash,padding,y,'17px monospace');y+=46;
  text('Self-logged historical record. Not financial advice.',padding,y,'20px Arial','#5d7050');
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Could not create the PNG. Try copying the summary.')),'image/png'));
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=`calbok-${receipt.id}.png`;
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
