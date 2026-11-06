# Railway restart and live recall proof

Fresh authenticated recall ran on `CB-be4c9da4-cb7e-476b-82b8-890a353b6e90` before and after a production restart. **Exact match** across the receipt snapshot hash, all five cited receipt/job/blob rows, and both win rates. The contextual win rate was **60.0%**, and the baseline rate was **37.5%**. Both snapshots showed 40 receipts and 38 memory jobs.

- Before recall captured at **2026-11-06T11:58:50.565Z UTC / 2026-11-06T12:58:50.565000+01:00 Africa/Lagos**.
- `npx.cmd --yes @railway/cli restart --service calbok --environment production --yes --json` restarted deployment `7f902eef-1a5c-4b0b-ae42-ca66c6395173` in place. The deployment ID afterward was `7f902eef-1a5c-4b0b-ae42-ca66c6395173`.
- Railway logged the volume mount at **2026-11-06T11:59:20.586650668Z UTC / 2026-11-06T12:59:20.586650+01:00 Africa/Lagos** and application readiness at **2026-11-06T11:59:24.566605851Z UTC / 2026-11-06T12:59:24.566605+01:00 Africa/Lagos**. Deployment metadata listed the same `/data` mount before and after, and the startup log showed the same volume identifier.
- After restart, authenticated `GET /api/workspace` succeeded. A fresh authenticated `POST /api/actions` with `{"action":"recall","id":"CB-be4c9da4-cb7e-476b-82b8-890a353b6e90"}` was captured at **2026-11-06T12:00:07.341Z UTC / 2026-11-06T13:00:07.341000+01:00 Africa/Lagos**.

## Before

