# Scoring contract v1

Only prospective directional calls are supported. Asset, direction, horizon and original text lock at the server's current UTC time. Deadline = lock + 1h, 4h, 24h or 168h. A source URL is unverified; it does not establish publication time or authorship. All form terms must be explicitly chosen. GMGN assets are identified by chain/contract and their provider metadata is included in the immutable snapshot; settlement never switches providers silently.

For entry and exit, select the first available finalized one-minute candle with an open timestamp at/after the boundary and no more than 60 seconds later. Its close must be exactly open + 60,000 ms and no later than current time. The request rounds the target up to a minute boundary, but the actual returned timestamps are independently checked. Closest, overlapping, distant, unfinalized or malformed records are rejected. Positive OHLC values and valid high/low ranges are required. The provider timestamp convention must pass live verification before production use.

Live timestamp verification (24 October 2026): Tatum returns the final inclusive millisecond for its 1-minute candle close (`open + 59,999ms`). The adapter preserves this as `sourceCloseTime` and normalizes to exclusive `closeTime = open + 60,000ms` before eligibility checks. Exact 60,000ms exclusive source intervals also pass; all other durations fail. Open times are never shifted.

Return percent = `(exit.open / entry.open - 1) * 100`, evaluated with decimal.js. Bullish positive = won; bullish negative = lost; bearish reverses these; exact zero = neutral. Example: 100 → 110 is +10%, bullish won, bearish lost. Decimal comparisons determine the outcome before formatting the displayed return.

Before deadline + one minute: pending. Missing admissible coverage after deadline: unscorable for that attempt, without persisting a final outcome (can retry if history becomes available). Provider failures remain temporarily unavailable, never scored. Only won/lost/neutral results are persisted. Immutable settlement method ID: `directional-open-v1`.

Win rate = wins/(wins+losses), with numerator/denominator. Neutral, pending, unscorable and disputed do not count as losses. This release cannot create disputed records; disputes and auditable corrections remain required future work. Self-logged identities are not verified external authors. No public reputation scores or ROI.

Warning policy `contextual-v1`: baseline counts verified SQL settlements for the exact caller label. Recalled IDs are intersected with verified settlements for the same caller, asset, direction and horizon. Fewer than 5 matching win/loss outcomes cannot trigger caution. At least 5 with contextual win rate below 40% yields caution; otherwise informational. No baseline sample yields no_history unless sufficient relevant history exists. Recall can change evidence selection and warning priority; it cannot alter the verdict or aggregate SQL counts. Historical correlation is not predictive certainty.

GMGN candles use verified millisecond open timestamps and a requested 1m interval; the same finalized-open eligibility checks apply. GMGN and Tatum evidence identify their provider. Dune's interpolated prices are not used for this method.

Target-touch scoring, price corrections, cancellation and settlement supersession are intentionally unsupported. No implementation claims for these cases.
