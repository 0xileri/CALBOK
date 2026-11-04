import {db,listReceipts} from './db';
import {boundaryCandle,type Candle} from './domain';
import {assetCandles} from './providers';

export type EntryPrice = {prediction_id:string; candle:string|null; error:string|null; checked_at:string};

export function entryPriceSchema() {
  db().exec(`CREATE TABLE IF NOT EXISTS entry_prices (
    prediction_id TEXT PRIMARY KEY REFERENCES predictions(id),
    candle TEXT, error TEXT, checked_at TEXT NOT NULL
  )`);
}

export async function recordEntryPrice(id:string, fetchCandles=assetCandles, clock=Date.now) {
  entryPriceSchema();
  const database=db();
  const existing=database.prepare('SELECT * FROM entry_prices WHERE prediction_id=?').get(id) as EntryPrice|undefined;
  if (existing?.candle) return existing;
  const receipt=listReceipts().find(row=>row.id===id);
  if (!receipt) return;
  const now=clock(), boundary=Date.parse(receipt.locked_at);
  if (Math.ceil(boundary/60_000)*60_000+60_000>now) return;
  let candle:Candle|undefined;
  let error:string|null=null;
  try {
    const candles=await fetchCandles(receipt.asset,boundary);
    candle=boundaryCandle(candles,boundary,now);
    error=candle?null:'ENTRY_PRICE_BOUNDARY_UNAVAILABLE';
  } catch {
    error='ENTRY_PRICE_PROVIDER_UNAVAILABLE';
  }
  database.prepare(`INSERT INTO entry_prices VALUES (?,?,?,?)
    ON CONFLICT(prediction_id) DO UPDATE SET candle=excluded.candle,error=excluded.error,checked_at=excluded.checked_at
    WHERE entry_prices.candle IS NULL`).run(id,candle?JSON.stringify(candle):null,error,new Date(now).toISOString());
  return database.prepare('SELECT * FROM entry_prices WHERE prediction_id=?').get(id) as EntryPrice;
}

export async function entryPriceTick(clock=Date.now,fetchCandles=assetCandles) {
  entryPriceSchema();
  const time=clock();
  const rows=db().prepare(`SELECT p.id FROM predictions p LEFT JOIN entry_prices e ON e.prediction_id=p.id
    WHERE e.candle IS NULL AND p.locked_at<=? AND (e.checked_at IS NULL OR e.checked_at<=?)
    AND (COALESCE((SELECT owner_id FROM prediction_owners WHERE prediction_id=p.id),'operator')='operator' OR ?=1)
    ORDER BY COALESCE(e.checked_at,''),p.locked_at LIMIT 3`)
    .all(new Date(time-120_000).toISOString(),new Date(time-300_000).toISOString(),process.env.CALBOK_USER_PROVIDER_ACCESS==='true'?1:0) as {id:string}[];
  for (const row of rows) await recordEntryPrice(row.id,fetchCandles,clock);
}
