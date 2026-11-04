# Railway deployment

Use one Node 24 Docker service and one persistent volume mounted at `/data`. Set `CALBOK_DB_PATH=/data/calbok.sqlite`, `PORT=3000`, a random operator token of at least 32 characters, and `CALBOK_PUBLIC_ORIGIN=https://calbok.xyz` for the primary workspace. Set `CALBOK_ADDITIONAL_ORIGINS=https://calbok.up.railway.app` for the alias. Provider credentials are runtime variables. Local environment files and data are excluded from upload and Docker builds.

The public `/api/health` endpoint checks SQLite without exposing records. Journal APIs require the operator token; paste it into Integration settings. Keep one replica because storage and rate limits are local to the service. Configure the health check to `/api/health`.

Startup listens on `0.0.0.0` and Railway's `PORT`. Existing local receipts are not copied to production. Back up the volume before destructive maintenance.

## Settlement worker

Set `CALBOK_WORKER_ENABLED=true` to start the settlement loop with the web server. The production launcher sets `CALBOK_WORKER_RUNTIME=1` only on the running server, so builds never process the queue. Next's instrumentation hook starts one loop per process; SQLite coordinates ownership across overlapping instances. Keep the existing single-replica persistent-volume deployment.

The loop runs once a minute, processes at most three due receipts, and requests up to two historical candles per receipt. These reads consume provider credits. It acknowledges due deadlines on its next one-minute sweep, including while a prior provider batch is running. Price reads wait until the first eligible exit minute closes: `ceil(deadline / 60,000) * 60,000 + 60,000`, which is 60–120 seconds after the deadline. Finalized, available evidence can then settle in a bounded batch; provider delays, retries and backlog may take longer. Missing, malformed, or unavailable evidence never becomes a loss. Failures back off from one minute to one hour and pause after eight attempts. Check settlement manually to retry a paused job after resolving coverage or credentials.

Job state, next retry, attempts, sanitized error codes, and a worker heartbeat are visible in Integration settings and receipt details. Status refreshes every 30 seconds while the browser is visible. The UI displays the latest 100 jobs; the worker processes the full queue. Each job has a two-minute lease; an abandoned job can be recovered after expiry. Settlement, job completion, and its audit event commit together. Manual and automatic settlement share the same lease and immutable outcome contract.

Disabling `CALBOK_WORKER_ENABLED` stops background processing after redeployment and preserves jobs. Automatic Walrus Mainnet writes default on for the operator; an explicit saved off setting stays off. The owner can pause them in Integration settings. The initial budget permits ten automatic attempts, including eligible existing settlements. The owner can explicitly approve the current backlog with Remember all settled. The worker checks accepted jobs by ID. Recall is initiated from the receipt. This is an in-process worker for the existing long-lived Railway server, not a separately scaled queue service.

## Browser sign-in

Owner browser login uses the existing `CALBOK_ADMIN_TOKEN` under Workspace owner access and creates an HttpOnly seven-day session cookie. Sign out revokes that session; bearer API clients remain supported. Keep the admin key private. No new Railway secret is required for owner login.

Set these runtime variables for owner email login.

- `RESEND_API_KEY`: Resend sending key, format `re_...` (use your own key, never commit it).
- `CALBOK_EMAIL_FROM`: sender on a domain verified in Resend, for example `CALBOK <login@calbok.xyz>`.
- `CALBOK_OWNER_EMAIL`: lowercase owner address, for example `owner@example.com`.
- `CALBOK_SESSION_SECRET`: at least 32 random characters; format example `<64 random hexadecimal characters>` (generate locally; do not use a literal example).

For judge access set `CALBOK_PUBLIC_SIGNIN_ENABLED=true` and `CALBOK_USER_PROVIDER_ACCESS=true`. Email uses the existing one-time code (no password). Every account starts empty and its journal and recall namespace stay isolated. Set either flag false to close the corresponding capability.

To change the owner email, update `CALBOK_OWNER_EMAIL` and restart the service. The new address signs into the existing operator workspace on its next successful email login, even if it previously had a member account. The former address loses access through email-based owner sessions. Existing receipts and their snapshots stay attached to their original workspace IDs. Operator-key sessions are managed separately under Account profile.

## Walrus Mainnet

