# CALBOK

Entry for the Tatum x Walrus Total Recall hackathon (Oct 20 – Nov 10, 2026) · Markets & Sports Prediction track · Also entering Best Walrus Memory.

**The internet makes calls. CALBOK remembers receipts.**

[Live app](https://calbok.xyz/) · [Demo video](https://youtu.be/81beRv0EwWg) · [Demo on X](https://x.com/calbokdotxyz/status/2119059904140829157) · [Blog post](https://x.com/0xileri/status/2118721459472207930) · [Blog (source)](docs/blog.md) · [Repository](https://github.com/0xileri/CALBOK)

CALBOK is a prediction accountability app. You lock a market call before the outcome is known, CALBOK settles it against real price candles when the window closes, writes the verified result to Walrus Mainnet memory, and recalls that history the next time the same caller makes the same kind of call. If a caller's matching record is poor, the new call gets a caution.

## Hackathon requirements

Live counts read from the app on 6 November 2026 at 13:34 UTC.

| Requirement | Status | Proof |
| --- | --- | --- |
| Walrus Memory writing on Mainnet | Done | Verified results are queued and written through MemWal automatically (`lib/automatic-memory.ts`). Cited blob IDs in the [caution proof](docs/proof/caution-loop-2026-11.md); survives restart per the [restart recall proof](docs/proof/restart-recall-2026-11.md) |
| At least 10 memories on Mainnet | Done: **41** | 41 memory jobs done with a blob ID and a `mainnet` completion record. The [public feed](https://calbok.xyz/feed) counts 32 of them on public calls |
| Tatum RPC/Data APIs (OHLCV plus Sui gRPC) | Done | **OHLCV:** primary price source; 5 settlements so far, e.g. public call [`CB-b09e0a56…`](https://calbok.xyz/call/CB-b09e0a56-915e-4938-928f-7565c63aed8c). **Sui gRPC:** `GetCoinInfo` verified 3 times, latest 6 Nov 11:58:56 UTC ([Sui RPC proof](docs/proof/tatum-sui-rpc-2026-11.md)) |
| Published blog | Done | [Published on X](https://x.com/0xileri/status/2118721459472207930); source in [docs/blog.md](docs/blog.md) |
| Working demo | Done | [calbok.xyz](https://calbok.xyz/) is live; public email sign-in is on |
| Public repo | Done | [0xileri/CALBOK](https://github.com/0xileri/CALBOK) is public |
| 2–3 min video | Done (1:54) | [YouTube](https://youtu.be/81beRv0EwWg) · [on X](https://x.com/calbokdotxyz/status/2119059904140829157). Real recordings of calbok.xyz with voiceover and captions |

## How it works

**Lock → Settle → Remember → Recall**

1. **Lock.** A logger picks the caller, an exact asset, Bullish or Bearish, and a window (15m, 1h, 4h, 24h or 7d). The server stamps the lock time and deadline and stores an immutable SHA-256 snapshot of the terms. Nothing exists until the logger confirms.
2. **Settle.** After the deadline, the worker waits for the exit candle to finalize, then compares the open of the first one-minute candle at or after the lock with the open of the first one at or after the deadline (`directional-open-v1`). The price moving in the called direction is a win, against it a loss, and no change is neutral. Missing or ineligible data stays unresolved; nothing is invented.
3. **Remember.** Each verified result is queued for Walrus Mainnet memory automatically. A memory only counts once its job is done and has a blob ID.
4. **Recall.** When a new call is locked, CALBOK recalls memories for the same caller, asset, direction and window and resolves every citation against the SQL receipts. A caution appears when there are at least five matching completed wins/losses and the win rate is below 40%.

## Tatum and Walrus

| Integration | What CALBOK uses it for | Code | Evidence |
| --- | --- | --- | --- |
| **Tatum OHLCV** | Primary source of one-minute price candles for settlement, across the 439 symbols in Tatum's OHLCV catalog | `lib/providers.ts` | [provider verification](docs/evidence/provider-verification.json) |
| **Tatum Sui gRPC** | `sui.rpc.v2.StateService/GetCoinInfo` over Tatum's Sui Mainnet gateway, run from Admin → **Check Sui identity** | `lib/providers.ts` | [Sui RPC proof](docs/proof/tatum-sui-rpc-2026-11.md) |
| **Walrus Memory (MemWal)** | Mainnet memory of verified outcomes, and recall with SQL-checked citations | `lib/automatic-memory.ts`, `lib/receipt-recall.ts` | [live run](docs/proof/caution-loop-2026-11.md), [restart recall](docs/proof/restart-recall-2026-11.md) |

**Price source order.** Tatum is always asked first. It gets five minutes after the boundary minute to publish a valid candle, and the worker rechecks every minute in that window. Coinbase USD, then Binance USDT, are backups used only when Tatum answers with a stale or different minute, returns 404, or is still lagging, down or malformed after five minutes. Entry and exit always come from the same source, and the call page labels a backup as `Coinbase (backup: Tatum candle unavailable)`. GMGN covers onchain tokens selected by chain and contract.

Between 04:33 and 06:24 UTC on 5 November, every Tatum OHLCV request for BTC returned the same candle from 29 October 14:29 UTC, so those settlements used the Coinbase backup. Tatum is primary again as of 6 November: it settled `CB-a902df65…`, `CB-32c11e6e…`, `CB-31a245b9…` and `CB-3a5ab0eb…` between 12:18 and 12:58 UTC, and commit `de0db2a` (deployed 13:00 UTC) gives it a five-minute window before any backup. No call had settled since that deploy at the 13:34 UTC check. Across all 44 settlements: Coinbase 28, Binance 10, Tatum 5, GMGN 1. Sui metadata proves coin identity, not historical prices.

## How CALBOK learned over time

One real group: **@CryptoKaleo, BTC, bearish, 15m**. These earlier calls settled and were written to Walrus Mainnet:

| # | Earlier call | Result | Walrus blob ID |
| --- | --- | --- | --- |
| 1 | `CB-afeb1880-4caa-4a86-b2a0-39f2d7aa1b0d` | lost | `nNqALC2eg55hQId_kc158Z3bzLYBDmGcM7YGkyHsEiE` |
| 2 | `CB-1d6e5327-66d9-400f-b044-aa6dd872d100` | won | `VCMDRpE-tUV319QKNEcTnkXqjpqXS7KfCPs5JlNsr3c` |
| 3 | `CB-228318f7-fa45-41ba-bfbe-7b2c3fa3d865` | lost | `y9pmW4KMs7dpQSynfdTr84OVyPVQL_pIROfE9Cp_45Y` |
| 4 | `CB-e192f7b0-3296-4a84-9c07-edd92367b049` | won | `qAuSHVS5TFxY87uTJcezclK1bWKBoE5DRUHhNAPZ0TU` |
| 5 | `CB-7459b00d-eafc-46a1-ac5e-b91672f26d24` | won | `XXRJPBo2JplvG_Q8Ohzw7VV4FG926RZMEPCOCVuQH0Q` |
| 6 | `CB-be4c9da4-cb7e-476b-82b8-890a353b6e90` | lost | `LaxyYbn5gHFM5GQVdlvk4SoEjC6AeqKkIlAOa4b-Kc8` |
| 7 | `CB-a902df65-e64f-4452-b378-c129fcf32c42` | lost | `SCGWdKEiK4brBRukbAZourl_GSPrUchCkRm97q3QuYs` |
| 8 | `CB-32c11e6e-fce7-4d23-b846-d0d7c61e6b28` | lost | `91EYfkeIoYWpGy95UteeAxrSmUSKwYCr6bl6PLDPv-A` |

As each memory landed, recall on the next call in the group cited it, and the matching record moved from 60% (5 calls) to 50%, 42.9% and then **37.5%** (3 won, 5 lost).

The later call `CB-31a245b9-ce4b-4164-be2d-9008e60e49b4` locked at 12:37:46 UTC on 6 November (13:37:46 Lagos). 2.6 seconds later its recall cited all 8 memories above. Each was completed before the lock and re-checked against SQL. The record was under 40% with at least 5 calls, so the call got the warning:

> **Caution: matching calls have a low win rate.**
> 37.5% won across 8 matching calls. Open Proof details to inspect the cited results.

The repeat series that created it stopped itself (`CAUTION_TRIGGERED`). A second call, `CB-3a5ab0eb…`, got the same warning at 12:41:37 UTC. Full timeline, job IDs and checks: [caution proof](docs/proof/caution-loop-2026-11.md). Of the 8 cited calls, only the first is an original logged call; the other seven are owner-scheduled repeats of the same terms. All calls in this group are private.

The later call's terms were identical to the earlier ones; only the memory had changed, and memory changes what the product shows.

## For judges

Open [calbok.xyz](https://calbok.xyz/). Viewers need no account. Public email sign-in is **on**: any email can sign in with a one-time code, never a password (checked live on 6 November). Member provider access is on (`CALBOK_USER_PROVIDER_ACCESS=true`), so your own calls are settled, remembered on Walrus and recalled automatically, within member limits of 20 locks per UTC hour and 10 memory attempts per UTC day.

Admin is owner-only, so the public proof is in these files: [caution warnings and learning loop](docs/proof/caution-loop-2026-11.md), [recall after restart](docs/proof/restart-recall-2026-11.md) and [Tatum Sui gRPC read](docs/proof/tatum-sui-rpc-2026-11.md). For a public Tatum-settled call, open [`CB-b09e0a56…`](https://calbok.xyz/call/CB-b09e0a56-915e-4938-928f-7565c63aed8c).

| Page | What to do |
| --- | --- |
| [Home](https://calbok.xyz/) | See real public calls in moving rows, then log a call. An empty feed shows “No public calls yet. Be the first.” |
| [Feed](https://calbok.xyz/feed) | Filter public calls by caller, asset, window and result. Open any card to see its call page. |
| Call: `/call/<id>` | See the caller, asset, direction, window, lock time and checked result. Expand **Proof details** for the price source, record and price fingerprints, and the confirmed Walrus blob ID. |
| Caller: `/caller/<handle>` | See that named caller's public win rate, call count and recent calls. The caller is separate from the user who logged the call. |
| [Log a call](https://calbok.xyz/log) | Choose caller, exact asset, Bullish/Bearish, window, optional source and post text, and Public or Private. Review, confirm, then land on the locked call. |
| [My calls](https://calbok.xyz/my-calls) | Follow your own open calls and results, refreshed every 30 seconds. A qualifying caution appears beside the matching call. |
| [Sign in](https://calbok.xyz/signin) | Enter one email, then the one-time code. Each new account starts empty. |
| Account | Set a unique public username before publishing, change your display name and sign out other sessions. Your email never appears on public calls. |
| [Admin](https://calbok.xyz/admin) | Owner only: integration proof counts, settlement monitor, memory jobs, automatic memory, repeat series, provider checks and abuse moderation. |

A quick first run: sign in, open **Log a call**, choose real prediction terms and a **15m** window, then review and confirm. Shortly after the window closes, the result is checked and a verified result is remembered on Walrus. A later matching call recalls it.

Calls are **Private** by default. Publishing needs a public username and an explicit confirmation, and cannot be undone. Deployment never publishes existing calls. Public views leave out emails, original post text, notes, account and job IDs, raw memory text and credentials.

## Status

Live at [calbok.xyz](https://calbok.xyz/) (alias [calbok.up.railway.app](https://calbok.up.railway.app/)). On 6 November 2026 at 13:34 UTC the app reported:

| Locked | Settled | Mainnet memories | Recalls | Caution warnings |
| --- | --- | --- | --- | --- |
| 44 | 44 | 41 | 12 | 2 |

Recall after a Railway restart and a fresh Tatum Sui read are recorded in [restart recall proof](docs/proof/restart-recall-2026-11.md) and [Sui RPC proof](docs/proof/tatum-sui-rpc-2026-11.md). Still open: the final submission. See the [submission checklist](docs/submission-checklist.md).

## Run locally

Requires **Node.js 24.19+** (for built-in `node:sqlite`) and npm. SQLite is experimental in Node 24, so expect a runtime warning.

macOS / Linux:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Windows PowerShell:

```powershell
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run dev
```

Set a random `CALBOK_ADMIN_TOKEN` in `.env.local`, open [CALBOK](http://127.0.0.1:3000), then open **/admin** for owner-key access. Logging calls works without provider keys. Keep secrets in `.env.local` only.

1. Open **Log a call**. Search the Tatum catalog, or use GMGN to pick a token by chain and contract. Caller, asset, direction and window have no silent defaults. **Verify historical pricing sample** checks that the asset has eligible candles.
2. Review the terms and confirm. This locks the server timestamp, deadline and snapshot hash. Review alone creates nothing.
3. Open the call to see its ID, UTC timestamps, source link and, once settled, the entry/exit candles and price change. **Download PNG** and **Copy summary** export it locally.
4. With the worker on (`CALBOK_WORKER_ENABLED=true`), results are checked, remembered and recalled automatically. Without it, use **Manage this call → Check result**, **Remember result** and **Check past calls**. Missing credentials or coverage stay explicit errors.

## Configure integrations

Set `TATUM_API_KEY`, `MEMWAL_PRIVATE_KEY` and `MEMWAL_ACCOUNT_ID` in `.env.local`. Add `GMGN_API_KEY` for onchain token search. `MEMWAL_ACCOUNT_ID` is the account object, not the delegate's public agent ID. `MEMWAL_SERVER_URL` optionally selects a trusted relayer. Set `MEMWAL_NETWORK=mainnet` only after confirming the account and relayer target Mainnet; the flag is an operator attestation, not network proof.

```bash
npm run providers:verify
```

On Windows PowerShell, use `npm.cmd` in place of `npm` here and below.

This makes paid-credit Tatum reads only when a key is present (SUI metadata over gRPC and an hour-old BTC candle) and checks authenticated Walrus recall in a separate connection-check namespace, without writing memories. Results are saved without credentials to `docs/evidence/provider-verification.json`. Without a Tatum key it exits nonzero and names the blocker.

To see whether Tatum's candles are current, ask for a minute from ten minutes ago and compare the `openTime` it prints.

macOS / Linux:

```bash
npx tsx scripts/probe-tatum.ts $(( ($(date +%s) - 600) * 1000 ))
```

Windows PowerShell:

```powershell
npx.cmd tsx scripts/probe-tatum.ts ([DateTimeOffset]::UtcNow.AddMinutes(-10).ToUnixTimeMilliseconds())
```

## Checks

macOS / Linux:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Windows PowerShell:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

CI runs the same four steps on every push to `main` and every pull request. `npm run build` creates a Node server build; `npm start` serves it on loopback. Keep the SQLite file (`data/calbok.sqlite` by default) on persistent disk and back up its WAL consistently; serverless ephemeral disks are unsuitable. The Railway deployment uses Node 24, one replica, a persistent SQLite volume at `/data`, a health check and GitHub `main` deployments. See [Railway operations](docs/railway.md).

## Design boundaries

- Each account owns its own calls, and every API is scoped to the signed-in account. Email verification authenticates an account, not the caller labels on calls. Public sign-up and member provider access are off by default and are explicit deployment settings.
- Only prospective directional calls are supported. Target prices, retrospective imports, disputes, X API verification and automatic extraction are not implemented.
- Structured fields are the scoring contract. Post text is stored as untrusted data and is never executed or interpreted by an LLM.
- A catalog listing is **not a promise of historical coverage**. Entry and exit timestamps are checked again at settlement.
- The Tatum parser requires millisecond `openTime`/`closeTime` and OHLC fields. Tatum's one-minute close is inclusive (`open + 59,999ms`); only exact 59,999ms or 60,000ms intervals are normalized, and the original close and raw-response hash are kept. Other durations are rejected.
- The settlement worker uses a durable SQLite queue with leases, bounded batches, exponential retries and visible paused jobs, so provider failures never double-settle a call. See [worker operations](docs/railway.md#settlement-worker).
- Automatic memory is on by default and can be turned off in Admin. A Walrus timeout keeps the accepted job for status polling, and uncertain acceptance is never resubmitted automatically, to avoid duplicate paid writes.
- Recall is semantically filtered, SQL-resolved and category-matched. It is neither a full history listing nor arithmetic authority. Minimum caution sample: 5.
- Member limits: 20 locks per UTC hour and 10 memory submission attempts per UTC day. Sign-in attempts share a per-IP limit of 30 per 15 minutes.

## Coin discovery and provider choice

The catalog holds all 439 symbols from Tatum's OHLCV schema. Refresh it with `npm run assets:sync`, which reads only the symbol list from Tatum's documentation and makes no paid query per symbol.

GMGN is a query-only, server-side integration. Search by name, symbol or contract, then confirm the exact chain and address, since symbols alone are not unique. A GMGN token gets a canonical `gmgn:chain:address` ID that is locked into the call snapshot, and it never falls back to another provider. No GMGN signing key, wallet or trading endpoint is used.

```bash
npm run gmgn:verify
npm run gmgn:verify -- gmgn:base:0xacfe6019ed1a7dc6f7b508c02d1b04ec88cc21bf
```

The first checks GMGN without writing calls or memories; the second also saves public candle evidence for the Base VVV contract. See [coin coverage and provider comparison](docs/coin-coverage.md). Dune was evaluated but not integrated: its interpolated minute prices do not meet the candle-open scoring contract.

## Accounts and sign-in

Email-code login needs `RESEND_API_KEY`, `CALBOK_EMAIL_FROM` (a verified sender) and `CALBOK_OWNER_EMAIL`. Codes expire in 10 minutes, allow five attempts and work once. Only HMAC code digests and session-token hashes are stored, and no code is logged or returned to the browser. `CALBOK_SESSION_SECRET` is an optional separate 32+ character secret for code hashing; otherwise the admin key is used.

The owner can also open `/admin` and enter the admin key under **Owner access**. Sessions last seven days in an HttpOnly, SameSite=Lax cookie (Secure over HTTPS). The Account page shows active sessions and can sign out the others. Existing bearer-key API clients keep working.

`CALBOK_PUBLIC_SIGNIN_ENABLED=false` keeps email login owner-only. `CALBOK_USER_PROVIDER_ACCESS=false` blocks member provider actions and automatic member settlement; enabling it can incur provider costs. Older records stay owned by `operator` through an additive ownership mapping that leaves original snapshots and hashes untouched.

Custom domains must be listed explicitly: `CALBOK_PUBLIC_ORIGIN=https://calbok.xyz` and `CALBOK_ADDITIONAL_ORIGINS=https://calbok.up.railway.app`, with no paths, trailing slashes or wildcards. Protected requests from unlisted origins are refused. Cookies are host-only, so each domain needs its own sign-in.

## Public feed and caller records

[Live calls](https://calbok.xyz/feed) needs no sign-in. `/caller/<handle>` describes the named caller, not the user who logged the call, and counts only public, visible, reproducibly settled calls; neutral results never inflate the win rate. Every card is labelled as self-logged before the outcome. Neither a caller label nor a logger username verifies authorship.

The homepage shows the first 24 public calls and refreshes `GET /api/public-feed?limit=24` every 45 seconds (cached for 45 seconds). It pauses on hover, focus or touch, has a Play/Pause control and stays still for reduced-motion preferences. Public source links accept HTTP/HTTPS only, drop credentials and sensitive query values, and open with `noopener noreferrer nofollow`. No sample cards or invented outcomes fill empty space.

Usernames are 3–30 letters, numbers or underscores, unique regardless of case, and required for publishing. The owner can hide a published call for abuse from Admin or the call page. Hiding keeps the immutable terms, settlement and memory, writes an audit event, and cannot be bypassed by republishing. `/proof` now redirects to the feed, and old receipt-fragment links open the new call page.

## Not in the current UI

The simplified app no longer links the private call inbox (text and screenshot capture with local OCR), saved drafts, JSON/CSV journal export, the caller directory with performance filters, or the weekly review. Their components and APIs are still in the repository but no page renders them.

## More documentation

[Architecture](docs/architecture.md) · [Brand guide](https://calbok.xyz/brand/index.html) · [Scoring contract](docs/scoring.md) · [Railway operations](docs/railway.md) · [Coin coverage](docs/coin-coverage.md) · [Demo runbook](docs/demo-runbook.md) · [Submission checklist](docs/submission-checklist.md)

Official references: [Tatum OHLCV](https://docs.tatum.io/reference/getsymbolohlcv), [Tatum Sui RPC](https://docs.tatum.io/reference/rpc-sui), [Walrus SDK usage](https://docs.wal.app/walrus-memory/sdk/usage/memwal), [Walrus SDK API](https://docs.wal.app/walrus-memory/sdk/api-reference).
