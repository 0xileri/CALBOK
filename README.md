# CALBOK

**The internet makes calls. CALBOK remembers receipts.**

[GitHub repository](https://github.com/0xileri/CALBOK)

A local prediction accountability app: lock prospective market calls, inspect immutable receipts, settle against eligible pricing, and recall prior outcomes as context for later calls.

## Status

This is a working **local foundation** with live provider checks, not a hackathon-ready release. The repository started empty on 24 October 2026. There are **zero verified Mainnet memory writes** and no fabricated prices, callers, or scores in the app.

Implemented: responsive overview, call capture/detail, caller profiles, memory ledger, integration settings; SQLite persistence; SHA-256 snapshots; duplicate prevention; decimal directional settlement; server-side provider adapters; operator guard; bounded requests; contextual warning policy; automated tests.

Provider verification update (24 October 2026): Tatum Sui Mainnet gRPC coin metadata, one timestamp-validated historical BTC candle, and Walrus authenticated recall now pass with locally configured credentials. See `docs/evidence/provider-verification.json`. Completed Walrus writes and memory changing a real new-call warning remain release blockers. ETH/SUI pricing coverage has not been verified.

## Run locally

Requires **Node.js 24.19+** (uses built-in `node:sqlite`) and npm. SQLite is experimental in Node 24; expect its runtime warning.

```powershell
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run dev
```

Open [CALBOK](http://127.0.0.1:3000). No account or provider key is needed to lock a local prospective call. Store secrets only in `.env.local`; never paste them into a receipt.

1. Log a caller, original text, asset, direction, and horizon.
2. Submit to lock a timestamped structured contract and snapshot hash.
3. Open the receipt to inspect its ID, UTC timestamps and source link.
4. After the deadline, use **Check settlement**. Missing credentials/coverage remain explicit errors; no result is invented.
5. Once settled, use **Remember outcome**, then **Check context**. Only a completed job with a blob ID counts as a memory.

## Configure integrations

Set `TATUM_API_KEY`, `MEMWAL_PRIVATE_KEY`, and `MEMWAL_ACCOUNT_ID`. `MEMWAL_ACCOUNT_ID` is the account object, not the delegate's public agent ID. An optional `MEMWAL_SERVER_URL` selects a trusted relayer. Set `MEMWAL_NETWORK=mainnet` only after verifying that account/relayer configuration actually targets Mainnet; this flag is an operator attestation, not network proof.

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

`npm run build` creates a deployable Node server build; `npm start` serves it on loopback. Keep the SQLite file (`data/calbok.sqlite` by default) on persistent disk and back up its WAL consistently. Serverless ephemeral disks are unsuitable. For public/multi-user hosting, implement tenant authentication/authorization, production rate limiting, versioned migrations, a durable worker, and a PostgreSQL migration before deployment. No public deployment is included.

## Design boundaries

- Single-operator private journal; caller names are labels, not authenticated public identities. No public reputation rankings.
- Only directional 24-hour/7-day prospective calls; target calls, retrospective imports, disputes, X API verification, and automatic extraction are not implemented.
- BTC/ETH/SUI are candidate assets, **not a promise of validated price coverage**. Receipt capture is allowed while provider proof is pending. Production acceptance must gate assets against verified mappings.
- Structured fields are the scoring contract; prose is preserved as untrusted data and is never executed or interpreted by an LLM. The author must resolve contradictory prose before submitting.
- The Tatum price parser requires explicit millisecond `openTime`/`closeTime` and OHLC fields. Live verification confirmed a 59,999ms inclusive close for 1-minute data. The adapter normalizes only exact 59,999ms/60,000ms intervals to an exclusive close and preserves `sourceCloseTime` and the raw-response hash. Other durations are rejected.
- Settlement and memory processing are manual operator actions. No unattended scheduler, retry worker, or production circuit breaker yet.
- A Walrus timeout retains the accepted job for later status polling. Uncertain acceptance is blocked from automatic resubmission to avoid duplicate paid writes. Provider reconciliation is required.
- Memory recall is semantically filtered, SQL-resolved and category-matched; it is neither complete history enumeration nor arithmetic authority. Minimum caution sample: 5.
- Sui metadata proves coin identity, not historical USD pricing.
- Fonts optionally load from Google Fonts; system fonts work offline.

See [architecture](docs/architecture.md), [scoring](docs/scoring.md), and [actual submission checklist](docs/submission-checklist.md).

## Official integration references

[Tatum OHLCV](https://docs.tatum.io/reference/getsymbolohlcv), [Tatum Sui RPC](https://docs.tatum.io/reference/rpc-sui), [Walrus SDK usage](https://docs.wal.app/walrus-memory/sdk/usage/memwal), [Walrus SDK API](https://docs.wal.app/walrus-memory/sdk/api-reference). Documentation checked 24 October 2026; live provider validation remains pending.
