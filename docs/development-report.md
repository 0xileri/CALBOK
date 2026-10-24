# Initial implementation — 24 October 2026

## Files and behavior

- `app/page.tsx`, `app/globals.css`, `app/layout.tsx`: responsive five-screen workspace, live SQL counts, empty/error states, capture/detail dialogs, keyboard focus containment, memory ledger and operator configuration.
- `app/api/workspace/route.ts`: validated prospective capture and private workspace reads.
- `app/api/actions/route.ts`: manual deterministic settlement, relevant Sui identity read, confirmed-memory tracking, SQL-grounded contextual recall.
- `lib/domain.ts`: claim schema, timestamp boundary eligibility, decimal settlement, score denominators and contextual policy.
- `lib/db.ts`: SQLite schema, immutable snapshot updates, unique fingerprints, audit insertion, settlement and memory records.
- `lib/providers.ts`, `lib/http.ts`: fixed provider destinations, typed validation, timeouts, server-side secrets, local/operator guards, request budget and body limit.
- `tests/`: domain, persistence, API flow and access tests. Synthetic data exists only in isolated temporary test databases, removed after checks. No synthetic records are seeded into the normal workspace.
- Environment template, pinned dependencies/lockfile, Next/TypeScript/ESLint configuration and setup/architecture/scoring/evidence/demo/readiness documentation.

## Verification

- 13 automated tests pass, including API capture → SQL read → pending settlement and missing-provider failure.
- Independent SQLite connection confirms captured data persists; snapshot hashes, duplicate prevention and update immutability are tested.
- TypeScript, ESLint and optimized Next.js production build checked during implementation.
- Local in-app browser: desktop dashboard and capture form inspected; mobile layout checked at 390×844 without horizontal overflow. Browser submission itself is not claimed as a completed end-to-end integration test; capture is exercised through the real route handlers in isolated SQL tests.
- Provider verification script runs and intentionally exits 1 with `TATUM_NOT_CONFIGURED`/configuration blocker. No external provider success is claimed.

## Open blockers and risks

No credentials, no real pricing proof, no Sui response, no completed Mainnet memory writes, no live adaptation evidence. Exact Tatum response shape/timestamp convention must be validated. Public tenant auth, full normalized schema/migrations, asset coverage gating, automatic durable workers and corrections remain future work. No public repo, deployment, published blog, video or official submission has been created.
