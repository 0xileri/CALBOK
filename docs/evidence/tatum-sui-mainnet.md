# Tatum Sui Mainnet proof

Status on 24 October 2026: **PASS — live Mainnet gRPC read verified at 15:16:16 UTC.**

Endpoint: `sui-mainnet-grpc.gateway.tatum.io:443`, native TLS gRPC, `sui.rpc.v2.StateService/GetCoinInfo`, coin type `0x2::sui::SUI`. Server-side `x-api-key` metadata. Product relevance: verifies native SUI coin identity; does not establish USD pricing. The earlier JSON-RPC endpoint returned 404 and was replaced.

Returned metadata object: `0xf256d3fb6a50eaa748d94335b34f2982fbc3b63ceec78cafaa29ebc9ebaf2bbc`; symbol SUI; decimals 9; name Sui. [Explorer](https://suiscan.xyz/mainnet/object/0xf256d3fb6a50eaa748d94335b34f2982fbc3b63ceec78cafaa29ebc9ebaf2bbc). Raw-response hash and exact checked timestamps are saved in [provider-verification.json](provider-verification.json). Running the UI read also persists evidence in SQLite; this CLI check saves the evidence file.

BTC historical candle verification also passed via `/v4/data/rate/symbol/OHLCV?symbol=BTC&interval=1m` with a millisecond `unix` boundary. The returned open matched the requested minute. Tatum returned an inclusive close (`open + 59,999ms`); the adapter preserves it and normalizes to an exclusive close. Full candle and response hash are in the JSON evidence. This proves one BTC query, not blanket market/historical coverage.
