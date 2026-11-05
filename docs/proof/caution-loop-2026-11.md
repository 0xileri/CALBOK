# CALBOK caution-loop proof — November 2026

Group: **@CryptoKaleo / BTC / bearish / 15m**. Owner-confirmed scheduled repeat predictions; these are not new organic posts by the named caller. No backdating, fabricated prices or hand-inserted records.

Approved cap: **seven calls total**, including the seed and any conditional final caution-check lock. The existing series is capped at six additional locks and can stop early; an eighth lock is forbidden. The observer never settles calls, writes memories or changes provider settings. Its timer is set to five minutes; actual observation timestamps are recorded, and host suspension or delayed execution is not backfilled with invented intermediate checks.

Checked: 2026-11-05T06:09:20.308Z; 5 Nov 2026, 07:09:20 GMT+1.

Status: **threshold-not-met**. No final call locked: 5 scored memories, 3 won / 2 lost, win rate 60.0%. Caution requires at least five wins/losses and a rate strictly below 40%.

Confirmed Mainnet memories: **5**. Verified scored memories: **5** (3 won / 2 lost). Win rate: **60.0%**.

Series: RS-d8bce9be-edee-4266-b316-ab2101cda83f (stopped, 5/6 additional locks; OWNER_STOPPED)

## Run result and limits

Initial read-only inspection at **2026-11-05T04:27:15.071Z** (**05:27:15 Africa/Lagos**) found **zero** completed memories in this exact 15m group, an undefined win rate, and no active series. Existing 1h and 24h calls were not merged into this group.

At the final check, **five distinct Mainnet memories** were confirmed: **three won and two lost (60.0%)**. All five settlements used **Coinbase** through the existing price-source fallback flow and `directional-open-v1`. No new final caution-check call was submitted because 60% is not below 40%.

The normal worker had already locked scheduled repeat **CB-be4c9da4-cb7e-476b-82b8-890a353b6e90** at **2026-11-05T06:07:17.084Z / 07:07:17 Africa/Lagos**. Its real automatic recall cited **all five** prior SQL receipt/job/blob rows, each completed strictly before that lock. Its priority is **informational**, its contextual sample is **5**, and its contextual win rate is **60.0%**. Therefore no caution banner is expected. This proves Mainnet memory → SQL-cited recall; a positive caution demonstration remains unproven, rather than being fabricated.

Future series locks were stopped through the existing owner Stop action after reaching five confirmed memories. Six calls were created in total (one seed plus five scheduled repeats), within the approved seven-call maximum. The sixth was still open at this proof cutoff, with deadline **2026-11-05T06:22:17.084Z / 07:22:17 Africa/Lagos**; its already-approved normal settlement/memory may complete later. No outcome or memory completion is claimed for it here.

The general automatic-memory quota was already exhausted (`used=31`, `limit=31`). The seed alone used the existing authenticated Remember action after verified settlement; unrelated backlog writes were not approved. Series receipts were auto-remembered under the normal bounded series approval.

The observer timer is five minutes. A local execution gap occurred between the 05:14 and 05:49 UTC observations while the remote worker continued. Actual first-observed times are recorded honestly; no intermediate checks or timestamps were backfilled.

The temporary operator-helper commands below are an audit trail, not instructions to replay paid actions. Their exact HTTP action payloads are included in comments. They inherited the Railway environment and supplied both the Bearer authorization header and `Origin: https://calbok.xyz`; no credential value is recorded.

## Real receipt evidence

