# Coin discovery and historical coverage

## Delivered

- All **439 Tatum symbols** from the official `HistoricalPriceSymbol` enum, synced on 24 October 2026. This is an actual sourced catalog, not a hardcoded handpicked extension of BTC/ETH/SUI.
- Live GMGN token search, keyed by chain and exact contract address. Unsupported chain/address combinations are refused. The supported-chain list follows the official GMGN CLI read-route validation; runtime availability is provider-dependent and only VVV/Base was verified in this update.
- No default coin, direction, or horizon in the capture form. A screenshot cannot silently become a different prediction.
- Per-asset historical sample verification. Evidence is stored in SQLite `asset_checks`; sample verification is not a guarantee of future or complete historical coverage.
- Provider-specific settlement using the same strict finalized-open policy. GMGN tokens use `gmgn:chain:address`; Tatum symbols preserve existing IDs for compatibility. Provider and identity are frozen at capture; no silent provider fallback.

## GMGN implementation

Read-only HTTP routes: `GET https://openapi.gmgn.ai/v1/market/search` and `/v1/market/token_kline`. Authentication follows the official CLI: `X-APIKEY`, fresh Unix-second `timestamp`, and UUID `client_id`. Requests use IPv4, fixed destinations, a 15-second deadline and a 2MB response bound. No signing or trading keys are loaded. Provider error bodies are not returned to the browser; only controlled error codes. A 429 starts a local cooldown, respecting a later provider reset if present. Token searches are operator-authorized, budget-limited and cached for 60 seconds.

Historical requests use `resolution=1m` and millisecond `from`/`to`, matching the official CLI's wire protocol. **Live candle `time` values are milliseconds**, despite a contradictory seconds description in the skills page. The parser pins the observed format, requires minute-aligned timestamps, derives the close from the requested one-minute interval, and rejects conflicting same-time rows. It does not guess time units or silently reinterpret seconds.

Source metadata is untrusted data. The UI escapes it; it never becomes agent instructions or settlement rules. Discovery requires a real provider response before a token can be captured. SQLite stores its first discovered metadata; the canonical chain/address is authoritative for identity, not its display name.

## Actual proof

GMGN authenticated search succeeded on 24 October 2026. The query `VVV` scoped to Base returned many same-ticker candidates; that is not proof they are all the same asset. The selected contract `0xacfe6019ed1a7dc6f7b508c02d1b04ec88cc21bf` is independently listed in [Venice's official FAQ](https://venice.ai/faqs/all). A finalized historical minute at the requested boundary passed OHLC/timestamp checks; see [gmgn-verification.json](evidence/gmgn-verification.json).

The browser flow was exercised: search exact Base contract → select VVV → verify historical sample → visible success. The Ansem screenshot remained unsaved because it lacks a measurable deadline and authenticated provenance. Price availability does not make that post scorable.

## Dune vs GMGN vs Tatum

| Provider | Suitable role | Limit for CALBOK |
| --- | --- | --- |
| Tatum | Existing documented market candles and required Sui RPC proof | Listing does not prove all historical windows; ticker IDs are provider-market identifiers, not arbitrary contracts |
| GMGN | Contract-based token discovery and historical candles | Requires API key; duplicates by ticker; coverage, retention, rates and pool aggregation remain provider-dependent |
| Dune | Broad token discovery, analytics, onchain context and source-aware research | `prices.minute` is interpolated and can be forward-filled for up to 48h; it is not an observed OHLC open and cannot be substituted under the locked v1 scoring policy |

“All available coins” means the documented Tatum catalog plus tokens returned by GMGN's live search on supported chains. It does not mean every token ever deployed or guaranteed minute history. No bulk paid candle sweep was performed.

## References

- [Tatum OHLCV schema](https://docs.tatum.io/reference/getsymbolohlcv)
- [GMGN Agent API](https://docs.gmgn.ai/index/gmgn-agent-api)
- [Official GMGN query client](https://github.com/GMGNAI/gmgn-skills)
- [Dune minute-price methodology](https://docs.dune.com/data-catalog/curated/prices/prices_minute)
