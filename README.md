# CALBOK

**The internet makes calls. CALBOK remembers receipts.**

[GitHub repository](https://github.com/0xileri/CALBOK)

A private prediction accountability app: lock prospective market calls, inspect immutable receipts, settle against eligible pricing, and recall prior outcomes as context for later calls.

## For judges

Open [calbok.xyz](https://calbok.xyz/). The interface uses a forest header, green wireframe backdrop, cream content cards and orange actions from the owner-supplied logo, inspired by the visible DigitalOcean sign-in page while keeping CALBOK branding. Viewers need no account. Loggers sign in with **email and a one-time code**, never a password.

| Page | What to do |
| --- | --- |
| [Home](https://calbok.xyz/) | See real public call cards immediately in alternating moving rows, then log a call. An empty feed shows “No public calls yet. Be the first.” |
| [Feed](https://calbok.xyz/feed) | Filter public calls by caller, asset, window and result. Open any card to see its call page. |
| Call: /call/<id> | See the caller, asset, direction, window, lock time and checked result. Expand **Proof details** for price source, record/price fingerprints and confirmed Walrus memory ID. |
| Caller: /caller/<handle> | Inspect that named caller’s public win rate, call count and recent calls. The username of the logger is separate from the named caller. |
| [Log a call](https://calbok.xyz/log) | Choose caller, exact asset, Bullish/Bearish, 15m/1h/4h/24h/7d, optional source and Public/Private. Review, confirm, then land directly on the locked call. |
| [My calls](https://calbok.xyz/my-calls) | Follow your own open calls and results. A qualifying caution appears clearly beside the matching call. |
| [Sign in](https://calbok.xyz/signin) | Enter one email field, then the one-time code. Each new account starts empty. |
| Account → Profile | Set a unique public username before publishing. Your email never appears on public calls. |
| [Admin](https://calbok.xyz/admin) | Owner only: integration proof counts, memory jobs, repeat series, provider settings and abuse moderation. |

A logger’s first run: sign in, open **Log a call**, choose genuine prediction terms and a **15m** window, then review and confirm. Original post text can be pasted optionally. If omitted, the review formats only the explicit terms chosen by the logger; no call exists until confirmation. The server assigns the lock time. After the window ends, the worker waits for the eligible price candle to finalize. Missing data stays unresolved. Completed, verified results follow the existing remember path; a later matching call can recall them. Caution still needs at least five matching completed wins/losses with a win rate below 40%.

Calls default to **Private**. Publishing requires a public username and explicit confirmation, and cannot be reversed. Existing calls are never published by deployment. Public views omit emails, original text, notes, inbox data, account/job IDs, raw memory text and credentials. Owner abuse hiding keeps the immutable record and audit event. Old receipt-fragment links still open the new call page; /proof now redirects to Feed, with the technical stage dashboard under Admin.

The homepage server-renders the first 24 real public calls, then refreshes **GET /api/public-feed?limit=24** every **45 seconds**, with a 45-second cache. Three cream-card rows over a forest wireframe backdrop alternate directions (two on short mobile screens); reduced-motion preferences show a static grid. Public-only counters show logged calls, verified settlements and confirmed Mainnet memories. New locks glow, and only server-confirmed wins/losses trigger result flashes. Each card links to its call page and, when supplied, its original post. Public source URLs accept HTTP/HTTPS only, omit credentials and sensitive query values, and open with `noopener noreferrer nofollow`. Missing sources say “No source link”. It uses CSS transform animation, pauses on hover, keyboard focus or touch, has a Play/Pause control, supports horizontal swiping, and stops moving for reduced-motion preferences. The duplicated animation track is hidden from assistive technology. No sample cards or invented outcomes fill empty space. Feed and individual-call APIs remain uncached; a cached ticker can take up to 45 seconds to reflect moderation.

How it works: **Lock → Settle → Remember**. Settlement checks Tatum, Coinbase or Binance candles, with GMGN for onchain assets. Walrus Mainnet memory and SQL-checked recall can add context to later calls. Public stats use visible, public, reproducibly settled calls only. Member limits remain **20 locks per UTC hour and 10 memory submission attempts per UTC day**; owner approvals, per-IP sign-in limits and fail-closed rules stay in force.

## Status

This deployed app has email accounts, live settlements and confirmed Mainnet memory proof: 38 completed Mainnet memories at the 6 November check. The restart/recall demonstration and a fresh Tatum Sui read are recorded in [restart recall proof](docs/proof/restart-recall-2026-11.md) and [Sui RPC proof](docs/proof/tatum-sui-rpc-2026-11.md). A live caution demonstration, the demo video and final submission artifacts remain unfinished. See the [submission checklist](docs/submission-checklist.md) for current counts and blockers. Primary origin: [calbok.xyz](https://calbok.xyz/); alias: [calbok.up.railway.app](https://calbok.up.railway.app/). [Brand guide](https://calbok.xyz/brand/index.html).

Implemented: branded responsive overview, call capture/detail, caller profiles, memory ledger, integration settings; SQLite persistence; SHA-256 snapshots; duplicate prevention; decimal directional settlement; server-side provider adapters; operator guard; bounded requests; contextual warning policy; automated tests.

My calls shows open windows and results, refreshed every 30 seconds. Call pages show the actual lock time and deadline; Admin holds the detailed job monitor. The server independently enforces eligible finalized candles and never substitutes a pre-lock price.

Caller profiles include a searchable directory, performance filters by exact market, horizon and direction, and breakdowns with visible sample sizes. Win rates exclude pending, neutral and unreproducible results; stored candle evidence must reproduce the verdict. Receipt-history search, outcome filters and ordering do not change performance totals. Same-symbol tokens remain separate by chain and contract.

Provider verification update (24 October 2026): Tatum Sui Mainnet gRPC coin metadata, one timestamp-validated historical BTC candle, Walrus authenticated recall, and GMGN search plus one VVV/Base historical candle now pass with locally configured credentials. See `docs/evidence/provider-verification.json` and `docs/evidence/gmgn-verification.json`. Confirmed writes are now visible in the Admin integration proof; a real caution demonstration remains pending. Other markets need their own coverage checks.

## Run locally

Requires **Node.js 24.19+** (uses built-in `node:sqlite`) and npm. SQLite is experimental in Node 24; expect its runtime warning.

```powershell
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run dev
```

Set a random `CALBOK_ADMIN_TOKEN` in `.env.local`, then open [CALBOK](http://127.0.0.1:3000) and open **/admin** for owner-key access. Local call capture works without provider keys. Store secrets only in `.env.local`; never paste them into a receipt.

1. Log a caller and original text. Search the 439-symbol Tatum catalog or use GMGN to select a token by chain and contract address. Coin, direction and horizon have no silent defaults.
2. Review the original text, exact market, direction and horizon before confirming. Back to edit preserves the draft. Confirm to lock the server timestamp, deadline, structured contract and snapshot hash; review alone creates no receipt.
3. Open the receipt to inspect its ID, UTC timestamps and source link. The settlement explanation shows reproducible entry/exit candle opens, market price change and the direction rule, with raw evidence available below. Use **Download PNG** for a branded image, or **Copy summary** for the full text record. PNGs are rendered locally in the browser; the expandable text preview also supports manual copying.
4. After the deadline, open the call’s **Manage this call → Check result**. Missing credentials/coverage remain explicit errors; no result is invented.
5. Once settled, use **Manage this call → Remember result**, then **Check past calls**. Only a completed job with a blob ID counts as a memory.

## Journal portability and memory inspection

Call receipts support exact-market, direction, horizon and outcome filters, plus lock-time or deadline sorting. Export all receipts, the filtered selection, or a single receipt as versioned JSON. Exports retain original evidence strings and snapshot hashes and exclude runtime credentials, provider settings and memory contents. These files are private data exports, not independent verification or full SQLite backups; import is not implemented. Choose CSV for spreadsheet analysis: UTF-8 output quotes multiline cells and prefixes formula-like text with an apostrophe. CSV omits raw candle JSON; JSON retains original strings and full stored evidence. Receipt links use a URL fragment containing only the record ID and still require operator access. Opening or copying a link does not publish the receipt.

The memory ledger separates confirmed completion (done plus blob ID), pending completion, uncertain acceptance and jobs needing attention. Filters and search inspect existing jobs without creating paid writes. Receipt actions remain the way to inspect or recheck a job. Overview win rates use the same reproducible-evidence checks as caller profiles.

## Configure integrations

Set `TATUM_API_KEY`, `MEMWAL_PRIVATE_KEY`, and `MEMWAL_ACCOUNT_ID`. For onchain token search, add `GMGN_API_KEY` inside `.env.local` (this is a file entry, not a PowerShell command). `MEMWAL_ACCOUNT_ID` is the account object, not the delegate's public agent ID. An optional `MEMWAL_SERVER_URL` selects a trusted relayer. Set `MEMWAL_NETWORK=mainnet` only after verifying that account/relayer configuration actually targets Mainnet; this flag is an operator attestation, not network proof.

```powershell
npm.cmd run providers:verify
```

This performs paid-credit Tatum reads only when a key is present: SUI metadata over native gRPC and an hour-old BTC candle. It also checks authenticated Walrus recall in a dedicated connection-check namespace, without printing private memory content or writing memories. Checks run independently and save credential-free evidence in `docs/evidence/provider-verification.json`. Without a Tatum key it exits nonzero and reports the blocker. On Windows PowerShell, use `npm.cmd run providers:verify` if execution policy blocks `npm.ps1`.

## Checks

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

`npm run build` creates a deployable Node server build; `npm start` serves it on loopback. Keep the SQLite file (`data/calbok.sqlite` by default) on persistent disk and back up its WAL consistently. Serverless ephemeral disks are unsuitable. The Railway deployment uses Node 24, one replica, a persistent SQLite volume at `/data`, a health check, and operator-token authentication. GitHub main deployments are connected. See [Railway operations](docs/railway.md). Before public rollout, configure and verify email delivery, review capacity and provider-cost limits, and explicitly enable account registration and member provider access. Sessions and ownership are stored on the persistent SQLite volume.

## Design boundaries

- Private owner journal with per-account receipt ownership and scoped APIs. Email verification authenticates an account, not the caller labels on receipts. Public signup and member provider operations are disabled by default. No public reputation rankings.
- Prospective directional calls support 15m, 1h, 4h, 24h and 7d; target calls, retrospective imports, disputes, X API verification, and automatic extraction are not implemented.
- The searchable catalog includes all 439 symbols from Tatum's official OHLCV schema, plus live GMGN token search. Provider listing or discovery is **not a promise of validated historical coverage**. Use the selected asset's **Verify historical pricing sample** button; entry/exit timestamps are independently checked again at settlement. Production acceptance should enforce coverage requirements for the relevant window.
- Structured fields are the scoring contract; prose is preserved as untrusted data and is never executed or interpreted by an LLM. The author must resolve contradictory prose before submitting.
- The Tatum price parser requires explicit millisecond `openTime`/`closeTime` and OHLC fields. Live verification confirmed a 59,999ms inclusive close for 1-minute data. The adapter normalizes only exact 59,999ms/60,000ms intervals to an exclusive close and preserves `sourceCloseTime` and the raw-response hash. Other durations are rejected.
- Settlement can run automatically with `CALBOK_WORKER_ENABLED=true` on Railway. A durable SQLite queue, leases, bounded batches, exponential retries, and visible paused jobs protect against duplicate work and repeated provider failures. The owner can opt into up to ten automatic Mainnet write attempts in Integration settings. Recall is initiated from the receipt. See [worker operations](docs/railway.md#settlement-worker).
- A Walrus timeout retains the accepted job for later status polling. Uncertain acceptance is blocked from automatic resubmission to avoid duplicate paid writes. Provider reconciliation is required.
- Memory recall is semantically filtered, SQL-resolved and category-matched; it is neither complete history enumeration nor arithmetic authority. Minimum caution sample: 5.
- Sui metadata proves coin identity, not historical USD pricing.
- System fonts keep the interface fast and work offline; external font requests are removed.

## Coin discovery and provider choice

Tatum remains the historical source for its documented markets. Refresh the catalog with `npm.cmd run assets:sync`; this reads only the symbol enum from Tatum's official documentation, without a paid query for every symbol.

GMGN is a query-only, server-side integration using its official read-route protocol. Search by name, symbol or contract; confirm the exact chain/address. Symbols alone are not unique. A selected GMGN token uses a canonical `gmgn:chain:address` ID, persists its metadata, and locks that mapping in the receipt snapshot. There is no automatic fallback to another provider after locking. No GMGN signing key, wallet, or trading endpoint is used.

To check GMGN without writing predictions or memories:

```powershell
npm.cmd run gmgn:verify
```

To verify the specific Base VVV contract and save public candle evidence:

```powershell
npm.cmd run gmgn:verify -- gmgn:base:0xacfe6019ed1a7dc6f7b508c02d1b04ec88cc21bf
```

See [coin coverage and provider comparison](docs/coin-coverage.md). Dune is evaluated but not integrated: its interpolated/forward-filled minute prices do not satisfy this release's candle-open scoring contract without a separate, clearly versioned method.

See [architecture](docs/architecture.md), [scoring](docs/scoring.md), and [actual submission checklist](docs/submission-checklist.md).

## Official integration references

[Tatum OHLCV](https://docs.tatum.io/reference/getsymbolohlcv), [Tatum Sui RPC](https://docs.tatum.io/reference/rpc-sui), [Walrus SDK usage](https://docs.wal.app/walrus-memory/sdk/usage/memwal), [Walrus SDK API](https://docs.wal.app/walrus-memory/sdk/api-reference). Documentation checked 24 October 2026. See the evidence files above for verified reads, and the [live run evidence](docs/proof/caution-loop-2026-11.md) for confirmed Mainnet memory writes.

## Sign-in and account boundaries

The public root shows a branded sign-in screen instead of an operator-token error. The existing owner can open **Workspace owner access**, enter the existing admin key once, and start a seven-day session. Browser credentials are in an HttpOnly, SameSite=Lax cookie (Secure over HTTPS), not localStorage. Sign out revokes the server session. The top-right avatar and sidebar Your account button open Account profile with the authenticated email, access role and sign-out controls. Account profile supports a display name up to 60 characters, with initials updated in the header and sidebar. Blank names restore the email-based fallback. Display names are scoped to the authenticated account and do not rewrite immutable receipt caller labels. Account profile also lists active browser sessions and their UTC expiry times. Sign out other sessions revokes only the current account’s other active sessions, preserving this browser session. Up to 20 sessions are displayed, with full counts. Session management requires a valid browser cookie; bearer-only API clients cannot use these controls. Session tokens, token hashes, IP addresses and device fingerprints are never returned. Sign-in email editing is not implemented. Existing bearer-key API clients continue to work. Configure an operator token for local owner access. Production requires the token before protected requests can authenticate.

Email-code login is implemented but stays unavailable until `RESEND_API_KEY`, `CALBOK_EMAIL_FROM` (a verified sender), and `CALBOK_OWNER_EMAIL` are set. `CALBOK_SESSION_SECRET` is an optional separate random 32+ character code-hashing secret; otherwise the strong admin key is used. Codes expire in 10 minutes, permit five attempts, and work once. Only HMAC code digests and session-token hashes are stored. Email requests have durable per-address and global hourly budgets. No code is printed to logs or returned to the browser. Delivery is not live-verified while email is unconfigured.

`CALBOK_PUBLIC_SIGNIN_ENABLED=false` keeps email login owner-only. `CALBOK_USER_PROVIDER_ACCESS=false` blocks member provider actions and automatic member settlement; changing it may incur provider costs. Enabling either is a deliberate deployment setting, not something the sign-in UI does. New accounts get separate journals. Legacy records stay owned by `operator`; ownership is an additive immutable mapping, preserving original snapshots and hashes. Receipt reads, actions, memory ledgers and recall history resolve within the authenticated owner. Member memory namespaces include the account ID. Worker processing remains internal, with member eligibility gated by provider access.

JSON/CSV exports contain only the signed-in account's journal. Public receipt pages and account import are not implemented. A direct receipt link still requires access to the owning account. Database backups should include sessions, accounts and ownership tables; never share the database publicly.

## Private saved drafts

Log a call includes **Save draft**, even before market, direction or horizon are selected. One private draft is stored per account on the server. Reopening Log a call resumes it across browsers and reloads. Saving is explicit; closing without Save draft discards unsaved edits. Drafts do not create receipt IDs, deadlines, scores, settlement jobs or memory writes.

The draft API scopes every read/write to the authenticated account and uses an optimistic version check. Stale saves fail with a conflict instead of overwriting newer work. Receipt capture clears only the matching saved version in the same database transaction; a newer draft from another browser is preserved. A cleared draft retains a version counter to prevent stale saves from resurrecting or overwriting it. Draft text is omitted from receipt JSON/CSV exports until a call is confirmed and locked.

Custom domains must be included in the explicit origin configuration. Set `CALBOK_PUBLIC_ORIGIN=https://calbok.xyz` for the primary workspace and `CALBOK_ADDITIONAL_ORIGINS=https://calbok.up.railway.app` for the alias. Do not include paths, trailing slashes or wildcards. Unlisted origins and missing Origin headers on protected mutations remain refused. Cookies stay host-only, so each domain requires its own sign-in.

### Capture calls without a scoring deadline

**Log a call** opens a quick form: original text is required; caller and HTTPS source are optional. The private Call inbox keeps up to the latest 100 captured entries visible, with total counts and local search. Captured entries are unscored and never create settlement jobs, provider requests or Walrus writes. The server records the logging time; it does not verify an external publication time or authorship. Retried saves with the same request ID are idempotent per owner. Use the separate **Lock a forward-looking prediction** option only when the market, direction and scoring horizon are known. Inbox entries stay separate from immutable prospective receipt statistics and exports.

Captured inbox calls also support a local branded PNG export and a plain-text copy, explicitly labeled unscored with no deadline. Exports retain the caller, original text, complete source link and logging time, without claiming an outcome or original publication time. The summary keeps original line breaks. Very tall PNG layouts condense whitespace and label the adjustment; the full text summary retains original formatting. No export is automatically published or sent to a rendering service.

Captured calls support a private reflection and a manual Reviewed flag. These are separate from market outcomes: they never affect win rates or create pricing, settlement or Walrus jobs. Notes load only when the review is opened, require the owning account, and use version conflicts to reject stale saves. Inbox filters cover all, awaiting-review and reviewed entries within the latest 100 loaded calls. PNG and text exports exclude the private reflection and review status.

Overview includes a private captured-call review queue with total capture count, review counts for the latest 100 entries, and up to three pending calls. Opening a queue item filters the inbox by exact call ID and expands its review. Queue reads do not fetch private notes or create provider jobs.

Captured-call CSV export respects the current search/review filter within the latest 100 entries. It explicitly exports call identity, text, caller, source, logging timestamp, personal review status and unscored label. Private notes and credentials are excluded; formula-like cells are neutralized for spreadsheets. This is not a full historical inbox backup.

Call inbox now loads older history in cursor-based batches of 100, ordered by logging time and ID. Search, review filters and CSV apply to the loaded entries; Load older calls expands that scope. Overview review queue remains limited to the latest 100. Cursors never change account ownership or include private review notes.

Screenshot capture: Log a call accepts PNG/JPEG/WebP images up to 8 MB and 12 megapixels. English OCR runs locally in a browser worker using self-hosted Tesseract assets generated by prebuild/predev. Images are neither uploaded nor retained by the server. Review/edit the full extracted text and suggested caller, apply it to the call form, then explicitly save. Tickers and timestamps are unverified text; no scoring terms, prices, identity or post times are inferred. Screenshots themselves are not retained as evidence.

Screenshot capture also accepts one dropped image or an image pasted with Ctrl+V/Command+V into the focused screenshot area. Plain-text paste remains untouched. Paste/drop share the upload validation, local OCR worker and explicit confirmation flow; inputs are blocked while reading or saving.

Quick call capture checks the signed-in owner's full inbox for equal whitespace/case-normalized text or the same source before saving. X/Twitter status links normalize by post ID, including history/share variants; other URLs retain their queries. The warning shows at most five call IDs/callers/logging times, excludes private notes, and never edits or removes records. Users can explicitly keep another copy. This is an advisory UI check, not a database uniqueness guarantee or semantic/OCR similarity detector.

Caller profiles now include caller labels from captured calls, with full-history captured/reviewed totals and paginated owner-scoped captured history. ASCII case differences group the same label across captures and scored receipts; this is not identity verification. Private reviews load only when a captured call is opened. Personal reviewed status is separate from verified win/loss outcomes and excluded from performance metrics. Performance filters apply only to scored receipts, not the captured history.

Integration proof tracks the real lock → verified settlement → completed Mainnet memory → SQL-linked recall → caution loop. Viewing /api/integration-proof only reads local stored evidence; it does not run providers. Remember confirmation atomically records job/blob/network evidence, and Recall stores its computed warning and receipt citations without raw memory contents. Pending jobs, missing network records, invalid outcomes and cross-owner records do not advance proof. Publication and restart demonstrations remain explicit manual checks.

## Public feed and caller records

[Live calls](https://calbok.xyz/feed) is open without sign-in, with caller, exact asset, horizon and outcome filters and paginated newest-first receipts. `/caller/<handle>` describes the named prediction caller, not the user who logged the call. Its record uses public, visible, reproducibly settled calls only; neutral results never inflate win rate. Every card is labeled self-logged before outcome. Neither a caller label nor a logger username verifies authorship. Owner-scheduled repeats keep their disclosure.

Profile usernames use 3–30 letters, numbers or underscores, are unique without case differences, and are required for publishing. Original call text, source URLs, emails, display names, private notes, inbox data, job IDs, account IDs and raw memory text stay out of public responses. Snapshot hashes and qualifying blob IDs are public proof identifiers. `/proof` now respects the same visibility and abuse hiding for owner receipts. Existing calls remain private until explicitly published.

Owners can hide a published call for abuse through the feed moderation control or the receipt. Hiding retains its immutable terms, settlement and memory, with an atomic audit event; republishing cannot bypass the hidden state. Member lock quota is 20 per UTC hour; the existing 10 memory submission attempts per UTC day and operator approval budgets remain in place. Sign-in attempts share a durable per-IP limit of 30 per 15-minute window across code requests, verification and owner-key login.
