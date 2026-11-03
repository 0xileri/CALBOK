export type MemoryJob={prediction_id:string;status:string;blob_id:string|null;job_id:string|null;namespace:string;error?:string|null;completed_at?:string|null};
export function memoryStage(job:MemoryJob) {
  if(job.status==='done'&&job.blob_id)return 'completed';
  if(job.status==='retryable'||job.status==='manual_retryable'||job.status==='manual_review')return 'attention';
  if(!job.job_id)return 'uncertain';
  if(job.error||job.status==='failed'||job.status==='done')return 'attention';
  return 'pending';
}
