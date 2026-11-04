import type {warning} from './domain';
export type SqlRecallCitation={query:string;parameters:(string|number)[];rows:{receiptId:string;jobId:string;blobId:string;completedAt:string;seriesId?:string|null}[]};
export type RecallReview=ReturnType<typeof warning>&{sqlCitation:SqlRecallCitation};