| Receipt | Locked UTC / Lagos | Deadline UTC / Lagos | Settled UTC / Lagos (done job) | Outcome | Return % | Provider | Memory state | Walrus blob ID | Completed UTC / Lagos |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CB-afeb1880-4caa-4a86-b2a0-39f2d7aa1b0d | 2026-11-05T04:30:44.613Z / 5 Nov 2026, 05:30:44 GMT+1 | 2026-11-05T04:45:44.613Z / 5 Nov 2026, 05:45:44 GMT+1 | 2026-11-05T04:47:15.307Z / 5 Nov 2026, 05:47:15 GMT+1 | lost | 0.31447832 | Coinbase | done (Mainnet confirmed) | nNqALC2eg55hQId_kc158Z3bzLYBDmGcM7YGkyHsEiE | 2026-11-05T04:49:41.307Z / 5 Nov 2026, 05:49:41 GMT+1 |
| CB-1d6e5327-66d9-400f-b044-aa6dd872d100 | 2026-11-05T04:55:15.072Z / 5 Nov 2026, 05:55:15 GMT+1 | 2026-11-05T05:10:15.072Z / 5 Nov 2026, 06:10:15 GMT+1 | 2026-11-05T05:12:16.142Z / 5 Nov 2026, 06:12:16 GMT+1 | won | -0.09048208 | Coinbase | done (Mainnet confirmed) | VCMDRpE-tUV319QKNEcTnkXqjpqXS7KfCPs5JlNsr3c | 2026-11-05T05:13:15.850Z / 5 Nov 2026, 06:13:15 GMT+1 |
| CB-228318f7-fa45-41ba-bfbe-7b2c3fa3d865 | 2026-11-05T05:13:15.883Z / 5 Nov 2026, 06:13:15 GMT+1 | 2026-11-05T05:28:15.883Z / 5 Nov 2026, 06:28:15 GMT+1 | 2026-11-05T05:30:16.012Z / 5 Nov 2026, 06:30:16 GMT+1 | lost | 0.01554582 | Coinbase | done (Mainnet confirmed) | y9pmW4KMs7dpQSynfdTr84OVyPVQL_pIROfE9Cp_45Y | 2026-11-05T05:31:16.244Z / 5 Nov 2026, 06:31:16 GMT+1 |
| CB-e192f7b0-3296-4a84-9c07-edd92367b049 | 2026-11-05T05:31:16.271Z / 5 Nov 2026, 06:31:16 GMT+1 | 2026-11-05T05:46:16.271Z / 5 Nov 2026, 06:46:16 GMT+1 | 2026-11-05T05:48:16.717Z / 5 Nov 2026, 06:48:16 GMT+1 | won | -0.06814024 | Coinbase | done (Mainnet confirmed) | qAuSHVS5TFxY87uTJcezclK1bWKBoE5DRUHhNAPZ0TU | 2026-11-05T05:49:16.700Z / 5 Nov 2026, 06:49:16 GMT+1 |
| CB-7459b00d-eafc-46a1-ac5e-b91672f26d24 | 2026-11-05T05:49:16.736Z / 5 Nov 2026, 06:49:16 GMT+1 | 2026-11-05T06:04:16.736Z / 5 Nov 2026, 07:04:16 GMT+1 | 2026-11-05T06:06:16.854Z / 5 Nov 2026, 07:06:16 GMT+1 | won | -0.03999817 | Coinbase | done (Mainnet confirmed) | XXRJPBo2JplvG_Q8Ohzw7VV4FG926RZMEPCOCVuQH0Q | 2026-11-05T06:07:17.061Z / 5 Nov 2026, 07:07:17 GMT+1 |
| CB-be4c9da4-cb7e-476b-82b8-890a353b6e90 | 2026-11-05T06:07:17.084Z / 5 Nov 2026, 07:07:17 GMT+1 | 2026-11-05T06:22:17.084Z / 5 Nov 2026, 07:22:17 GMT+1 | not exposed / not exposed | — | — | — | no job | — | not exposed / not exposed |

Settlement time is the existing done settlement job’s updated_at, recorded by the normal worker in the same transaction using the same completion timestamp as settlements.settled_at. The raw settlements.settled_at column is not separately exposed. The checkpoint also distinguishes first polling observation and finalized exit-candle time; no observation time is substituted for a settlement time. Neutral results do not count toward the five scored observations. Only Mainnet completion proofs matched to done jobs and reproduced SQL settlements count.

## Recall and warning

No final caution-check lock recorded.

No verified caution review recorded. No final call locked: 5 scored memories, 3 won / 2 lost, win rate 60.0%. Caution requires at least five wins/losses and a rate strictly below 40%.

Warning wording, when present above, is reconstructed from the existing components/caution-notice.tsx and the actual returned review; no banner is asserted without verified caution proof.

## Existing group recall citations

These are the actual receipt-keyed reviews returned by /api/workspace, not substitutes for the conditional final target. No raw memory text is included.

