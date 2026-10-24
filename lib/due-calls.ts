import type {Receipt} from './db';

export function dueCalls(receipts:Receipt[],now:number) {
  return receipts.filter(row=>!row.outcome||row.outcome==='pending').map(receipt=>{
    const deadline=Date.parse(receipt.deadline);
    const state=!Number.isFinite(deadline)?'unknown':now<deadline?'upcoming':now<deadline+60_000?'finalizing':'eligible';
    return {receipt,deadline,state};
  }).sort((a,b)=>(Number.isFinite(a.deadline)?a.deadline:Infinity)-(Number.isFinite(b.deadline)?b.deadline:Infinity)||a.receipt.id.localeCompare(b.receipt.id));
}
