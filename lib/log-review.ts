import {z} from 'zod';
import {claimSchema} from './domain';
import {horizons,horizonLabels} from './horizons';
import type {Asset} from './assets';
/** Formatting only: no call, timestamp, price or outcome exists until the user's separate lock confirmation. */
export function makeCallReview(fields:Record<string,string>,asset:Asset){
 const direction=z.enum(['bullish','bearish']).parse(fields.direction),horizon=z.enum(horizons).parse(fields.horizon);
 const text=fields.text?.trim()||`${asset.symbol} will be ${direction==='bullish'?'higher':'lower'} after ${horizonLabels[horizon]}. Caller label: ${fields.caller}.`;
 return {...claimSchema.parse({...fields,asset:asset.id,direction,horizon,text}),visibility:z.enum(['private','public']).parse(fields.visibility||'private')};
}
