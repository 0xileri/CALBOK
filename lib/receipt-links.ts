export function receiptFragment(id:string) {return `#receipt=${encodeURIComponent(id)}`;}
export function receiptIdFromFragment(fragment:string):string|null {
  if(!fragment.startsWith('#receipt='))return null;
  try {const id=decodeURIComponent(fragment.slice(9));return /^CB-[a-zA-Z0-9-]{1,100}$/.test(id)?id:null;}catch{return null;}
}
