# Live demo: lock → settle → remember → restart → recall → caution

Use the production owner workspace at https://calbok.xyz/. This runbook creates only predictions you deliberately confirm and uses the ordinary UI, worker, providers and Walrus jobs. Local test fixtures never belong in a live demo.

## Before recording

1. Sign in as the owner. On a narrow screen, open **☰ → Integration settings**.
2. Confirm **Worker online**, Walrus Mainnet configured, and automatic memory enabled. Check the remaining write budget. **Remember all settled** explicitly approves the current verified backlog and can spend from the Walrus account; use it only with the owner's approval. It does not lift the one-new-submission-per-minute limit. Pending confirmations take priority, so a write need not start every minute.
3. Confirm Railway has one replica and its persistent volume at `/data`, with `CALBOK_DB_PATH=/data/calbok.sqlite`. Keep the configured provider credentials private. Public sign-in and member provider access stay off.
4. Choose a genuine prospective call and the exact asset identity. Preserve the original text and source, and check the direction. For a short demo, deliberately choose **1 hour**; **4 hours** also works. Never change the horizon of an already locked receipt.
5. Open **Overview → Path to caution**. Pick one caller / asset / direction / horizon group to follow. Existing 24h results cannot count toward a 1h group. The card's win rate and completed count use verified, completed wins and losses; neutral outcomes do not count toward the five-observation minimum.

## 1. Lock a genuine prediction

1. Choose **Log a call**, supply the actual call, select the exact market, direction and horizon, then **Review this call → Confirm and lock call**.
2. Show the receipt's **Locked**, **Deadline**, **Receipt ID**, snapshot hash and original source. The server assigns the clock at confirmation; the source post's timestamp is never substituted.
3. On Overview, point to **Calls locked** and **Awaiting outcome**, plus the Integration progress **Lock a forward-looking call** count. In **Path to caution**, show the group's next settlement time.

## 2. Let the worker settle

1. Leave the worker running through the deadline. No manual click is needed. Receipt details show **Deadline observed** on the next healthy one-minute sweep; this is acknowledgment, not a finalized verdict.
2. The eligible exit candle must open at or after the boundary and then finish its full minute. Earliest finality is `ceil(deadline / 60,000) * 60,000 + 60,000`—60–120 seconds after the deadline. The card shows this earliest time, not a provider SLA. The worker limits provider processing to three receipts per cycle; backlog, outages and retries can add delay.
3. Show the stored entry/exit timestamps, prices, named source, pair and raw-response hash, then the immutable won/lost/neutral verdict. Catalog pricing tries Tatum, Coinbase and Binance in order; GMGN token IDs use GMGN. Binance quotes are USDT, not USD. Entry and exit must use the same provider.
4. Point to **Verify a settled outcome** in Integration progress. **Awaiting outcome** drops when settlement is recorded. **Verified win rate** uses wins/losses; it is not the same as the group's completed-memory win rate.
5. If evidence is missing or stale, show the pending/retry/manual-review state truthfully. Do not replace a candle, force an outcome or alter SQL to continue the demo.

## 3. Confirm the memory

1. Settlements queue automatic memory through the normal remember path. The worker also backfills verified settled receipts. In **Integration settings**, show the waiting count and approved budget; the **Memory explorer** ledger shows provider jobs rather than all waiting receipts.
2. Wait for **done** and a nonempty blob ID. Accepted/running/uncertain jobs are not completed evidence. A manual **Remember outcome** uses the same safe path if automatic memory is paused and the owner approves the write.
3. Point to **Completed memories** and Integration progress **Confirm a Mainnet memory**. Then show **Path to caution → Completed scored memories n/5** for this exact group. Neutral memories can increase total completions without advancing this group's minimum.
4. A settled receipt with a done memory and blob now offers **Lock again (same group)**. It opens the final confirmation directly. Caller, asset, direction and horizon stay in the same group, and the server rechecks that requirement. Nothing locks until confirmation.
5. A repeat is your new prospective re-lock of the original terms. It does not prove the original author made another post. Do not manufacture third-party calls or repeatedly log duplicates to reach five. For third-party coverage, use genuine new calls; use the normal editable form when the source/text needs updating. Any group change starts a different history.

## 4. Build sufficient history honestly

Repeat the ordinary lock → wait → verified settlement → confirmed memory process until the group has at least five completed wins/losses. A sequential 1h chain needs roughly five hours plus provider and memory confirmation time before its sixth lock; there is no instant safe shortcut. Distinct genuine calls may overlap, but duplicates are not independent evidence.

Caution also requires the observed win rate to be **under 40%**. One win and four losses is 20%; two wins and three losses is exactly 40% and must remain informational. Do not engineer losses, remove wins, or claim that caution is guaranteed. If the real history does not meet the rule, demonstrate informational recall and describe caution as not yet available.

## 5. Restart and demonstrate durability

1. Note the five source receipt IDs, completed-memory count and blob IDs. Do not copy credentials or login codes into the recording.
2. In Railway, open the CALBOK service's current deployment and choose **Restart**. Keep the persistent volume attached; do not reset or redeploy an empty database. Only the owner/operator should perform this operational step.
3. After the service is healthy, reopen CALBOK and check **Worker online**. Completed memories, receipt evidence and job/blob links must still be present. An interrupted worker lease may need up to two minutes to recover.
4. Do not create replacement memories just to make a counter reappear. If completion proof is missing, investigate it rather than treating it as a failed write or resubmitting an uncertain job.