Set `MEMWAL_PRIVATE_KEY`, `MEMWAL_ACCOUNT_ID`, `MEMWAL_NETWORK=mainnet` and `CALBOK_WORKER_ENABLED=true`. Automatic writes default on for the operator; the Integration settings toggle can turn them off. Existing explicit off settings are preserved.

When the worker and Walrus Mainnet settings are configured, the worker checks due jobs before submitting new ones, with backoff up to 15 minutes. Polling continues for manual and automatic jobs even when automatic writes are off. An explicit connection refusal before submission releases the automatic attempt. When the provider confirms a terminal failure, the next retry uses a fresh idempotency key. Failed manual submissions require a manual retry.

For an uncertain submission, open the receipt as the owner and select **Reconcile memory job**. If reconciliation finds a matching blob without a verified job ID, it puts the receipt into manual review and displays the blob ID. Verify it in Walrus, then select **Confirm and link blob**. If you confirm that the write failed, select **Mark memory job failed** to allow a manual retry. CALBOK records the decision, the owner who made it, and the time. An owner-confirmed blob link stays outside integration proof because that proof requires a verified provider job ID. A missing provider result leaves acceptance uncertain.

Schema additions are additive: `prediction_owners`, `accounts`, `sessions`, `login_codes`, and `login_limits`. Existing predictions remain assigned to the operator without rewriting their immutable snapshots. The same persistent volume is required. Rotating the admin key changes owner-key login and the fallback code-hashing secret; existing sessions must be revoked explicitly if compromise is suspected.


### Price source order

For catalog assets, pricing tries Tatum, then Coinbase USD candles when Tatum is stale or has no matching boundary, then Binance public spot USDT klines when Coinbase has no symbol or eligible history. Binance evidence retains the exact pair, raw kline and SHA-256 hash. USD and USDT candles are never mixed within one settlement. Only exact spot base symbols are used; scaled `1000` pairs are not substituted. GMGN remains the exclusive source for `gmgn:` assets.

Settlements (manual and worker) enqueue verified operator outcomes for memory. Worker startup and each cycle backfill the durable queue. Dispatch is limited to one new automatic submission per minute and an initial budget of ten writes; extra queued receipts wait for operator action on the budget. Confirmed failed automatic submissions refund the budget and retry with exponential backoff, up to eight failures before manual review. Uncertain acceptance never resubmits automatically. Pending jobs have polling priority, even with writes off. Manual failures remain manual-only. Confirmed completion triggers automatic recall for the same owner, preserving the before-lock citation checks.

Deployment `binance-fallback-v2` requeues unsettled jobs paused for `TATUM_STALE_CANDLE` or `TATUM_PRICE_BOUNDARY_UNAVAILABLE` once. Other manual-review jobs and all immutable settlements stay unchanged.

If the Binance trading API host rejects the deployment location (HTTP 403/451), pricing uses Binance's documented public market-data-only host, `data-api.binance.vision`, for the same klines endpoint. This requires no account or API key and does not grant trading access. See https://github.com/binance/binance-spot-api-docs/blob/master/faqs/market_data_only.md.

### Memory backlog and owner approval

The ledger lists provider jobs, while the durable automatic queue includes receipts waiting to be submitted. They are different counts. The default ten-write budget and one new submission per minute can leave many settled receipts without a provider job yet. Settings now displays the waiting count and whether the budget is blocking it. The owner-only **Remember all settled** action backfills eligible receipts and explicitly approves enough budget for the current verified backlog, then enables automatic dispatch. Repeated clicks do not double the budget or create duplicate jobs. This does not change the dispatch rate, pending-job priority, uncertain-submission protection, or manual-only failed jobs. Future receipts outside that approval remain subject to the approved limit.

**Lock again** copies a verified settled receipt into a review form. Confirmation creates a new linked receipt at server time and uses the normal settlement, memory and recall flow. It does not backdate the call or rewrite the original. Identical requests repeating the same original receipt are deduplicated. Repeating a historical prediction is a new prospective statement, not independent evidence that its author made another post.

Settings checks the four email variable names without returning their values. **Send owner sign-in test** sends through the normal one-time-code delivery path and normal login rate limits. Provider acceptance proves Resend accepted the request; inbox delivery and completing the sign-in still need to be confirmed by the owner. Public sign-in is enabled on the judge deployment; member provider access is explicitly controlled by `CALBOK_USER_PROVIDER_ACCESS`.


### Owner repeat series

