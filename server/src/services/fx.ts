/**
 * USD↔CAD spot rate, cached for an hour.
 *
 * Portfolio values arrive in whichever currency the brokerage reports, so every
 * total has to be normalised before it can be summed. Falls back through a few
 * free sources; if all of them are down we return null so callers can decline to
 * invent a number rather than silently mixing currencies.
 */
import { twelveDataQuote } from './twelveData';

const TTL = 60 * 60 * 1000; // 1 hour
let cache: { at: number; usdToCad: number } | null = null;

async function fetchFromExchangerate(): Promise<number | null> {
  try {
    const res = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=CAD');
    if (!res.ok) return null;
    const json = (await res.json()) as { rates?: { CAD?: number } };
    const rate = json?.rates?.CAD;
    return typeof rate === 'number' && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}

async function fetchFromFrankfurter(): Promise<number | null> {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=CAD');
    if (!res.ok) return null;
    const json = (await res.json()) as { rates?: { CAD?: number } };
    const rate = json?.rates?.CAD;
    return typeof rate === 'number' && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}

async function fetchFromTwelveData(): Promise<number | null> {
  try {
    const q = await twelveDataQuote('USD/CAD');
    return q?.price && q.price > 0 ? q.price : null;
  } catch {
    return null;
  }
}

/** USD → CAD multiplier, or null when every source is unavailable. */
export async function usdToCad(): Promise<number | null> {
  if (cache && Date.now() - cache.at < TTL) return cache.usdToCad;

  const rate =
    (await fetchFromFrankfurter()) ?? (await fetchFromExchangerate()) ?? (await fetchFromTwelveData());

  if (rate == null) {
    // Prefer a stale rate over none at all — an hour-old rate beats a wrong total.
    return cache?.usdToCad ?? null;
  }

  cache = { at: Date.now(), usdToCad: rate };
  return rate;
}

export type Currency = 'CAD' | 'USD';

/** Converts an amount between CAD and USD. Returns null when no rate is available. */
export function convert(amount: number, from: Currency, to: Currency, rateUsdToCad: number | null): number | null {
  if (from === to) return amount;
  if (rateUsdToCad == null) return null;
  return from === 'USD' ? amount * rateUsdToCad : amount / rateUsdToCad;
}
