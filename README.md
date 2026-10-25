# CALBOK

**The internet makes calls. CALBOK remembers receipts.**

[GitHub repository](https://github.com/0xileri/CALBOK)

A private prediction accountability app: lock prospective market calls, inspect immutable receipts, settle against eligible pricing, and recall prior outcomes as context for later calls.

## Status

This is a working **private owner deployment with gated account support** with live provider checks, not a final hackathon submission. The repository started empty on 24 October 2026. There are **zero verified Mainnet memory writes** and no fabricated prices, callers, or scores in the app.

Live workspace: [calbok.up.railway.app](https://calbok.up.railway.app/). Brand guide: [identity and assets](https://calbok.up.railway.app/brand/index.html). Visitors see a sign-in screen. Journal APIs require a browser session or the existing operator bearer key. Public registration remains closed until email delivery is configured.

Implemented: branded responsive overview, call capture/detail, caller profiles, memory ledger, integration settings; SQLite persistence; SHA-256 snapshots; duplicate prevention; decimal directional settlement; server-side provider adapters; operator guard; bounded requests; contextual warning policy; automated tests.

The overview includes a Due next deadline list, sorted oldest deadline first, with upcoming, eligible and paused-job filters. Deadlines use UTC; eligibility previews refresh every 30 seconds and wait one minute after the deadline. The server independently enforces settlement timing.

Caller profiles include a searchable directory, performance filters by exact market, horizon and direction, and breakdowns with visible sample sizes. Win rates exclude pending, neutral and unreproducible results; stored candle evidence must reproduce the verdict. Receipt-history search, outcome filters and ordering do not change performance totals. Same-symbol tokens remain separate by chain and contract.

Provider verification update (24 October 2026): Tatum Sui Mainnet gRPC coin metadata, one timestamp-validated historical BTC candle, Walrus authenticated recall, and GMGN search plus one VVV/Base historical candle now pass with locally configured credentials. See `docs/evidence/provider-verification.json` and `docs/evidence/gmgn-verification.json`. Completed Walrus writes and memory changing a real new-call warning remain release blockers. Other markets need their own coverage checks.

## Run locally

Requires **Node.js 24.19+** (uses built-in `node:sqlite`) and npm. SQLite is experimental in Node 24; expect its runtime warning.

```powershell
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run dev
```

Open [CALBOK](http://127.0.0.1:3000). No account or provider key is needed to lock a local prospective call. Store secrets only in `.env.local`; never paste them into a receipt.

1. Log a caller and original text. Search the 439-symbol Tatum catalog or use GMGN to select a token by chain and contract address. Coin, direction and horizon have no silent defaults.
2. Review the original text, exact market, direction and horizon before confirming. Back to edit preserves the draft. Confirm to lock the server timestamp, deadline, structured contract and snapshot hash; review alone creates no receipt.
3. Open the receipt to inspect its ID, UTC timestamps and source link. The settlement explanation shows reproducible entry/exit candle opens, market price change and the direction rule, with raw evidence available below. Use **Download PNG** for a branded image, or **Copy summary** for the full text record. PNGs are rendered locally in the browser; the expandable text preview also supports manual copying.
4. After the deadline, use **Check settlement**. Missing credentials/coverage remain explicit errors; no result is invented.
5. Once settled, use **Remember outcome**, then **Check context**. Only a completed job with a blob ID counts as a memory.

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
- Only directional 24-hour/7-day prospective calls; target calls, retrospective imports, disputes, X API verification, and automatic extraction are not implemented.
- The searchable catalog includes all 439 symbols from Tatum's official OHLCV schema, plus live GMGN token search. Provider listing or discovery is **not a promise of validated historical coverage**. Use the selected asset's **Verify historical pricing sample** button; entry/exit timestamps are independently checked again at settlement. Production acceptance should enforce coverage requirements for the relevant window.
- Structured fields are the scoring contract; prose is preserved as untrusted data and is never executed or interpreted by an LLM. The author must resolve contradictory prose before submitting.
- The Tatum price parser requires explicit millisecond `openTime`/`closeTime` and OHLC fields. Live verification confirmed a 59,999ms inclusive close for 1-minute data. The adapter normalizes only exact 59,999ms/60,000ms intervals to an exclusive close and preserves `sourceCloseTime` and the raw-response hash. Other durations are rejected.
- Settlement can run automatically with `CALBOK_WORKER_ENABLED=true` on Railway. A durable SQLite queue, leases, bounded batches, exponential retries, and visible paused jobs protect against duplicate work and repeated provider failures. Memory writes and recall remain manual. See [worker operations](docs/railway.md#settlement-worker).
- A Walrus timeout retains the accepted job for later status polling. Uncertain acceptance is blocked from automatic resubmission to avoid duplicate paid writes. Provider reconciliation is required.
- Memory recall is semantically filtered, SQL-resolved and category-matched; it is neither complete history enumeration nor arithmetic authority. Minimum caution sample: 5.
- Sui metadata proves coin identity, not historical USD pricing.
- Fonts optionally load from Google Fonts; system fonts work offline.

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

[Tatum OHLCV](https://docs.tatum.io/reference/getsymbolohlcv), [Tatum Sui RPC](https://docs.tatum.io/reference/rpc-sui), [Walrus SDK usage](https://docs.wal.app/walrus-memory/sdk/usage/memwal), [Walrus SDK API](https://docs.wal.app/walrus-memory/sdk/api-reference). Documentation checked 24 October 2026. See the evidence files above for verified reads; Mainnet memory writes remain pending.

## Sign-in and account boundaries

The public root shows a branded sign-in screen instead of an operator-token error. The existing owner can open **Workspace owner access**, enter the existing admin key once, and start a seven-day session. Browser credentials are in an HttpOnly, SameSite=Lax cookie (Secure over HTTPS), not localStorage. Sign out revokes the server session. The top-right avatar and sidebar Your account button open Account profile with the authenticated email, access role and sign-out controls. Account profile supports a display name up to 60 characters, with initials updated in the header and sidebar. Blank names restore the email-based fallback. Display names are scoped to the authenticated account and do not rewrite immutable receipt caller labels. Sign-in email editing is not implemented. Existing bearer-key API clients continue to work. Local loopback development without an admin key remains available.

Email-code login is implemented but stays unavailable until `RESEND_API_KEY`, `CALBOK_EMAIL_FROM` (a verified sender), and `CALBOK_OWNER_EMAIL` are set. `CALBOK_SESSION_SECRET` is an optional separate random 32+ character code-hashing secret; otherwise the strong admin key is used. Codes expire in 10 minutes, permit five attempts, and work once. Only HMAC code digests and session-token hashes are stored. Email requests have durable per-address and global hourly budgets. No code is printed to logs or returned to the browser. Delivery is not live-verified while email is unconfigured.

`CALBOK_PUBLIC_SIGNIN_ENABLED=false` keeps email login owner-only. `CALBOK_USER_PROVIDER_ACCESS=false` blocks member provider actions and automatic member settlement; changing it may incur provider costs. Enabling either is a deliberate deployment setting, not something the sign-in UI does. New accounts get separate journals. Legacy records stay owned by `operator`; ownership is an additive immutable mapping, preserving original snapshots and hashes. Receipt reads, actions, memory ledgers and recall history resolve within the authenticated owner. Member memory namespaces include the account ID. Worker processing remains internal, with member eligibility gated by provider access.

JSON/CSV exports contain only the signed-in account's journal. Public receipt pages and account import are not implemented. A direct receipt link still requires access to the owning account. Database backups should include sessions, accounts and ownership tables; never share the database publicly.
