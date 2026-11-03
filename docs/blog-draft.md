# How CALBOK puts market calls on the record

A market prediction can disappear into a feed long before anyone checks its outcome. CALBOK keeps the original call, the terms used to score it, and the price evidence used to settle it.

A screenshot or pasted post can go into a private inbox immediately. When someone makes a forward-looking prediction, they choose an exact market, direction and scoring window. Confirming creates a timestamped receipt with a hash of the original snapshot. A source link is a reference and its authorship remains unverified.

## Checking the outcome

After the deadline, CALBOK uses finalized one-minute candles. It takes the first eligible opening price at or after each boundary, within a 60-second window, and checks whether the price moved in the predicted direction. Missing candles leave the outcome unresolved.

Tatum supplies supported historical market data and a separate Sui Mainnet metadata read. The metadata read establishes the native SUI coin identity. GMGN supplies pricing for supported contract-address markets. The receipt records which provider supplied the settlement evidence.

The first live forward call settled successfully. Before publication, add its approved receipt ID and a redacted evidence excerpt.

## What memory contributes

Walrus Mainnet can retain a verified result. CALBOK counts a write after the provider returns completion and a blob ID. Owners can explicitly enable a limited batch of automatic writes.

When context is checked for a later call, CALBOK resolves recalled references against verified receipts. It compares the caller's overall scored history with relevant results for the same market, direction and window. The comparison shows both sample sizes and links to the evidence. A caution requires at least five relevant scored outcomes and a win rate below 40 percent.

Before publication, add the real completed job and blob evidence, the post-restart recall check, and a genuine before/after example. Include the actual counts and link the demo and repository once approved for publication.
