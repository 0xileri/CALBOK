# Submission checklist: 6 November 2026

Entry for the Tatum x Walrus Total Recall hackathon (Oct 20 – Nov 10, 2026), Markets & Sports Prediction track, also entering Best Walrus Memory.

Live counts read on **6 November 2026 at 13:34 UTC** from the owner APIs `GET /api/integration-proof`, `GET /api/workspace` and `GET /api/repeat-series`, plus the public `GET /api/public-feed` and `GET /api/auth`:

| Locked | Settled | Mainnet memories | Recalls | Caution warnings | Public calls |
| --- | --- | --- | --- | --- | --- |
| 44 | 44 | 41 | 12 | 2 | 34 |

## Hackathon requirements

| Requirement | Status | Proof |
| --- | --- | --- |
| Walrus Memory writing on Mainnet | Done | 41 memory jobs done, each with a distinct blob ID and a `mainnet` completion record. Cited blobs and job IDs in the [caution proof](proof/caution-loop-2026-11.md) |
| At least 10 memories on Mainnet | Done: **41 / 10** | Live count above. Accepted, running or uncertain jobs are not counted |
| Tatum RPC/Data APIs | Done | **OHLCV:** primary price source; 5 of 44 settlements used it, including public call [`CB-b09e0a56…`](https://calbok.xyz/call/CB-b09e0a56-915e-4938-928f-7565c63aed8c) and the four BTC 15m calls settled between 12:18 and 12:58 UTC on 6 November. **Sui gRPC:** `GetCoinInfo` verified 3 times, latest 11:58:56 UTC on 6 November ([Sui RPC proof](proof/tatum-sui-rpc-2026-11.md)) |
| Published blog | TODO | Publish-ready source in [blog.md](blog.md). Publish it and replace `TODO_BLOG_URL` in the README |
| Working demo | Done | [calbok.xyz](https://calbok.xyz/) is live (`/api/health` ok). Public email sign-in is on |
| Public repo | Done | [0xileri/CALBOK](https://github.com/0xileri/CALBOK) is public (confirmed 6 November) |
| 2–3 min video | TODO | Outline in [demo-script.md](demo-script.md). Record, upload and replace `TODO_VIDEO_URL` in the README |
| Memory-driven adaptation | Done | Two caution warnings on 6 November, each citing 8 matching Mainnet memories at 37.5% (3 won, 5 lost). The repeat series stopped itself with `CAUTION_TRIGGERED`. [Caution proof](proof/caution-loop-2026-11.md) |
| Recall survives restart | Done | Fresh recall before and after a Railway restart matched on all cited receipt, job and blob rows. [Restart proof](proof/restart-recall-2026-11.md) |

## Deployment settings

| Setting | Live state | Why it matters |
| --- | --- | --- |
| `CALBOK_PUBLIC_SIGNIN_ENABLED=true` | **On.** `GET /api/auth` reports `publicSignup: true` and email delivery configured | Judges can sign in with any email |
| `CALBOK_USER_PROVIDER_ACCESS=true` | **On**, confirmed by the owner on 6 November (no API exposes it) | A judge's own calls settle, are remembered and are recalled automatically. Member limits: 20 locks per UTC hour, 10 memory attempts per UTC day |
| Settlement worker | Running. Owner calls settled automatically, latest at 12:58:45 UTC | Calls settle without manual clicks |

## Submission form fields still needed

None of these are in the repository. Fill them in on the form; never commit secrets or entrant details.

| Field | Status | Where it comes from |
| --- | --- | --- |
| Tatum ID | TODO | Your Tatum account or user ID from the Tatum dashboard. Not the API key |
| SUI address | TODO | The public Sui address the form asks for. Never a private key |
| SUI account ID | TODO | If the form means the MemWal account, it is the public object ID set as `MEMWAL_ACCOUNT_ID` in Railway |
| `MEMWAL_AGENT_ID` | TODO | The delegate's public agent ID. Not `MEMWAL_ACCOUNT_ID`, and never `MEMWAL_PRIVATE_KEY` |
| Video link | TODO | After recording; also replaces `TODO_VIDEO_URL` |
| Repository link | Ready once public | https://github.com/0xileri/CALBOK |
| Blog link | TODO | After publishing; also replaces `TODO_BLOG_URL` |

## Next actions for the owner

1. Publish the blog and record the video, then replace both placeholders in the README.
2. Fill in the form fields above.
3. Optional: the caution group's 10 calls are all private, so judges can only check them through the proof doc. Publishing makes their call pages public, but it is one-way and shows the caller handle.

## Feature status

| Area | Status |
| --- | --- |
| Lock, settle, remember, recall | Live. 44 locked and settled; 41 remembered on Mainnet; 12 recalls stored with SQL citations |
| Price sources | Tatum first with a five-minute window (commit `de0db2a`, deployed 13:00 UTC on 6 November); Coinbase USD, then Binance USDT, as labelled backups; GMGN for onchain tokens. Across all 44 settlements: Coinbase 28, Binance 10, Tatum 5, GMGN 1. Between 04:33 and 06:24 UTC on 5 November, Tatum returned a 29 October BTC candle for every request, so those settlements used Coinbase |
| Public feed and caller pages | Live: 34 public calls, all settled, 32 with Walrus memories |
| Integration proof | Owner-only, under Admin. `/proof` redirects to the feed. The public proof is the files in `docs/proof/` |
| Durable worker | Leases, retries, heartbeat and bounded batches. Automatic memory is on by default and owner-controlled in Admin |
| Capture inbox, drafts, journal export | Code and APIs remain, but no page renders them in the current UI |

## Evidence rules

Integration proof only counts reproducible eligible SQL settlements and distinct done jobs/blobs with a matching Mainnet completion record captured at confirmation. Older jobs without this record remain unproven; configuration is not proof. The network record describes the configured Mainnet path, not an independently verified chain transaction. Recall proof excludes raw memory text and private notes, and rechecks citations against SQL. User reminders do not create calls, spend provider funds or write memories.

The original brief cites 10 November 2026 at 17:00 UTC (18:00 Lagos). This date is supplied by the brief and is not verified here, because the rules page at https://tatum.io/hackathon/total-recall was not reachable from the session that wrote this. Check the current rules and the organizer portal before relying on it.

## Public-call judging path

- Open [live calls](https://calbok.xyz/feed) without signing in; use caller, exact asset, horizon and outcome filters and pagination.
- Sign in by email, set a public username under Account, then explicitly choose Public at lock confirmation or Publish call on a private call. Public is one-way. No existing call is published by deployment.
- Open a named caller link to inspect only the verified public record and count by horizon. Logger usernames are separate from caller labels; neither verifies identity.
- Owner abuse hiding removes a call from the feed and caller stats while keeping the immutable record and an audit event.
- Public responses leave out emails, account and job IDs, post text, notes, inbox data, raw memories and credentials; only receipt IDs, proof hashes and confirmed blob IDs are public.
- Member limits: 20 locks per UTC hour, 10 memory submission attempts per UTC day. Per-IP sign-in limit: 30 attempts per 15 minutes.

## Simple judging interface

Use Home → Feed → Call → Caller without signing in. Use Sign in → Log a call → Confirm → Call → My calls for the logger journey. Proof details start collapsed. Owner diagnostics, proof counts, memory jobs, repeat series and settings are under Admin. The homepage ticker contains only real published calls and uses a 45-second cache, with pause/swipe and reduced-motion support.
