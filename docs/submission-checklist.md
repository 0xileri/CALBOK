# Actual readiness

As of 24 October 2026 this is a deployed single-operator workspace, not a final submission.

| Requirement | Status / proof |
| --- | --- |
| Local app and immutable SQL capture | Implemented; automated checks and local UI verification recorded in development report |
| Deterministic directional settlement | Unit-tested; BTC and VVV historical samples verified. A genuine locked call still needs to reach its deadline for a full live settlement |
| Tatum historical market data | One BTC historical 1m candle validated; see provider-verification.json. Other markets pending |
| Meaningful Sui Mainnet read | PASS: gRPC GetCoinInfo with real coin metadata object; see evidence document |
| Walrus Mainnet remember → done → recall | Authenticated recall PASS; completed writes and write/recall round trip pending |
| 10 completed Mainnet memories | 0; blocked |
| Replayable adaptation from genuine evidence | Deterministic policy tested; live demonstration pending |
| Durable unattended worker | Not implemented; manual operator actions only |
| Hosted single-operator deployment | Railway live at https://calbok.up.railway.app/; protected journal APIs, persistent volume, health check, GitHub deployments. Multi-user tenant access remains unimplemented |
| Published blog / public repository | Initial source shipped to private 0xileri/CALBOK; public visibility and blog remain pending |
| 2–3 minute demo video | Pending; script outline present |
| Official rules, eligibility and deadline audit | Pending verification against organizers before submission |
| Final submission form and private entrant fields | Pending; never commit personal details |

The attached brief cites 10 November 2026 at 17:00 UTC (18:00 Lagos) as deadline. This date is **provided by the brief**, not independently verified by this build. Verify current official rules at [Tatum](https://tatum.io/hackathon/total-recall) and the organizer portal before relying on it.
