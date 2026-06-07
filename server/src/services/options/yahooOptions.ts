import axios from 'axios';
import type { ExpiryImplied, OptionsAdapter, OptionsImplied } from './types';

// Free options data via Yahoo's public options endpoint (the same source the
// `yfinance` python lib wraps). No API key. May rate-limit (429) from some cloud
// IPs — we fail soft and return null so the forecast degrades to "no options".

const UA = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
};

const BASE = 'https://query1.finance.yahoo.com/v7/finance/options';
const TRADING_DAYS = 252;

interface YahooContract {
  strike: number;
  lastPrice?: number;
  bid?: number;
  ask?: number;
  impliedVolatility?: number;
}

function mid(c: YahooContract): number | null {
  if (c.bid != null && c.ask != null && c.bid > 0 && c.ask > 0) return (c.bid + c.ask) / 2;
  if (c.lastPrice != null && c.lastPrice > 0) return c.lastPrice;
  return null;
}

// Closest strike to spot among a contract list.
function atmContract(list: YahooContract[], spot: number): YahooContract | null {
  if (!list?.length) return null;
  return list.reduce((best, c) =>
    Math.abs(c.strike - spot) < Math.abs(best.strike - spot) ? c : best
  );
}

function daysBetween(fromMs: number, toMs: number): number {
  return Math.max(0, Math.round((toMs - fromMs) / 86_400_000));
}

async function fetchExpiry(ticker: string, date?: number): Promise<any | null> {
  try {
    const url = date ? `${BASE}/${encodeURIComponent(ticker)}?date=${date}` : `${BASE}/${encodeURIComponent(ticker)}`;
    const { data } = await axios.get(url, { headers: UA, timeout: 8000 });
    return data?.optionChain?.result?.[0] ?? null;
  } catch (err: any) {
    console.log(`  · yahoo:options ${ticker} ${err?.response?.status || err?.code || 'err'}`);
    return null;
  }
}

function buildExpiry(spot: number, nowMs: number, result: any): ExpiryImplied | null {
  const opt = result?.options?.[0];
  if (!opt) return null;
  const expiryMs = (opt.expirationDate ?? 0) * 1000;
  const calls: YahooContract[] = opt.calls || [];
  const puts: YahooContract[] = opt.puts || [];
  const atmCall = atmContract(calls, spot);
  const atmPut = atmContract(puts, spot);
  if (!atmCall && !atmPut) return null;

  const atmStrike = atmCall?.strike ?? atmPut?.strike ?? spot;
  const ivs = [atmCall?.impliedVolatility, atmPut?.impliedVolatility].filter(
    (v): v is number => typeof v === 'number' && v > 0
  );
  const atmIV = ivs.length ? ivs.reduce((a, b) => a + b, 0) / ivs.length : null;

  const callMid = atmCall ? mid(atmCall) : null;
  const putMid = atmPut ? mid(atmPut) : null;
  const straddle = callMid != null && putMid != null ? callMid + putMid : null;

  const daysToExpiry = daysBetween(nowMs, expiryMs);
  // Prefer the straddle (market's literal priced move); fall back to IV scaling.
  let impliedMovePct: number | null = null;
  let method: 'straddle' | 'iv' = 'straddle';
  if (straddle != null && spot > 0) {
    impliedMovePct = (straddle / spot) * 100;
    method = 'straddle';
  } else if (atmIV != null) {
    impliedMovePct = atmIV * Math.sqrt(Math.max(daysToExpiry, 1) / 365) * 100;
    method = 'iv';
  }

  return {
    expiry: new Date(expiryMs).toISOString().slice(0, 10),
    daysToExpiry,
    atmStrike,
    atmIV,
    straddlePrice: straddle,
    impliedMovePct,
    method,
  };
}

export const yahooOptionsAdapter: OptionsAdapter = {
  name: 'yahoo',
  enabled: () => true, // no key required
  async getImplied(ticker: string): Promise<OptionsImplied | null> {
    const nowMs = Date.now();
    const base = await fetchExpiry(ticker);
    if (!base) return null;
    const spot = base?.quote?.regularMarketPrice;
    if (!spot || spot <= 0) return null;

    const expirationDates: number[] = base?.expirationDates || [];
    // Pick a small, horizon-relevant set: nearest expiry + first expiry >= ~7 days.
    const nearMs = (expirationDates[0] ?? 0) * 1000;
    const wantWeekTs = expirationDates.find((d) => daysBetween(nowMs, d * 1000) >= 7);

    const expiries: ExpiryImplied[] = [];
    const first = buildExpiry(spot, nowMs, base); // base already holds nearest expiry
    if (first) expiries.push(first);
    if (wantWeekTs && wantWeekTs * 1000 !== nearMs) {
      const wk = await fetchExpiry(ticker, wantWeekTs);
      const wkImplied = wk ? buildExpiry(spot, nowMs, wk) : null;
      if (wkImplied) expiries.push(wkImplied);
    }
    if (!expiries.length) return null;

    const frontAtmIV = expiries[0].atmIV;
    const impliedMove1DPct = frontAtmIV != null ? frontAtmIV * Math.sqrt(1 / TRADING_DAYS) * 100 : null;

    return {
      source: 'yahoo',
      spot,
      asOf: new Date(nowMs).toISOString(),
      frontAtmIV,
      impliedMove1DPct,
      ivRank: null, // Yahoo doesn't give historical IV rank
      expiries,
    };
  },
};
