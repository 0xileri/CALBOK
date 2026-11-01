export function comparableCallText(text:string){return text.trim().replace(/\s+/g,' ').toLowerCase();}
export function comparableSource(source:string){
 if(!source)return '';
 try{const url=new URL(source);const host=url.hostname.toLowerCase().replace(/^(www\.|mobile\.)/,'');if(['x.com','twitter.com'].includes(host)){const id=url.pathname.match(/^\/[^/]+\/status\/(\d+)(?:\/|$)/)?.[1];if(id)return 'x-status:'+id;}url.hash='';return url.toString();}catch{return '';}
}
