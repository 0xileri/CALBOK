# Railway deployment

Use one Node 24 Docker service and one persistent volume mounted at `/data`. Set `CALBOK_DB_PATH=/data/calbok.sqlite`, `PORT=3000`, a random operator token of at least 32 characters, and `CALBOK_PUBLIC_ORIGIN` to the exact HTTPS origin. Provider credentials are runtime variables. Local environment files and data are excluded from upload and Docker builds.

The public `/api/health` endpoint checks SQLite without exposing records. Journal APIs require the operator token; paste it into Integration settings. Keep one replica because storage and rate limits are local to the service. Configure the health check to `/api/health`.

Startup listens on `0.0.0.0` and Railway's `PORT`. Existing local receipts are not copied to production. Back up the volume before destructive maintenance.

## Settlement worker

Set `CALBOK_WORKER_ENABLED=true` to start the settlement loop with the web server. The production launcher sets `CALBOK_WORKER_RUNTIME=1` only on the running server, so builds never process the queue. Next's instrumentation hook starts one loop per process; SQLite coordinates ownership across overlapping instances. Keep the existing single-replica persistent-volume deployment.

The loop runs once a minute, processes at most three due receipts, and requests up to two historical candles per receipt. These reads consume provider credits. It waits until deadline + 60 seconds; missing, malformed, or unavailable evidence never becomes a loss. Failures back off from one minute to one hour and pause after eight attempts. Check settlement manually to retry a paused job after resolving coverage or credentials.

Job state, next retry, attempts, sanitized error codes, and a worker heartbeat are visible in Integration settings and receipt details. Status refreshes every 30 seconds while the browser is visible. The UI displays the latest 100 jobs; the worker processes the full queue. Each job has a two-minute lease; an abandoned job can be recovered after expiry. Settlement, job completion, and its audit event commit together. Manual and automatic settlement share the same lease and immutable outcome contract.

Disabling `CALBOK_WORKER_ENABLED` stops background processing after redeployment and preserves jobs. The loop does not write or recall Walrus memories. Those actions remain manual. This is an in-process worker for the existing long-lived Railway server, not a separately scaled queue service.
