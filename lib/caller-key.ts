/** Match SQLite lower(trim()) for stored caller labels; this is grouping, not identity proof. */
export function callerKey(value:string){return value.trim().replace(/[A-Z]/g,letter=>letter.toLowerCase());}
export type CapturedCaller={key:string;name:string;captured:number;reviewed:number};
