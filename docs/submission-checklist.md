# Actual readiness — 4 November 2026

Public email sign-in is enabled (confirmed through production /api/auth). Earlier baseline: **32 settled, 32 Mainnet memories, recall 1, caution pending**. The 4 November production recheck now shows **34 locks, 33 settled, 32 Mainnet memories, recall 1, caution 0**. These are private-workspace observations, not a promise of current public counts. [Public proof](https://calbok.xyz/proof) now counts only explicitly published, visible owner receipts. Existing calls default to private and are not automatically published. Missing proof is not a provider failure.

## Next action for the owner

**Demonstrate a later same-group call recalling completed memories and, when five verified wins/losses produce a win rate below 40%, a genuine caution.** Also verify restart/recall and record the demo.

| Requirement | Status / proof |
| --- | --- |
| Capture and journal | Implemented: text/screenshot capture, browser-local English OCR, image paste/drop, duplicate warnings, private reviews, full-history pagination and filtered CSV |
| Caller profiles | Implemented: captured/reviewed counts and captured history alongside separately verified performance |
| Immutable prospective SQL capture | Implemented and tested; first genuine live receipt locked |
| Deterministic directional settlement | Reproducibility tested; historical provider samples checked previously. First genuine live lock → deadline → settlement verified |
| Relevant Tatum Sui Mainnet read | Prior real gRPC GetCoinInfo proof recorded in evidence document. Integration proof screen counts only validated metadata actually stored in this workspace |
| Walrus Mainnet remember → done → recall | 32 confirmed Mainnet completions and 1 SQL-cited recall; live caution pending |
| 10 completed Mainnet memories | **32 / 10 confirmed** at the dated check. Accepted/running jobs do not count |
| Replayable adaptation | Policy tested; live demonstration pending. At least five relevant memories must have completed before a later target call was locked for caution proof |
| Integration proof screen | Implemented: read-only owner-scoped progress plus public /proof with allowlisted stage counts and settlement fields, job/blob completion evidence, persisted SQL-linked recall, side-by-side comparison, JSON export, next action and explicit manual requirements. No provider calls are triggered by viewing it |
| Durable worker | Leases, retries, heartbeat and bounded settlement batches implemented/tested. Owner opt-in enables up to ten automatic Mainnet write attempts |
| Deployment and access | Primary workspace at https://calbok.xyz via `CALBOK_PUBLIC_ORIGIN`, with https://calbok.up.railway.app in `CALBOK_ADDITIONAL_ORIGINS`. Private journal APIs, persistent volume, GitHub deployments, email sessions and account controls. Public email sign-in enabled; member provider access requires CALBOK_USER_PROVIDER_ACCESS=true, with 20 locks/hour and 10 writes/UTC day per member |
| Public homepage / branding | Implemented with workflow, privacy limits, brand kit and sign-in |
| Public repository and blog | Source on private 0xileri/CALBOK; public visibility and published blog not verified |
| Demo video | Pending; script outline in demo-script.md |
| Restart/recall demonstration | Pending; persisted records alone do not prove a recall performed after restart |
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