```json
{
  "CB-be4c9da4-cb7e-476b-82b8-890a353b6e90": {
    "baseline": {
      "wins": 3,
      "losses": 4,
      "total": 7,
      "excluded": 0,
      "rate": "42.9"
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
  },
  "CB-7459b00d-eafc-46a1-ac5e-b91672f26d24": {
    "baseline": {
      "wins": 3,
      "losses": 4,
      "total": 7,
      "excluded": 0,
      "rate": "42.9"
    },
    "contextual": {
      "wins": 2,
      "losses": 2,
      "total": 4,
      "excluded": 0,
      "rate": "50.0"
    },
    "priority": "informational",
    "citedIds": [
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
        "[\"CB-e192f7b0-3296-4a84-9c07-edd92367b049\",\"CB-228318f7-fa45-41ba-bfbe-7b2c3fa3d865\",\"CB-1d6e5327-66d9-400f-b044-aa6dd872d100\",\"CB-afeb1880-4caa-4a86-b2a0-39f2d7aa1b0d\"]",
        "2026-11-05T05:49:16.736Z"
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
  },
  "CB-e192f7b0-3296-4a84-9c07-edd92367b049": {
    "baseline": {
      "wins": 3,
      "losses": 4,
      "total": 7,
      "excluded": 0,
      "rate": "42.9"
    },
    "contextual": {
      "wins": 1,
      "losses": 2,
      "total": 3,
      "excluded": 0,
      "rate": "33.3"
    },
    "priority": "informational",
    "citedIds": [
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
        "[\"CB-228318f7-fa45-41ba-bfbe-7b2c3fa3d865\",\"CB-1d6e5327-66d9-400f-b044-aa6dd872d100\",\"CB-afeb1880-4caa-4a86-b2a0-39f2d7aa1b0d\"]",
        "2026-11-05T05:31:16.271Z"
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
          "receiptId": "CB-afeb1880-4caa-4a86-b2a0-39f2d7aa1b0d",
          "jobId": "1028e81d-1b66-44aa-9348-f72828e73023",
          "blobId": "nNqALC2eg55hQId_kc158Z3bzLYBDmGcM7YGkyHsEiE",
          "completedAt": "2026-11-05T04:49:41.307Z",
          "seriesId": null
        }
      ]
    }
  },
  "CB-228318f7-fa45-41ba-bfbe-7b2c3fa3d865": {
    "baseline": {
      "wins": 3,
      "losses": 4,
      "total": 7,
      "excluded": 0,
      "rate": "42.9"
    },
    "contextual": {
      "wins": 1,
      "losses": 1,
      "total": 2,
      "excluded": 0,
      "rate": "50.0"
    },
    "priority": "informational",
    "citedIds": [
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
        "[\"CB-1d6e5327-66d9-400f-b044-aa6dd872d100\",\"CB-afeb1880-4caa-4a86-b2a0-39f2d7aa1b0d\"]",
        "2026-11-05T05:13:15.883Z"
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
          "receiptId": "CB-afeb1880-4caa-4a86-b2a0-39f2d7aa1b0d",
          "jobId": "1028e81d-1b66-44aa-9348-f72828e73023",
          "blobId": "nNqALC2eg55hQId_kc158Z3bzLYBDmGcM7YGkyHsEiE",
          "completedAt": "2026-11-05T04:49:41.307Z",
          "seriesId": null
        }
      ]
    }
  },
  "CB-1d6e5327-66d9-400f-b044-aa6dd872d100": {
    "baseline": {
      "wins": 3,
      "losses": 4,
      "total": 7,
      "excluded": 0,
      "rate": "42.9"
    },
    "contextual": {
      "wins": 0,
      "losses": 1,
      "total": 1,
      "excluded": 0,
      "rate": "0.0"
    },
    "priority": "informational",
    "citedIds": [
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
        "[\"CB-afeb1880-4caa-4a86-b2a0-39f2d7aa1b0d\"]",
        "2026-11-05T04:55:15.072Z"
      ],
      "rows": [
        {
          "receiptId": "CB-afeb1880-4caa-4a86-b2a0-39f2d7aa1b0d",
          "jobId": "1028e81d-1b66-44aa-9348-f72828e73023",
          "blobId": "nNqALC2eg55hQId_kc158Z3bzLYBDmGcM7YGkyHsEiE",
          "completedAt": "2026-11-05T04:49:41.307Z",
          "seriesId": null
        }
      ]
    }
  }
}
```

