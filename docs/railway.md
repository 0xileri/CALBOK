# Railway deployment

Use one Node 24 Docker service and one persistent volume mounted at `/data`. Set `CALBOK_DB_PATH=/data/calbok.sqlite`, `PORT=3000`, a random operator token of at least 32 characters, and `CALBOK_PUBLIC_ORIGIN=https://calbok.up.railway.app` for the primary workspace. Set `CALBOK_ADDITIONAL_ORIGINS=https://calbok.xyz` for the alias. Provider credentials are runtime variables. Local environment files and data are excluded from upload and Docker builds.

The public `/api/health` endpoint checks SQLite without exposing records. Journal APIs require the operator token; paste it into Integration settings. Keep one replica because storage and rate limits are local to the service. Configure the health check to `/api/health`.

Startup listens on `0.0.0.0` and Railway's `PORT`. Existing local receipts are not copied to production. Back up the volume before destructive maintenance.

## Settlement worker

Set `CALBOK_WORKER_ENABLED=true` to start the settlement loop with the web server. The production launcher sets `CALBOK_WORKER_RUNTIME=1` only on the running server, so builds never process the queue. Next's instrumentation hook starts one loop per process; SQLite coordinates ownership across overlapping instances. Keep the existing single-replica persistent-volume deployment.

The loop runs once a minute, processes at most three due receipts, and requests up to two historical candles per receipt. These reads consume provider credits. It waits until deadline + 60 seconds; missing, malformed, or unavailable evidence never becomes a loss. Failures back off from one minute to one hour and pause after eight attempts. Check settlement manually to retry a paused job after resolving coverage or credentials.

Job state, next retry, attempts, sanitized error codes, and a worker heartbeat are visible in Integration settings and receipt details. Status refreshes every 30 seconds while the browser is visible. The UI displays the latest 100 jobs; the worker processes the full queue. Each job has a two-minute lease; an abandoned job can be recovered after expiry. Settlement, job completion, and its audit event commit together. Manual and automatic settlement share the same lease and immutable outcome contract.

Disabling `CALBOK_WORKER_ENABLED` stops background processing after redeployment and preserves jobs. The owner can enable automatic Walrus Mainnet writes in Integration settings. The worker reserves at most ten automatic attempts, including eligible existing settlements, and checks accepted jobs by ID. Recall is initiated from the receipt. This is an in-process worker for the existing long-lived Railway server, not a separately scaled queue service.

## Browser sign-in

Owner browser login uses the existing `CALBOK_ADMIN_TOKEN` under Workspace owner access and creates an HttpOnly seven-day session cookie. Sign out revokes that session; bearer API clients remain supported. Keep the admin key private. No new Railway secret is required for owner login.

Set these runtime variables for owner email login.

- `RESEND_API_KEY`
- `CALBOK_EMAIL_FROM` with a sender on a domain verified in Resend
- `CALBOK_OWNER_EMAIL` with the lowercase owner address
- `CALBOK_SESSION_SECRET` with at least 32 random characters

Set `CALBOK_PUBLIC_SIGNIN_ENABLED=false` and `CALBOK_USER_PROVIDER_ACCESS=false` for this private workspace.

To change the owner email, update `CALBOK_OWNER_EMAIL` and restart the service. The new address signs into the existing operator workspace on its next successful email login, even if it previously had a member account. The former address loses access through email-based owner sessions. Existing receipts and their snapshots stay attached to their original workspace IDs. Operator-key sessions are managed separately under Account profile.

## Walrus Mainnet

Set `MEMWAL_PRIVATE_KEY`, `MEMWAL_ACCOUNT_ID`, `MEMWAL_NETWORK=mainnet` and `CALBOK_WORKER_ENABLED=true`. Enable automatic writes explicitly in Integration settings.

Due accepted jobs are checked before new submissions, with backoff up to 15 minutes. An explicit connection refusal before submission releases the automatic attempt. An uncertain submission requires the owner to use **Reconcile memory job** on the receipt. Reconciliation can check a known job or recover a completed job by matching its receipt and blob. A missing result leaves acceptance uncertain. A confirmed terminal failure on a known job can be retried manually.

Schema additions are additive: `prediction_owners`, `accounts`, `sessions`, `login_codes`, and `login_limits`. Existing predictions remain assigned to the operator without rewriting their immutable snapshots. The same persistent volume is required. Rotating the admin key changes owner-key login and the fallback code-hashing secret; existing sessions must be revoked explicitly if compromise is suspected.
