import type {RecallReview} from './recall-types';
export function hasCaution(review:RecallReview|null|undefined){return !!review&&review.priority==='caution'&&review.contextual.total>=5&&review.contextual.rate!==null&&Number(review.contextual.rate)<40&&review.citedIds.length>=5&&review.sqlCitation.rows.length>=5;}