## Exact commands used

```powershell
npx.cmd --yes @railway/cli run --service calbok --environment production --no-local -- npx.cmd tsx scripts/prove-caution-loop.ts --inspect
```

```powershell
npx.cmd --yes @railway/cli run --service calbok --environment production --no-local -- npx.cmd tsx scripts/prove-caution-loop.ts --prepare-seed --confirm-owner-lock
```

```powershell
npx.cmd --yes @railway/cli run --service calbok --environment production --no-local -- node data/proof-run.mjs
# Authenticated HTTP POST /api/actions; JSON: {"action":"remember","id":"CB-afeb1880-4caa-4a86-b2a0-39f2d7aa1b0d"}
```

```powershell
npx.cmd --yes @railway/cli run --service calbok --environment production --no-local -- node data/proof-run.mjs
# Authenticated HTTP POST /api/repeat-series; JSON: {"action":"start","seedId":"CB-afeb1880-4caa-4a86-b2a0-39f2d7aa1b0d","count":6,"requestId":"f7d4a7f3-abe2-4dcd-85e7-4a0ec7f2d6d4","confirmed":true}
```

```powershell
node --import tsx scripts/prove-caution-loop.ts --confirm-owner-lock
```

```powershell
npx.cmd --yes @railway/cli run --service calbok --environment production --no-local -- node data/proof-run.mjs
# Authenticated HTTP POST /api/repeat-series; JSON: {"action":"stop","id":"RS-d8bce9be-edee-4266-b316-ab2101cda83f"}
```

```powershell
node --import tsx scripts/prove-caution-loop.ts --inspect
```

Observer child commands inherit the Railway-injected parent environment. Commands reference CALBOK_ADMIN_TOKEN only through the process environment; no credential values are stored. Every API request includes Authorization and Origin. No local .env file is loaded.

## Validation

Lint, typecheck, all 105 tests, and the observer safety self-test passed.

```powershell
npm.cmd run lint
```

```powershell
npm.cmd run typecheck
```

```powershell
npm.cmd test
```

```powershell
npx.cmd tsx scripts/prove-caution-loop.ts --self-test
```

## Machine-readable checkpoint (safe to resume)

