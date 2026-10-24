# Architecture and trust boundaries

Browser → Next.js route handlers → validated domain functions → SQLite.

Next.js 16, React 19, TypeScript, plain responsive CSS, Lucide icons. The server uses Zod at input/provider boundaries and decimal.js for price arithmetic. SQLite is the relational source of truth for this local release. It is an intentional portable alternative to the suggested PostgreSQL architecture, not evidence that PostgreSQL has been integrated.

`lib/db.ts` initializes an idempotent first schema, captures original and canonical snapshots, freezes updates, and transactionally inserts audit records. Prediction IDs are UUID-backed; snapshot hashes are SHA-256. Settlement identity and memory-job identity are unique per prediction. Current schema initialization is not a versioned migration system; that is required before schema evolution.

`lib/domain.ts` contains deterministic candle eligibility, directional scoring, score denominators and warning priority. It has no network access or LLM. Supplied prose cannot issue tool calls.

`lib/providers.ts` is server-only by import graph. Tatum calls use `x-api-key`, fixed trusted destinations, request timeouts and payload validation. Supplied source URLs are stored/displayed only, never fetched by the server. Sui uses native TLS gRPC with the official Sui SDK and `StateService/GetCoinInfo`; the retired JSON-RPC endpoint returned 404. Native transport closes after each bounded read. Protobuf BigInt values serialize as strings for response hashing. This gRPC path passed a live read on 24 October 2026.

Memory namespaces are deterministic hashes of exact caller labels, scoped to the single operator. These are organizational boundaries, not tenant access control. Account/delegate credentials never enter browser responses. Recall IDs must resolve to SQL settlements with matching caller/asset/horizon/direction. Actual outcome counts come from SQL, not memory text.

Memory state flow: reserve queued → accepted job ID/running → confirmed completion plus blob ID/done. Pending completion can be polled again; uncertain acceptance cannot be resubmitted automatically. Errors never increment completed-write counts. A crash after provider acceptance but before saving the job ID requires provider reconciliation; exactly-once external effects cannot be guaranteed by SQLite alone.

All API routes require an operator bearer token when configured. Without a token, host allowlisting restricts routes to loopback hostnames. Cross-origin browser requests are refused. Requests are limited to 8 KiB, with a single-process 20-action/minute operator budget. This is a local convenience guard, not public multi-tenant security.

Missing production work: verified asset registry; normalized caller/source/asset entities; versioned migrations; immutable correction/supersession workflow; durable job worker with bounded retries; multi-process rate limiting; tenant identity; operational telemetry; persisted recall bundles and provider raw-response archives; live integration proof. Current provider errors are redacted generic codes.

Coin-coverage update: `assets` stores discovered GMGN identities and `asset_checks` records historical sample evidence. `lib/catalog/tatum-symbols.json` is the sourced 439-symbol catalog. `lib/gmgn.ts` implements only fixed read routes; no signing/trading client is included. The picker uses live query results plus explicit chain/address selection; all three scoring fields start unselected. Some Mainnet provider proof is now available; a completed memory loop remains pending. See coin-coverage.md for actual evidence and limitations.
