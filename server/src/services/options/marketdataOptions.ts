import axios from 'axios';
import type { ExpiryImplied, OptionsAdapter, OptionsImplied } from './types';

// Free options data via marketdata.app — works internationally (no brokerage
// account), reliable from cloud IPs, and returns IV + the underlying price
// directly. Free tier ~100 requests/day. Get a token at https://marketdata.app
// → set MARKETDATA_TOKEN.

const TRADING_DAYS = 252;
const BASE = 'https://api.marketdata.app/v1/options';

function cfg() {
  return {
    headers: { Authorization: `Bearer ${process.env.MARKETDATA_TOKEN || ''}` },
    timeout: 10_000,
  };
}

function daysUntil(dateStr: string): number {
  const t = new Date(dateStr + 'T00:00:00Z').getTime();
  return Math.max(0, Math.round((t - Date.now()) / 86_400_000));
}

interface Row {
  side: string;
  strike: number;
  mid: number | null;
  bid: number | null;
  ask: number | null;
  iv: number | null;
  delta: number | null;
}

// marketdata.app returns columnar arrays; zip them into row objects.
function zip(data: any): Row[] {
  const strikes: number[] = data?.strike || [];
  const rows: Row[] = [];
  for (let i = 0; i < strikes.length; i++) {
    rows.push({
      side: data.side?.[i],
      strike: data.strike?.[i],
      mid: data.mid?.[i] ?? null,
      bid: data.bid?.[i] ?? null,
      ask: data.ask?.[i] ?? null,
      iv: data.iv?.[i] ?? null,
      delta: data.delta?.[i] ?? null,
    });
  }
  return rows;
}

function midOf(r: Row): number | null {
  if (r.mid != null && r.mid > 0) return r.mid;
  if (r.bid != null && r.ask != null && r.bid > 0 && r.ask > 0) return (r.bid + r.ask) / 2;
  return null;
}

function atm(list: Row[], spot: number): Row | null {
  if (!list.length) return null;
  return list.reduce((best, r) => (Math.abs(r.strike - spot) < Math.abs(best.strike - spot) ? r : best));
}

async function buildExpiry(ticker: string, expiry: string): Promise<{ exp: ExpiryImplied; spot: number } | null> {
  try {
    const { data } = await axios.get(`${BASE}/chain/${encodeURIComponent(ticker)}/`, {
      ...cfg(),
      params: { expiration: expiry },
    });
    if (data?.s !== 'ok') return null;
    const spot = Number(data?.underlyingPrice?.[0]);
    if (!spot || spot <= 0) return null;

    const rows = zip(data);
    const calls = rows.filter((r) => r.side === 'call');
    const puts = rows.filter((r) => r.side === 'put');
    const atmCall = atm(calls, spot);
    const atmPut = atm(puts, spot);
    if (!atmCall && !atmPut) return null;

    const strike = atmCall?.strike ?? atmPut?.strike ?? spot;
    const ivs = [atmCall?.iv, atmPut?.iv].filter((v): v is number => typeof v === 'number' && v > 0);
    const atmIV = ivs.length ? ivs.reduce((a, b) => a + b, 0) / ivs.length : null;
    const callMid = atmCall ? midOf(atmCall) : null;
    const putMid = atmPut ? midOf(atmPut) : null;
    const straddle = callMid != null && putMid != null ? callMid + putMid : null;
    const days = daysUntil(expiry);

    let impliedMovePct: number | null = null;
    let method: 'straddle' | 'iv' = 'straddle';
    if (straddle != null && spot > 0) {
      impliedMovePct = (straddle / spot) * 100;
      method = 'straddle';
    } else if (atmIV != null) {
      impliedMovePct = atmIV * Math.sqrt(Math.max(days, 1) / 365) * 100;
      method = 'iv';
    }

    return {
      spot,
      exp: { expiry, daysToExpiry: days, atmStrike: strike, atmIV, straddlePrice: straddle, impliedMovePct, method },
    };
  } catch (err: any) {
    console.log(`  · marketdata:chain ${ticker} ${expiry} ${err?.response?.status || err?.code || 'err'}`);
    return null;
  }
}

export const marketdataOptionsAdapter: OptionsAdapter = {
  name: 'marketdata',
  enabled: () => !!process.env.MARKETDATA_TOKEN,
  async getImplied(ticker: string): Promise<OptionsImplied | null> {
    if (!process.env.MARKETDATA_TOKEN) return null;
    try {
      const { data } = await axios.get(`${BASE}/expirations/${encodeURIComponent(ticker)}/`, cfg());
      const expiries: string[] = data?.expirations || [];
      if (!expiries.length) return null;
      const nearest = expiries[0];
      const week = expiries.find((d) => daysUntil(d) >= 7);
      const chosen = [nearest, ...(week && week !== nearest ? [week] : [])];

      const results = (await Promise.all(chosen.map((e) => buildExpiry(ticker, e)))).filter(
        (r): r is { exp: ExpiryImplied; spot: number } => r != null
      );
      if (!results.length) return null;

      const spot = results[0].spot;
      const builtExpiries = results.map((r) => r.exp);
      const frontAtmIV = builtExpiries[0].atmIV;
      const impliedMove1DPct = frontAtmIV != null ? frontAtmIV * Math.sqrt(1 / TRADING_DAYS) * 100 : null;

      return {
        source: 'marketdata',
        spot,
        asOf: new Date().toISOString(),
        frontAtmIV,
        impliedMove1DPct,
        ivRank: null,
        expiries: builtExpiries,
      };
    } catch (err: any) {
      console.log(`  · marketdata:options ${ticker} ${err?.response?.status || err?.code || 'err'}`);
      return null;
    }
  },
};