## 6. Recall and caution on a later lock

1. Only after the five qualifying memories completed, open the most recent settled receipt in that group and choose **Lock again (same group)**. Review the unchanged scoring terms and the re-lock disclaimer, then **Confirm and lock call**.
2. The new lock runs automatic recall. Show **n prior memories cited**, the matching win rate, and **Caution applied** or **Caution not applied** on the new receipt. A memory completed at or after this lock cannot qualify, even if it finishes before recall returns.
3. If at least five retrieved, matching, verified memories completed before the lock and their win rate is under 40%, show the clear caution banner. Open each cited receipt ID as needed.
4. Expand **SQL citation · verified receipt and blob links**. Show the actual parameterized SQL, bindings and returned receipt/job/blob/completion rows. The server reconstructs these from the owner's SQL records; provider text and stored banner labels cannot supply a score by themselves.
5. On Overview, point to Integration progress **Recall completed memory with SQL citations** and **Show a later call’s memory-driven caution**. The latter is the adapt counter. It must increment only for a stored, replayable caution review; an empty recall or a sample below five does not count.
6. **Completed memories** does not increase just because recall ran. The new receipt remains pending until its own deadline and normal settlement/memory cycle.

## Recording checklist

- Genuine original call, chosen market and confirmed server lock time.
- Earliest settlement time and actual deadline-observation timestamp, without claiming an unavailable verdict.
- Reproducible entry/exit evidence and provider identity.
- Confirmed Mainnet job and blob; waiting and pending counts kept distinct.
- Counts and blobs survive a Railway restart.
- New lock after qualifying memory completion, cited SQL rows, honest sample size and win rate.
- Recall/adapt counters reflect stored proof. If caution has not genuinely qualified, say so.

## Owner opt-in repeat series (scheduled predictions, not caller posts)

This is an optional automation mode. **Never describe its locks as organic calls from the named caller.** They are new, prospective predictions scheduled by the workspace owner, repeating an existing group's terms. Their prices and outcomes still come from normal provider evidence after the server lock and deadline. No series starts automatically on deployment.

1. Begin with a genuine, verified settled **15m, 1h or 4h** receipt whose Mainnet memory is confirmed with a provider job and blob proof. A 24h/7d receipt cannot seed a series, and existing horizons are never rewritten.
2. As the owner, open that receipt and select **Start repeat series**. Set **Additional locks (1–10)** and read the confirmation. The count excludes the seed receipt. Confirm once to authorize up to that many scheduled predictions and one new memory submission per generated step, using normal provider credits and the Walrus balance. This authorization is scoped to those series steps; it does not raise the general write budget. Automatic memory must be enabled.
3. On Overview, show **Owner repeat series**. Point to the series ID, **Step N of count**, group memories **n/5**, win rate and next settlement deadline. There can be only one active series in a group. Repeating the same confirmation request does not create another series.
4. The worker creates the first additional lock after the seed's verified memory is available. Every later step waits until the previous scheduled prediction has a reproduced settlement and verified Mainnet memory completion. Each lock uses the server's current execution time, even after a restart or delay; intended run times and previous post times are never substituted. Entry prices are collected through the ordinary price-source path after its eligible candle finalizes.
5. Every generated receipt visibly says **scheduled repeat by owner, series <id>**, with its step and count. The same disclosure is stored in its immutable snapshot, memory payload, receipt summary and exports. Original caller/source text is a reference, not proof of a new post. Path to caution shows how many completed observations were owner-scheduled, and SQL recall citations expose each source receipt's series ID.
6. Each new lock runs automatic recall. Caution stops future scheduling immediately. The count also caps scheduling: after the last lock, the series only finishes its existing settlement/memory flow. A provider operation that fails after normal price fallbacks, a memory failure or uncertain acceptance, or a failed/unconfirmed recall stops future locks. A pending candle or accepted memory still awaiting confirmation is not a fabricated failure or completed result.
7. **Stop series** revokes future locks. It does not delete, backdate or cancel already locked predictions. Their previously approved settlement/memory flow can finish, and accepted memory jobs can still confirm. Failed scheduled memory submissions require manual review; the automatic worker does not resubmit them. A stopped series never resumes on its own after recovery. Starting another series requires a fresh owner confirmation.
8. The one-new-memory-submission-per-minute dispatch limit and pending-job priority remain in force across normal and scheduled writes. Series are bounded at ten additional locks; they do not promise a caution result. Show all real wins, losses and neutral outcomes, including histories that remain informational. These observations demonstrate the owner's repeated terms, not independent accuracy claims about new caller posts.
9. For restart footage, note the series ID and current step before restarting the existing single-replica Railway service with its volume attached. The series and step association commit with each new receipt. A saved recall is recovered from SQL without another lock. If a recall was interrupted without durable proof, the series stops conservatively instead of generating more predictions or inventing a warning.

Do not start a paid live series merely to test the controls. Use the isolated local test suite for failure, restart and caution fixtures. A live demo needs the owner's explicit opt-in and actual provider results.

A **15m series** is the fastest real path to a caution demo. Every step still waits for its actual 15-minute deadline, a finalized eligible 1-minute exit candle, and confirmed Mainnet memory before the next lock. These are owner-scheduled repeat predictions, not new caller posts. Caution requires at least five verified wins/losses in the exact caller/asset/direction/horizon group and a win rate below 40%; it is never guaranteed. 15m history never contributes to 1h or 24h groups.
