import type {RecallReview} from '@/lib/recall-types';
import {hasCaution} from '@/lib/caution-display';
export function CautionNotice({review}:{review:RecallReview|null|undefined}){
 if(!hasCaution(review))return null;
 return <aside className="clean-caution" role="alert"><h2>Caution: matching calls have a low win rate.</h2><p>{review!.contextual.rate}% won across {review!.contextual.total} matching calls. Open Proof details to inspect the cited results.</p></aside>;
}