```json
{
  "at": "2026-11-06T11:58:50.565Z",
  "receipt": {
    "id": "CB-be4c9da4-cb7e-476b-82b8-890a353b6e90",
    "locked_at": "2026-11-05T06:07:17.084Z",
    "snapshot_hash": "a01c3735f963e4bfe518933c923b12964a44b63bf1e62fee33bb79d6ddc5d6c9"
  },
  "counts": {
    "receipts": 40,
    "jobs": 38
  },
  "review": {
    "baseline": {
      "wins": 3,
      "losses": 5,
      "total": 8,
      "excluded": 0,
      "rate": "37.5"
    },
    "contextual": {
      "wins": 3,
      "losses": 2,
      "total": 5,
      "excluded": 0,
      "rate": "60.0"
    },
    "priority": "informational",
    "citedIds": [
      "CB-7459b00d-eafc-46a1-ac5e-b91672f26d24",
      "CB-e192f7b0-3296-4a84-9c07-edd92367b049",
      "CB-228318f7-fa45-41ba-bfbe-7b2c3fa3d865",
      "CB-1d6e5327-66d9-400f-b044-aa6dd872d100",
      "CB-afeb1880-4caa-4a86-b2a0-39f2d7aa1b0d"
    ],
    "minimumSample": 5,
    "sqlCitation": {
      "query": "SELECT p.id AS receiptId,m.job_id AS jobId,m.blob_id AS blobId,c.completed_at AS completedAt,CASE WHEN json_valid(p.snapshot) THEN json_extract(p.snapshot,'$.scheduledRepeat.seriesId') END AS seriesId\nFROM predictions p\nLEFT JOIN prediction_owners o ON o.prediction_id=p.id\nJOIN settlements s ON s.prediction_id=p.id\nJOIN memory_jobs m ON m.prediction_id=p.id\nJOIN memory_completion_proofs c ON c.prediction_id=p.id\nWHERE COALESCE(o.owner_id,'operator')=? AND p.caller=? AND p.asset=? AND p.direction=? AND p.horizon=?\n  AND p.id IN (SELECT value FROM json_each(?)) AND s.outcome IN ('won','lost')\n  AND m.status='done' AND m.blob_id IS NOT NULL AND c.network='mainnet'\n  AND m.job_id=c.job_id AND m.blob_id=c.blob_id\n  AND (m.completed_at IS NULL OR m.completed_at=c.completed_at) AND c.completed_at<?\nORDER BY p.id",
      "parameters": [
        "operator",
        "@CryptoKaleo",
        "BTC",
        "bearish",
        "15m",
        "[\"CB-7459b00d-eafc-46a1-ac5e-b91672f26d24\",\"CB-e192f7b0-3296-4a84-9c07-edd92367b049\",\"CB-228318f7-fa45-41ba-bfbe-7b2c3fa3d865\",\"CB-1d6e5327-66d9-400f-b044-aa6dd872d100\",\"CB-afeb1880-4caa-4a86-b2a0-39f2d7aa1b0d\"]",
        "2026-11-05T06:07:17.084Z"
      ],
      "rows": [
        {
          "receiptId": "CB-1d6e5327-66d9-400f-b044-aa6dd872d100",
          "jobId": "6d9911b3-677a-4f4f-9be3-f94218d3b069",
          "blobId": "VCMDRpE-tUV319QKNEcTnkXqjpqXS7KfCPs5JlNsr3c",
          "completedAt": "2026-11-05T05:13:15.850Z",
          "seriesId": "RS-d8bce9be-edee-4266-b316-ab2101cda83f"
        },
        {
          "receiptId": "CB-228318f7-fa45-41ba-bfbe-7b2c3fa3d865",
          "jobId": "da2c388d-8af5-47ca-915c-09eec285d307",
          "blobId": "y9pmW4KMs7dpQSynfdTr84OVyPVQL_pIROfE9Cp_45Y",
          "completedAt": "2026-11-05T05:31:16.244Z",
          "seriesId": "RS-d8bce9be-edee-4266-b316-ab2101cda83f"
        },
        {
          "receiptId": "CB-7459b00d-eafc-46a1-ac5e-b91672f26d24",
          "jobId": "1843ca56-766f-4310-bd68-2d3df0ae8f8b",
          "blobId": "XXRJPBo2JplvG_Q8Ohzw7VV4FG926RZMEPCOCVuQH0Q",
          "completedAt": "2026-11-05T06:07:17.061Z",
          "seriesId": "RS-d8bce9be-edee-4266-b316-ab2101cda83f"
        },
        {
          "receiptId": "CB-afeb1880-4caa-4a86-b2a0-39f2d7aa1b0d",
          "jobId": "1028e81d-1b66-44aa-9348-f72828e73023",
          "blobId": "nNqALC2eg55hQId_kc158Z3bzLYBDmGcM7YGkyHsEiE",
          "completedAt": "2026-11-05T04:49:41.307Z",
          "seriesId": null
        },
        {
          "receiptId": "CB-e192f7b0-3296-4a84-9c07-edd92367b049",
          "jobId": "7b74fb2d-7fc9-4581-8b17-242cbc968231",
          "blobId": "qAuSHVS5TFxY87uTJcezclK1bWKBoE5DRUHhNAPZ0TU",
          "completedAt": "2026-11-05T05:49:16.700Z",
          "seriesId": "RS-d8bce9be-edee-4266-b316-ab2101cda83f"
        }
      ]
    }
  }
}
```

## After

