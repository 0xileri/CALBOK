# Actual readiness — 6 November 2026

Production owner proof reports **40 locks, 40 verified settlements, 38 confirmed Mainnet memories, six SQL-cited recalls and zero caution events at the initial 6 November check**. The recorded 15-minute run recalled five matching memories at a 60% win rate. Caution requires a rate below 40%. See [the live run evidence](proof/caution-loop-2026-11.md).

## Next action for the owner

Record the existing five-memory recall using [the demo script](demo-script.md). The follow-up series is gathering real results for the caution check. The fresh Sui read and post-restart recall are documented below.

| Requirement | Status / proof |
| --- | --- |
| Capture and journal | Implemented: text/screenshot capture, browser-local English OCR, image paste/drop, duplicate warnings, private reviews, full-history pagination and filtered CSV |
| Caller profiles | Implemented: captured/reviewed counts and captured history alongside separately verified performance |
| Immutable prospective SQL capture | Implemented and tested; first genuine live receipt locked |
| Deterministic directional settlement | Reproducibility tested; historical provider samples checked previously. First genuine live lock → deadline → settlement verified. Tatum OHLCV is the primary price source; Coinbase USD, then Binance USDT, back it up only when Tatum has no valid candle within 5 minutes of the boundary minute. Production logs on 5 November show Tatum returning the same 29 October 14:29 UTC BTC candle for every request, so the recorded settlements used the Coinbase backup. Confirm Tatum returns current candles before the demo |
| Relevant Tatum Sui Mainnet read | Fresh Tatum gRPC GetCoinInfo verified at 11:58:56 UTC on 6 November. [RPC evidence](proof/tatum-sui-rpc-2026-11.md) |
| Walrus Mainnet remember → done → recall | 38 confirmed Mainnet completions and six SQL-cited recalls |
| 10 completed Mainnet memories | **38 / 10 confirmed** at the dated check. Accepted/running jobs do not count |
| Replayable adaptation | Follow-up series active at the 12:16 UTC check on 6 November. The exact BTC bearish 15m group stood at 3 wins / 3 losses (50%). [Caution evidence](proof/caution-loop-2026-11.md) |
| Integration proof screen | Implemented: read-only owner-scoped progress plus public /proof with allowlisted stage counts and settlement fields, job/blob completion evidence, persisted SQL-linked recall, side-by-side comparison, JSON export, next action and explicit manual requirements. No provider calls are triggered by viewing it |
| Durable worker | Leases, retries, heartbeat and bounded settlement batches implemented/tested. Owner opt-in enables up to ten automatic Mainnet write attempts |
| Deployment and access | Primary workspace at https://calbok.xyz via `CALBOK_PUBLIC_ORIGIN`, with https://calbok.up.railway.app in `CALBOK_ADDITIONAL_ORIGINS`. Private journal APIs, persistent volume, GitHub deployments, email sessions and account controls. Public email sign-in enabled; member provider access requires CALBOK_USER_PROVIDER_ACCESS=true, with 20 locks/hour and 10 writes/UTC day per member |
| Public homepage / branding | Implemented with workflow, privacy limits, brand kit and sign-in |
| Public repository and blog | Source on private 0xileri/CALBOK; public visibility and published blog not verified |
| Demo video | Pending; script outline in demo-script.md |
| Restart/recall demonstration | Verified by fresh recall on both sides of a Railway restart. All five cited receipt/job/blob rows and both win rates matched. [Restart evidence](proof/restart-recall-2026-11.md) |
| Official rules and submission | Current rules, eligibility and submission completion still require verification. Do not commit entrant information |

## Evidence rules

Integration proof only counts reproducible eligible SQL settlements and distinct done jobs/blobs with a matching Mainnet completion record captured at confirmation. Older jobs without this record remain unproven; configuration is not proof. The network record describes the configured Mainnet path, not an independently verified chain transaction. Recall proof excludes raw memory text and private notes, and rechecks citations against SQL. User reminders do not create calls, spend provider funds or write memories.

The original brief cites 10 November 2026 at 17:00 UTC (18:00 Lagos). This date is supplied by the brief and remains unverified here. Check current official rules at https://tatum.io/hackathon/total-recall and the organizer portal before relying on it.

## Public-call judging path

- Open [live calls](https://calbok.xyz/feed) without signing in; use caller, exact asset, horizon and outcome filters and pagination. An empty feed means nobody has explicitly published yet.
- Sign in by email, set a public username under Account profile, then explicitly choose Public at lock confirmation or Publish call on a private receipt. Public is one-way. No existing receipt is published by deployment.
- Open a named caller link to inspect only the verified public record and count by horizon. Logger usernames are separate from caller labels; neither verifies identity.
- Verify owner abuse hiding removes a call from feed, caller stats and public proof while retaining the immutable record and audit event.
- Public DTO tests cover emails, account/job IDs, text, notes, inbox data, raw memories and credentials; only receipt IDs, requested proof hashes and confirmed blob IDs leave these views.
- Member limits: 20 locks/UTC hour, 10 memory submission attempts/UTC day. Per-IP sign-in limit: 30 attempts per 15-minute window. Operator budgets remain approval-based.

## Simple judging interface

Use Home → Feed → Call → Caller without signing in. Use Sign in → Log a call → Confirm → Call → My calls for the logger journey. Proof details start collapsed. Owner diagnostics, proof counts, memory jobs, repeat series and settings are under Admin; `/proof` is a compatibility redirect to Feed. The homepage ticker contains only real published calls and uses a 45-second cache, with pause/swipe and reduced-motion support. Existing private calls remain private; choose what to publish explicitly after setting a public username.
