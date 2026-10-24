import Decimal from 'decimal.js';
import { z } from 'zod';
import {isAllowedAsset} from './assets';

export const claimSchema = z.object({
  caller: z.string().trim().min(2).max(60),
  text: z.string().trim().min(10).max(2000),
  asset: z.string().max(120).refine(isAllowedAsset,'Choose a listed Tatum market or a GMGN token with a valid chain and contract address.'),
  direction: z.enum(['bullish', 'bearish']),
  horizon: z.enum(['24h', '7d']),
  // This release supports prospectively self-logged directional calls only.
  sourceUrl: z.union([z.literal(''), z.url().refine(v => new URL(v).protocol === 'https:', 'Use an HTTPS URL')]).default(''),
});
export type Claim = z.infer<typeof claimSchema>;
export type Outcome = 'won' | 'lost' | 'neutral' | 'pending' | 'unscorable';
export type Candle = { openTime: number; closeTime: number; sourceCloseTime?: number; open: string; high: string; low: string; close: string; hash: string };
export const METHOD = 'directional-open-v1';
export const MIN_SAMPLE = 5;
export function boundaryCandle(candles: Candle[], boundary: number, now: number): Candle | undefined {
  return [...candles].sort((a,b) => a.openTime-b.openTime).find(c => {
    const prices = [c.open,c.high,c.low,c.close];
    return c.openTime >= boundary && c.openTime-boundary <= 60_000 && c.closeTime === c.openTime+60_000
      && c.closeTime <= now && prices.every(p => /^\d+(\.\d+)?$/.test(p) && new Decimal(p).gt(0))
      && new Decimal(c.high).gte(Decimal.max(c.open,c.close,c.low)) && new Decimal(c.low).lte(Decimal.min(c.open,c.close,c.high));
  });
}
export function settle(direction: Claim['direction'], start: number, deadline: number, candles: Candle[], now: number) {
  if (now < deadline+60_000) return { outcome: 'pending' as Outcome, reason: 'Waiting for a finalized exit candle.' };
  const entry = boundaryCandle(candles,start,now), exit = boundaryCandle(candles,deadline,now);
  if (!entry || !exit) return {outcome: 'unscorable' as Outcome, reason: 'Eligible finalized candles are missing. Closest records cannot substitute.'};
  const change = new Decimal(exit.open).div(entry.open).minus(1).times(100);
  const outcome: Outcome = change.isZero() ? 'neutral' : (direction === 'bullish' ? change.gt(0) : change.lt(0)) ? 'won' : 'lost';
  return {outcome, returnPct: change.toFixed(8), entry, exit, reason: 'Finalized 1-minute open prices; first candle at/after each boundary within 60 seconds.'};
}
export function stats(outcomes: string[]) {
  const wins = outcomes.filter(v=>v==='won').length, losses = outcomes.filter(v=>v==='lost').length;
  return { wins, losses, total: wins+losses, excluded: outcomes.length-wins-losses, rate: wins+losses ? new Decimal(wins).div(wins+losses).times(100).toFixed(1) : null };
}
export type History = { id: string; caller: string; asset: string; direction: string; horizon: string; outcome: string; verified: boolean };
export function warning(claim: Pick<History,'caller'|'asset'|'direction'|'horizon'>, history: History[], recalledIds: string[]) {
  const verified = history.filter(h=>h.verified && h.caller===claim.caller && ['won','lost'].includes(h.outcome));
  const baseline = stats(verified.map(h=>h.outcome));
  const relevant = verified.filter(h=>recalledIds.includes(h.id) && h.asset===claim.asset && h.direction===claim.direction && h.horizon===claim.horizon);
  const contextual = stats(relevant.map(h=>h.outcome));
  const priority = contextual.total < MIN_SAMPLE ? (baseline.total ? 'informational' : 'no_history') : Number(contextual.rate) < 40 ? 'caution' : 'informational';
  return {baseline,contextual,priority,citedIds:relevant.map(h=>h.id),minimumSample:MIN_SAMPLE};
}