<!-- proof-state -->
```json
{
  "runId": "36ee36ea-52ec-4ccc-b559-0d9444690525",
  "startedAt": "2026-11-05T04:27:13.412Z",
  "checkedAt": "2026-11-05T06:09:20.308Z",
  "status": "threshold-not-met",
  "reason": "No final call locked: 5 scored memories, 3 won / 2 lost, win rate 60.0%. Caution requires at least five wins/losses and a rate strictly below 40%.",
  "commands": [
    "npx.cmd --yes @railway/cli run --service calbok --environment production --no-local -- npx.cmd tsx scripts/prove-caution-loop.ts --inspect",
    "npx.cmd --yes @railway/cli run --service calbok --environment production --no-local -- npx.cmd tsx scripts/prove-caution-loop.ts --prepare-seed --confirm-owner-lock",
    "npx.cmd --yes @railway/cli run --service calbok --environment production --no-local -- node data/proof-run.mjs\n# Authenticated HTTP POST /api/actions; JSON: {\"action\":\"remember\",\"id\":\"CB-afeb1880-4caa-4a86-b2a0-39f2d7aa1b0d\"}",
    "npx.cmd --yes @railway/cli run --service calbok --environment production --no-local -- node data/proof-run.mjs\n# Authenticated HTTP POST /api/repeat-series; JSON: {\"action\":\"start\",\"seedId\":\"CB-afeb1880-4caa-4a86-b2a0-39f2d7aa1b0d\",\"count\":6,\"requestId\":\"f7d4a7f3-abe2-4dcd-85e7-4a0ec7f2d6d4\",\"confirmed\":true}",
    "node --import tsx scripts/prove-caution-loop.ts --confirm-owner-lock",
    "npx.cmd --yes @railway/cli run --service calbok --environment production --no-local -- node data/proof-run.mjs\n# Authenticated HTTP POST /api/repeat-series; JSON: {\"action\":\"stop\",\"id\":\"RS-d8bce9be-edee-4266-b316-ab2101cda83f\"}",
    "node --import tsx scripts/prove-caution-loop.ts --inspect",
    "npm.cmd run lint",
    "npm.cmd run typecheck",
    "npm.cmd test",
    "npx.cmd tsx scripts/prove-caution-loop.ts --self-test"
  ],
  "series": [
    {
      "id": "RS-d8bce9be-edee-4266-b316-ab2101cda83f",
      "owner_id": "operator",
      "request_id": "f7d4a7f3-abe2-4dcd-85e7-4a0ec7f2d6d4",
      "group_key": "[\"@cryptokaleo\",\"BTC\",\"bearish\",\"15m\"]",
      "seed_id": "CB-afeb1880-4caa-4a86-b2a0-39f2d7aa1b0d",
      "current_id": "CB-be4c9da4-cb7e-476b-82b8-890a353b6e90",
      "target_count": 6,
      "created_count": 5,
      "status": "stopped",
      "stop_reason": "OWNER_STOPPED",
      "created_at": "2026-11-05T04:54:46.496Z",
      "updated_at": "2026-11-05T06:09:23.242Z",
      "caller": "@CryptoKaleo",
      "asset": "BTC",
      "direction": "bearish",
      "horizon": "15m",
      "memories": 5,
      "winRate": "60.0",
      "nextDeadline": "2026-11-05T06:22:17.084Z"
    }
  ],
  "receipts": [
    {
      "id": "CB-afeb1880-4caa-4a86-b2a0-39f2d7aa1b0d",
      "settledAt": "2026-11-05T04:47:15.307Z",
      "lockedAt": "2026-11-05T04:30:44.613Z",
      "deadline": "2026-11-05T04:45:44.613Z",
      "outcome": "lost",
      "returnPct": "0.31447832",
      "provider": "Coinbase",
      "exitFinalizedAt": "2026-11-05T04:47:00.000Z",
      "settlementObservedAt": "2026-11-05T04:49:12.837Z",
      "memoryStatus": "done",
      "jobId": "1028e81d-1b66-44aa-9348-f72828e73023",
      "blobId": "nNqALC2eg55hQId_kc158Z3bzLYBDmGcM7YGkyHsEiE",
      "completedAt": "2026-11-05T04:49:41.307Z",
      "confirmed": true
    },
    {
      "id": "CB-1d6e5327-66d9-400f-b044-aa6dd872d100",
      "settledAt": "2026-11-05T05:12:16.142Z",
      "lockedAt": "2026-11-05T04:55:15.072Z",
      "deadline": "2026-11-05T05:10:15.072Z",
      "outcome": "won",
      "returnPct": "-0.09048208",
      "provider": "Coinbase",
      "exitFinalizedAt": "2026-11-05T05:12:00.000Z",
      "settlementObservedAt": "2026-11-05T05:14:51.539Z",
      "memoryStatus": "done",
      "jobId": "6d9911b3-677a-4f4f-9be3-f94218d3b069",
      "blobId": "VCMDRpE-tUV319QKNEcTnkXqjpqXS7KfCPs5JlNsr3c",
      "completedAt": "2026-11-05T05:13:15.850Z",
      "confirmed": true
    },
    {
      "id": "CB-228318f7-fa45-41ba-bfbe-7b2c3fa3d865",
      "settledAt": "2026-11-05T05:30:16.012Z",
      "lockedAt": "2026-11-05T05:13:15.883Z",
      "deadline": "2026-11-05T05:28:15.883Z",
      "outcome": "lost",
      "returnPct": "0.01554582",
      "provider": "Coinbase",
      "exitFinalizedAt": "2026-11-05T05:30:00.000Z",
      "settlementObservedAt": "2026-11-05T05:49:07.990Z",
      "memoryStatus": "done",
      "jobId": "da2c388d-8af5-47ca-915c-09eec285d307",
      "blobId": "y9pmW4KMs7dpQSynfdTr84OVyPVQL_pIROfE9Cp_45Y",
      "completedAt": "2026-11-05T05:31:16.244Z",
      "confirmed": true
    },
    {
      "id": "CB-e192f7b0-3296-4a84-9c07-edd92367b049",
      "settledAt": "2026-11-05T05:48:16.717Z",
      "lockedAt": "2026-11-05T05:31:16.271Z",
      "deadline": "2026-11-05T05:46:16.271Z",
      "outcome": "won",
      "returnPct": "-0.06814024",
      "provider": "Coinbase",
      "exitFinalizedAt": "2026-11-05T05:48:00.000Z",
      "settlementObservedAt": "2026-11-05T05:49:07.990Z",
      "memoryStatus": "done",
      "jobId": "7b74fb2d-7fc9-4581-8b17-242cbc968231",
      "blobId": "qAuSHVS5TFxY87uTJcezclK1bWKBoE5DRUHhNAPZ0TU",
      "completedAt": "2026-11-05T05:49:16.700Z",
      "confirmed": true
    },
    {
      "id": "CB-7459b00d-eafc-46a1-ac5e-b91672f26d24",
      "settledAt": "2026-11-05T06:06:16.854Z",
      "lockedAt": "2026-11-05T05:49:16.736Z",
      "deadline": "2026-11-05T06:04:16.736Z",
      "outcome": "won",
      "returnPct": "-0.03999817",
      "provider": "Coinbase",
      "exitFinalizedAt": "2026-11-05T06:06:00.000Z",
      "settlementObservedAt": "2026-11-05T06:09:16.269Z",
      "memoryStatus": "done",
      "jobId": "1843ca56-766f-4310-bd68-2d3df0ae8f8b",
      "blobId": "XXRJPBo2JplvG_Q8Ohzw7VV4FG926RZMEPCOCVuQH0Q",
      "completedAt": "2026-11-05T06:07:17.061Z",
      "confirmed": true
    },
    {
      "id": "CB-be4c9da4-cb7e-476b-82b8-890a353b6e90",
      "settledAt": null,
      "lockedAt": "2026-11-05T06:07:17.084Z",
      "deadline": "2026-11-05T06:22:17.084Z",
      "outcome": null,
      "returnPct": null,
      "provider": null,
      "exitFinalizedAt": null,
      "settlementObservedAt": null,
      "memoryStatus": "no job",
      "jobId": null,
      "blobId": null,
      "completedAt": null,
      "confirmed": false
    }
  ],
  "confirmed": 5,
  "scored": 5,
  "wins": 3,
  "losses": 2,
  "winRate": "60.0",
  "stages": [
    {
      "key": "lock",
      "label": "Lock a forward-looking call",
      "count": 40,
      "receiptId": "CB-be4c9da4-cb7e-476b-82b8-890a353b6e90"
    },
    {
      "key": "settle",
      "label": "Verify a settled outcome",
      "count": 38,
      "receiptId": "CB-7459b00d-eafc-46a1-ac5e-b91672f26d24"
    },
    {
      "key": "remember",
      "label": "Confirm a Mainnet memory",
      "count": 37,
      "receiptId": "CB-0d806fe9-05b8-47eb-adc5-b55d6950244f"
    },
    {
      "key": "recall",
      "label": "Recall completed memory with SQL citations",
      "count": 6,
      "receiptId": "CB-be4c9da4-cb7e-476b-82b8-890a353b6e90"
    },
    {
      "key": "adapt",
      "label": "Show a later call’s memory-driven caution",
      "count": 0
    }
  ],
  "seed": {
    "text": "Owner-confirmed prospective repeat prediction, not a new caller post. BTC lower after 15 minutes. Proof run 36ee36ea-52ec-4ccc-b559-0d9444690525; seed.",
    "attemptedAt": "2026-11-05T04:30:39.144Z",
    "id": "CB-afeb1880-4caa-4a86-b2a0-39f2d7aa1b0d"
  },
  "groupRecalls": {
    "CB-be4c9da4-cb7e-476b-82b8-890a353b6e90": {
      "baseline": {
        "wins": 3,
        "losses": 4,
        "total": 7,
        "excluded": 0,
        "rate": "42.9"
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
    },
    "CB-7459b00d-eafc-46a1-ac5e-b91672f26d24": {
      "baseline": {
        "wins": 3,
        "losses": 4,
        "total": 7,
        "excluded": 0,
        "rate": "42.9"
      },
      "contextual": {
        "wins": 2,
        "losses": 2,
        "total": 4,
        "excluded": 0,
        "rate": "50.0"
      },
      "priority": "informational",
      "citedIds": [
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
          "[\"CB-e192f7b0-3296-4a84-9c07-edd92367b049\",\"CB-228318f7-fa45-41ba-bfbe-7b2c3fa3d865\",\"CB-1d6e5327-66d9-400f-b044-aa6dd872d100\",\"CB-afeb1880-4caa-4a86-b2a0-39f2d7aa1b0d\"]",
          "2026-11-05T05:49:16.736Z"
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
    },
    "CB-e192f7b0-3296-4a84-9c07-edd92367b049": {
      "baseline": {
        "wins": 3,
        "losses": 4,
        "total": 7,
        "excluded": 0,
        "rate": "42.9"
      },
      "contextual": {
        "wins": 1,
        "losses": 2,
        "total": 3,
        "excluded": 0,
        "rate": "33.3"
      },
      "priority": "informational",
      "citedIds": [
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
          "[\"CB-228318f7-fa45-41ba-bfbe-7b2c3fa3d865\",\"CB-1d6e5327-66d9-400f-b044-aa6dd872d100\",\"CB-afeb1880-4caa-4a86-b2a0-39f2d7aa1b0d\"]",
          "2026-11-05T05:31:16.271Z"
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
            "receiptId": "CB-afeb1880-4caa-4a86-b2a0-39f2d7aa1b0d",
            "jobId": "1028e81d-1b66-44aa-9348-f72828e73023",
            "blobId": "nNqALC2eg55hQId_kc158Z3bzLYBDmGcM7YGkyHsEiE",
            "completedAt": "2026-11-05T04:49:41.307Z",
            "seriesId": null
          }
        ]
      }
    },
    "CB-228318f7-fa45-41ba-bfbe-7b2c3fa3d865": {
      "baseline": {
        "wins": 3,
        "losses": 4,
        "total": 7,
        "excluded": 0,
        "rate": "42.9"
      },
      "contextual": {
        "wins": 1,
        "losses": 1,
        "total": 2,
        "excluded": 0,
        "rate": "50.0"
      },
      "priority": "informational",
      "citedIds": [
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
          "[\"CB-1d6e5327-66d9-400f-b044-aa6dd872d100\",\"CB-afeb1880-4caa-4a86-b2a0-39f2d7aa1b0d\"]",
          "2026-11-05T05:13:15.883Z"
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
            "receiptId": "CB-afeb1880-4caa-4a86-b2a0-39f2d7aa1b0d",
            "jobId": "1028e81d-1b66-44aa-9348-f72828e73023",
            "blobId": "nNqALC2eg55hQId_kc158Z3bzLYBDmGcM7YGkyHsEiE",
            "completedAt": "2026-11-05T04:49:41.307Z",
            "seriesId": null
          }
        ]
      }
    },
    "CB-1d6e5327-66d9-400f-b044-aa6dd872d100": {
      "baseline": {
        "wins": 3,
        "losses": 4,
        "total": 7,
        "excluded": 0,
        "rate": "42.9"
      },
      "contextual": {
        "wins": 0,
        "losses": 1,
        "total": 1,
        "excluded": 0,
        "rate": "0.0"
      },
      "priority": "informational",
      "citedIds": [
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
          "[\"CB-afeb1880-4caa-4a86-b2a0-39f2d7aa1b0d\"]",
          "2026-11-05T04:55:15.072Z"
        ],
        "rows": [
          {
            "receiptId": "CB-afeb1880-4caa-4a86-b2a0-39f2d7aa1b0d",
            "jobId": "1028e81d-1b66-44aa-9348-f72828e73023",
            "blobId": "nNqALC2eg55hQId_kc158Z3bzLYBDmGcM7YGkyHsEiE",
            "completedAt": "2026-11-05T04:49:41.307Z",
            "seriesId": null
          }
        ]
      }
    }
  }
}
```