```json
{
  "at": "2026-11-06T12:00:07.341Z",
  "receipt": {
    "id": "CB-be4c9da4-cb7e-476b-82b8-890a353b6e90",
    "locked_at": "2026-11-05T06:07:17.084Z",
    "snapshot_hash": "a01c3735f963e4bfe518933c923b12964a44b63bf1e62fee33bb79d6ddc5d6c9"
  },
  "counts": {
    "receipts": 40,
    "jobs": 38
  },
  "review": {
    "baseline": {
      "wins": 3,
      "losses": 5,
      "total": 8,
      "excluded": 0,
      "rate": "37.5"
    },
    "contextual": {
      "wins": 3,
      "losses": 2,
      "total": 5,
      "excluded": 0,
      "rate": "60.0"
    },
    "priority": "informational",
    "citedIds": [
      "CB-7459b00d-eafc-46a1-ac5e-b91672f26d24",
      "CB-e192f7b0-3296-4a84-9c07-edd92367b049",
      "CB-228318f7-fa45-41ba-bfbe-7b2c3fa3d865",
      "CB-1d6e5327-66d9-400f-b044-aa6dd872d100",
      "CB-afeb1880-4caa-4a86-b2a0-39f2d7aa1b0d"
    ],
    "minimumSample": 5,
    "sqlCitation": {
      "query": "SELECT p.id AS receiptId,m.job_id AS jobId,m.blob_id AS blobId,c.completed_at AS completedAt,CASE WHEN json_valid(p.snapshot) THEN json_extract(p.snapshot,'$.scheduledRepeat.seriesId') END AS seriesId\nFROM predictions p\nLEFT JOIN prediction_owners o ON o.prediction_id=p.id\nJOIN settlements s ON s.prediction_id=p.id\nJOIN memory_jobs m ON m.prediction_id=p.id\nJOIN memory_completion_proofs c ON c.prediction_id=p.id\nWHERE COALESCE(o.owner_id,'operator')=? AND p.caller=? AND p.asset=? AND p.direction=? AND p.horizon=?\n  AND p.id IN (SELECT value FROM json_each(?)) AND s.outcome IN ('won','lost')\n  AND m.status='done' AND m.blob_id IS NOT NULL AND c.network='mainnet'\n  AND m.job_id=c.job_id AND m.blob_id=c.blob_id\n  AND (m.completed_at IS NULL OR m.completed_at=c.completed_at) AND c.completed_at<?\nORDER BY p.id",
      "parameters": [
        "operator",
        "@CryptoKaleo",
        "BTC",
        "bearish",
        "15m",
        "[\"CB-7459b00d-eafc-46a1-ac5e-b91672f26d24\",\"CB-e192f7b0-3296-4a84-9c07-edd92367b049\",\"CB-228318f7-fa45-41ba-bfbe-7b2c3fa3d865\",\"CB-1d6e5327-66d9-400f-b044-aa6dd872d100\",\"CB-afeb1880-4caa-4a86-b2a0-39f2d7aa1b0d\"]",
        "2026-11-05T06:07:17.084Z"
      ],
      "rows": [
        {
          "receiptId": "CB-1d6e5327-66d9-400f-b044-aa6dd872d100",
          "jobId": "6d9911b3-677a-4f4f-9be3-f94218d3b069",
          "blobId": "VCMDRpE-tUV319QKNEcTnkXqjpqXS7KfCPs5JlNsr3c",
          "completedAt": "2026-11-05T05:13:15.850Z",
          "seriesId": "RS-d8bce9be-edee-4266-b316-ab2101cda83f"
        },
        {
          "receiptId": "CB-228318f7-fa45-41ba-bfbe-7b2c3fa3d865",
          "jobId": "da2c388d-8af5-47ca-915c-09eec285d307",
          "blobId": "y9pmW4KMs7dpQSynfdTr84OVyPVQL_pIROfE9Cp_45Y",
          "completedAt": "2026-11-05T05:31:16.244Z",
          "seriesId": "RS-d8bce9be-edee-4266-b316-ab2101cda83f"
        },
        {
          "receiptId": "CB-7459b00d-eafc-46a1-ac5e-b91672f26d24",
          "jobId": "1843ca56-766f-4310-bd68-2d3df0ae8f8b",
          "blobId": "XXRJPBo2JplvG_Q8Ohzw7VV4FG926RZMEPCOCVuQH0Q",
          "completedAt": "2026-11-05T06:07:17.061Z",
          "seriesId": "RS-d8bce9be-edee-4266-b316-ab2101cda83f"
        },
        {
          "receiptId": "CB-afeb1880-4caa-4a86-b2a0-39f2d7aa1b0d",
          "jobId": "1028e81d-1b66-44aa-9348-f72828e73023",
          "blobId": "nNqALC2eg55hQId_kc158Z3bzLYBDmGcM7YGkyHsEiE",
          "completedAt": "2026-11-05T04:49:41.307Z",
          "seriesId": null
        },
        {
          "receiptId": "CB-e192f7b0-3296-4a84-9c07-edd92367b049",
          "jobId": "7b74fb2d-7fc9-4581-8b17-242cbc968231",
          "blobId": "qAuSHVS5TFxY87uTJcezclK1bWKBoE5DRUHhNAPZ0TU",
          "completedAt": "2026-11-05T05:49:16.700Z",
          "seriesId": "RS-d8bce9be-edee-4266-b316-ab2101cda83f"
        }
      ]
    }
  }
}
```
