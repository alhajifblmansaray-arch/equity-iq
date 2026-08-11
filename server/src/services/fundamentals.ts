/**
 * Per-ticker fundamentals, merged from the providers that are actually live.
 *
 * Finnhub's basic-financials endpoint is the primary source: 60 requests a
 * minute, and it covers ratios for most of a normal book. Alpha Vantage fills
 * the gaps it cannot (analyst target price, sector labels) but is strictly
 * secondary, because its free tier allows only 25 requests a day - a 15-holding
 * portfolio would exhaust that in a single refresh.
 *
 * Results are cached in memory and in the database, so a restart or a cold start
 * does not re-spend either budget.
 */
import { finnhubProfile, finnhubEarnings, finnhubMetrics } from './finnhub';
import { alphaVantageOverview } from './alphaVantage';
import FundamentalsCache from '../models/Fundamentals';

export interface Fundamentals {
  ticker: string;
  name: string | null;
  sector: string | null;
  industry: string | null;
  logo: string | null;
  marketCap: number | null;
  peRatio: number | null;
  forwardPE: number | null;
  pegRatio: number | null;
  priceToBook: number | null;
  priceToSales: number | null;
  evToEbitda: number | null;
  dividendYield: number | null;   // fraction, e.g. 0.0034
  eps: number | null;
  beta: number | null;
  profitMargin: number | null;
  operatingMargin: number | null;
  returnOnEquity: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  analystTargetPrice: number | null;
  nextEarnings: { date: string; estimate: number | null } | null;
}

const TTL = 12 * 60 * 60 * 1000;      // a good result holds for 12 hours
const EMPTY_TTL = 20 * 60 * 1000;      // a throttled one is retried in 20 minutes
const cache = new Map<string, { at: number; ttl: number; value: Fundamentals }>();

