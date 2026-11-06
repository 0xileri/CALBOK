# Fresh Tatum Sui Mainnet RPC proof

The existing authenticated `POST /api/actions` with `{"action":"sui"}` performed **sui.rpc.v2.StateService/GetCoinInfo** over Tatum gRPC. The verified timestamp was **2026-11-06T11:58:56.446Z UTC / 2026-11-06T12:58:56.446000+01:00 Africa/Lagos**. The resulting proof row was visible in `GET /api/integration-proof`.

The action verifies native SUI coin metadata, including its object ID, symbol, and nine decimals. The current action has no checkpoint lookup or verified mapping from a Walrus blob ID to a Sui object or transaction. This evidence covers the metadata read.

```json
{
  "evidence": {
    "network": "mainnet",
    "provider": "Tatum",
    "transport": "gRPC",
    "method": "sui.rpc.v2.StateService/GetCoinInfo",
    "coinType": "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
    "id": "0xf256d3fb6a50eaa748d94335b34f2982fbc3b63ceec78cafaa29ebc9ebaf2bbc",
    "symbol": "SUI",
    "decimals": 9,
    "name": "Sui",
    "responseHash": "8550b47156c8af3041528759df682b74439427612a3d19ce57a7307007687a23",
    "verifiedAt": "2026-11-06T11:58:56.446Z"
  },
  "storedProofRow": {
    "id": "235ef8d8-b969-4646-bed8-6a6dd3af0a96",
    "at": "2026-11-06T11:58:56.446Z"
  }
}
```

Admin → Integration proof shows the latest validated method, timestamp, and result summary.
