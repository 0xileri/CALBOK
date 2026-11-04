/** First eligible minute must never open before a locked boundary. */
export function exitCandleFinalizedAt(deadline:number){return Math.ceil(deadline/60_000)*60_000+60_000;}
