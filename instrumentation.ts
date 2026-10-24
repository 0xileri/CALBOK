export async function register() {
  // The runtime marker is set by the production launcher, never by next build.
  if(process.env.NEXT_RUNTIME==='nodejs' && process.env.CALBOK_WORKER_ENABLED==='true' && process.env.CALBOK_WORKER_RUNTIME==='1') {
    const {startSettlementWorker}=await import('./lib/settlement-worker');
    startSettlementWorker();
  }
}
