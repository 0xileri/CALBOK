import {horizons} from './horizons';
import {z} from 'zod';
import {isAllowedAsset} from './assets';
export const draftFields=z.object({caller:z.string().max(60).default(''),text:z.string().max(2000).default(''),asset:z.string().max(120).refine(value=>!value||isAllowedAsset(value)).default(''),direction:z.enum(['','bullish','bearish']).default(''),horizon:z.enum(['',...horizons]).default(''),sourceUrl:z.string().max(2048).default('')}).strict();
export type DraftFields=z.infer<typeof draftFields>;
export const emptyDraft:DraftFields={caller:'',text:'',asset:'',direction:'',horizon:'',sourceUrl:''};