The owner can explicitly confirm 1–10 additional scheduled locks from a verified settled 15m/1h/4h receipt with a confirmed Mainnet memory proof. No series starts by default. Series confirmation approves memory submissions only for generated step IDs and does not increase `automatic_memory_budget`. Scheduled attempts are tracked separately from the general budget; both use the existing reservation, idempotency, submission-rate and polling paths. Keep automatic memory enabled. Pausing it stops future series locks.

`repeat_series` and `repeat_series_steps` persist owner confirmation, count, current receipt and recall state on the existing volume. A step association and progress update commit with the normal immutable receipt capture. The worker creates at most one new scheduled lock per invocation, only after the previous step's verified settlement and memory completion. Count completion, caution, an owner Stop, or a failed/uncertain provider operation prevents future locks. Already locked calls remain valid and can finish previously approved memory writes; failed scheduled submissions require manual review and are not automatically resubmitted. Uncertain recall after an interrupted process stops conservatively if no saved review can be recovered within three minutes.

Receipts, exports and memory payloads disclose `scheduled repeat by owner, series <id>`. These are owner-scheduled predictions, not new posts from the referenced caller. Follow [the demo runbook](demo-runbook.md#owner-opt-in-repeat-series-scheduled-predictions-not-caller-posts) when presenting them.

## Judge accounts and public proof

`/proof` is public and read-only. It publishes only the operator’s verified stage counts and settled receipt IDs, asset/direction/horizon/outcome, return, provider, snapshot hash and qualifying Mainnet blob ID. It excludes caller text, source URLs, emails, account details, inbox data, private notes, raw memories, job errors and credentials. Visiting it never queries a provider or submits a write.

Member limits are persisted in SQLite and shared by browser actions and worker submissions: **20 successful locks per UTC clock hour**, **10 new memory submission attempts per UTC day**, and **60 settlement/recall/status operations per UTC clock hour**. Attempts with uncertain acceptance retain their reservation; checking an existing memory job does not consume another write. Member limits do not change the operator’s existing approval budget. With member provider access on, worker settlement and backfill include member receipts; the owner automatic-write toggle continues to govern operator receipts only. The common one-new-memory-per-minute dispatch limit remains in place.

## Public receipt visibility and sign-in IP limits

Every existing and new receipt defaults to private. Users need a unique public username before explicitly publishing at lock or afterward; publication cannot be reversed. The owner can hide abuse without deleting predictions, settlements or memory. Visibility, hidden state and publication audit events are stored separately from immutable prediction snapshots. `/feed`, `/api/feed`, `/caller/<handle>`, `/api/caller/<handle>` and owner `/proof` exclude private and hidden records. No deployment bulk-publishes existing calls. Caller pages aggregate the named prediction caller across published calls, with each logger shown separately.

Sign-in request, verify and operator-login actions share 30 attempts per 15-minute window per IP; email/global code limits still apply. Only IP hashes are stored. Railway public ingress supplies `X-Real-IP` ([networking specification](https://docs.railway.com/networking/public-networking/specs-and-limits)); proxy trust is enabled automatically only in Railway. For another deployment, set `CALBOK_TRUST_PROXY=true` only behind a controlled ingress that overwrites `X-Real-IP` and prevents direct client access. Untrusted or missing headers use a shared fail-closed bucket; arbitrary `X-Forwarded-For` is never trusted. Logout stays available even after the sign-in limit.

## Simplified product routes

Public journeys use `/`, `/feed`, `/call/<id>` and `/caller/<handle>`. Loggers use `/log`, `/my-calls`, `/signin` and Account → Profile. Owner tools are grouped at `/admin`, with a server-side owner check before the tools render. The ordinary sign-in page is email-only; owner-key sign-in lives on Admin. Existing receipt-fragment links redirect to `/call/<id>`; `/proof` redirects to Feed. No scoring, memory submission, budget or visibility policy changes are introduced by the interface redesign.

`GET /api/public-feed?limit=24` is the privacy-allowlisted ticker endpoint, with browser/shared-cache max-age 45 seconds. A cached ticker may reflect moderation up to 45 seconds later; `/api/feed` and `/api/public-calls/<id>` remain no-store. Public call pages receive only the public allowlist. The logger’s own private details load through the existing cookie-authenticated workspace API, never through public page props. Admin contains moderation, reconciliation, job resolution and repeat-series controls.