/** Title-cases the SHOUTED sector/industry strings Alpha Vantage returns. */
function tidy(s: unknown): string | null {
  if (typeof s !== 'string' || !s.trim()) return null;
  return s.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function num(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

export async function getFundamentals(ticker: string): Promise<Fundamentals> {
  const key = ticker.toUpperCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.value;

  // Survives restarts, so a cold start does not re-spend the daily quota.
  try {
    const stored = await FundamentalsCache.findOne({ ticker: key });
    if (stored) {
      const age = Date.now() - stored.fetchedAt.getTime();
      if (age < (stored.complete ? TTL : EMPTY_TTL)) {
        const value = stored.data as unknown as Fundamentals;
        cache.set(key, { at: Date.now() - age, ttl: stored.complete ? TTL : EMPTY_TTL, value });
        return value;
      }
    }
  } catch { /* fall through to the providers */ }

  // Providers are independent; one being down must not blank the others.
  const [profile, metrics, earnings] = await Promise.all([
    finnhubProfile(key).catch(() => null),
    finnhubMetrics(key).catch(() => null),
    finnhubEarnings(key).catch(() => null),
  ]);

  // Only reach for Alpha Vantage when Finnhub left the ratios empty, so the
  // daily allowance is spent on tickers that actually need it.
  const needsFallback = !metrics?.beta && !metrics?.peRatio;
  const overview = needsFallback ? await alphaVantageOverview(key).catch(() => null) : null;

  const o = (overview ?? {}) as Record<string, unknown>;
  const p = (profile ?? {}) as Record<string, unknown>;
  const f = metrics ?? {};

  // Finnhub returns the next scheduled report first; keep only future dates.
  const upcoming = (Array.isArray(earnings) ? earnings : [])
    .filter((e: any) => e?.date && new Date(e.date).getTime() > Date.now())
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const value: Fundamentals = {
    ticker: key,
    name: (p.name as string) ?? null,
    sector: tidy(o.sector) ?? tidy(p.industry),
    industry: tidy(o.industry) ?? tidy(p.industry),
    logo: (p.logo as string) ?? null,
    marketCap: f.marketCap ?? num(o.marketCap) ?? (num(p.marketCap) != null ? num(p.marketCap)! * 1_000_000 : null),
    peRatio: f.peRatio ?? num(o.peRatio),
    forwardPE: f.forwardPE ?? num(o.forwardPE),
    pegRatio: num(o.pegRatio),
    priceToBook: f.priceToBook ?? num(o.priceToBook),
    priceToSales: f.priceToSales ?? num(o.priceToSales),
    evToEbitda: num(o.evToEbitda),
    dividendYield: f.dividendYield ?? num(o.dividendYield),
    eps: f.eps ?? num(o.eps),
    beta: f.beta ?? num(o.beta),
    profitMargin: f.profitMargin ?? num(o.profitMargin),
    operatingMargin: f.operatingMargin ?? num(o.operatingMargin),
    returnOnEquity: f.returnOnEquity ?? num(o.returnOnEquity),
    fiftyTwoWeekHigh: f.fiftyTwoWeekHigh ?? num(o.fiftyTwoWeekHigh),
    fiftyTwoWeekLow: f.fiftyTwoWeekLow ?? num(o.fiftyTwoWeekLow),
    analystTargetPrice: num(o.analystTargetPrice),
    nextEarnings: upcoming ? { date: upcoming.date, estimate: num(upcoming.estimate) } : null,
  };

  // A throttled provider yields a row with a sector but no ratios. Caching that
  // for 12 hours would freeze the gap in place, so it expires quickly instead.
  const gotRatios = value.beta != null || value.peRatio != null || value.dividendYield != null;
  cache.set(key, { at: Date.now(), ttl: gotRatios ? TTL : EMPTY_TTL, value });

  // Never overwrite a complete row with a throttled one.
  try {
    const existing = await FundamentalsCache.findOne({ ticker: key });
    if (!existing?.complete || gotRatios) {
      await FundamentalsCache.updateOne(
        { ticker: key },
        { $set: { ticker: key, data: value, complete: gotRatios, fetchedAt: new Date() } },
        { upsert: true }
      );
    }
  } catch { /* cache write is best effort */ }

  return value;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Everything already cached, with no network calls at all. */
function cached(tickers: string[]): Map<string, Fundamentals> {
  const out = new Map<string, Fundamentals>();
  for (const t of tickers.map((x) => x.toUpperCase())) {
    const hit = cache.get(t);
    if (hit && Date.now() - hit.at < hit.ttl) out.set(t, hit.value);
  }
  return out;
}

/**
 * Fundamentals for many tickers, enriched progressively.
 *
 * Alpha Vantage's free tier caps at one request per second and answers a burst
 * with a throttle notice rather than data, so uncached tickers are fetched
 * strictly one at a time with a pause between them. Only `budget` of them are
 * fetched per call, keeping any single request short; the rest arrive on the
 * next load once these are cached. `pending` reports how many are still missing
 * so the caller can say so instead of showing blanks as though they were zeros.
 */
export async function getFundamentalsBatch(
  tickers: string[],
  budget = 12
): Promise<{ data: Map<string, Fundamentals>; pending: number }> {
  const unique = [...new Set(tickers.map((t) => t.toUpperCase()))];
  const data = cached(unique);

  // Pull anything still fresh in the database in one query before deciding what
  // actually needs a provider call.
  const notInMemory = unique.filter((t) => !data.has(t));
  if (notInMemory.length) {
    try {
      const stored = await FundamentalsCache.find({ ticker: { $in: notInMemory } });
      for (const row of stored) {
        const age = Date.now() - row.fetchedAt.getTime();
        const ttl = row.complete ? TTL : EMPTY_TTL;
        if (age < ttl) {
          const value = row.data as unknown as Fundamentals;
          cache.set(row.ticker, { at: Date.now() - age, ttl, value });
          data.set(row.ticker, value);
        }
      }
    } catch { /* proceed without the store */ }
  }

  const missing = unique.filter((t) => !data.has(t));

  for (const t of missing.slice(0, budget)) {
    try { data.set(t, await getFundamentals(t)); } catch { /* leave it for next time */ }
    await sleep(250); // Finnhub allows 60/min; this stays comfortably inside it
  }

  return { data, pending: Math.max(0, missing.length - budget) };
}
