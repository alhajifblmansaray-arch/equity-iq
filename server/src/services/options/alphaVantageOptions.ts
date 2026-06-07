import axios from 'axios';
import type { ExpiryImplied, OptionsAdapter, OptionsImplied } from './types';

// Free options data via Alpha Vantage HISTORICAL_OPTIONS — works internationally
// and from cloud IPs (no Yahoo-style 429), and you already have the key.
// One request returns the FULL chain (all expiries) with IV + greeks. Free tier
// is end-of-day / previous trading day, which is fine for implied-move sizing.
// Note: free AV keys are limited to 25 requests/day across all AV calls.

const TRADING_DAYS = 252;
const BASE = 'https://www.alphavantage.co/query';

interface AVOption {
  expiration?: string; // YYYY-MM-DD
  strike?: string;
  type?: 'call' | 'put';
  mark?: string;
  last?: string;
  bid?: string;
  ask?: string;
  implied_volatility?: string;
  delta?: string;
}

function num(v?: string): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function markOf(o: AVOption): number | null {
  const m = num(o.mark);
  if (m != null && m > 0) return m;
  const b = num(o.bid);
  const a = num(o.ask);
  if (b != null && a != null && b > 0 && a > 0) return (a + b) / 2;
  const l = num(o.last);
  if (l != null && l > 0) return l;
  return null;
}

function daysUntil(dateStr: string): number {
  const t = new Date(dateStr + 'T00:00:00Z').getTime();
  return Math.max(0, Math.round((t - Date.now()) / 86_400_000));
}

export const alphaVantageOptionsAdapter: OptionsAdapter = {
  name: 'alphavantage',
  enabled: () => !!process.env.ALPHA_VANTAGE_API_KEY,
  async getImplied(ticker: string): Promise<OptionsImplied | null> {
    const apikey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apikey) return null;
    try {
      const { data } = await axios.get(BASE, {
        params: { function: 'HISTORICAL_OPTIONS', symbol: ticker, apikey },
        timeout: 12000,
      });
      const rows: AVOption[] = data?.data || [];
      if (!rows.length) {
        // Rate-limit / note lands in data.Information or data.Note
        const msg = data?.Information || data?.Note;
        if (msg) console.log(`  · alphavantage:options ${ticker} ${String(msg).slice(0, 60)}`);
        return null;
      }

      // Group contracts by expiration.
      const byExp = new Map<string, AVOption[]>();
      for (const r of rows) {
        if (!r.expiration || !r.type) continue;
        const arr = byExp.get(r.expiration) || [];
        arr.push(r);
        byExp.set(r.expiration, arr);
      }
      const expDates = [...byExp.keys()].sort();
      if (!expDates.length) return null;
      const nearest = expDates[0];
      const week = expDates.find((d) => daysUntil(d) >= 7);
      const chosen = [nearest, ...(week && week !== nearest ? [week] : [])];

      let spot = 0;
      const built: ExpiryImplied[] = [];
      for (const exp of chosen) {
        const list = byExp.get(exp) || [];
        const calls = list.filter((o) => o.type === 'call');
        const puts = list.filter((o) => o.type === 'put');
        if (!calls.length || !puts.length) continue;

        // ATM call = delta closest to 0.5 (no external spot needed).
        let atmCall = calls[0];
        let bestDiff = Infinity;
        for (const c of calls) {
          const d = num(c.delta);
          if (d == null) continue;
          const diff = Math.abs(d - 0.5);
          if (diff < bestDiff) {
            bestDiff = diff;
            atmCall = c;
          }
        }
        const strike = num(atmCall.strike);
        if (strike == null) continue;
        // Put at the same (closest) strike.
        const atmPut = puts.reduce((best, p) =>
          Math.abs((num(p.strike) ?? 0) - strike) < Math.abs((num(best.strike) ?? 0) - strike) ? p : best
        );

        const callMark = markOf(atmCall);
        const putMark = atmPut ? markOf(atmPut) : null;
        const ivs = [num(atmCall.implied_volatility), atmPut ? num(atmPut.implied_volatility) : null].filter(
          (v): v is number => v != null && v > 0
        );
        const atmIV = ivs.length ? ivs.reduce((a, b) => a + b, 0) / ivs.length : null;
        const straddle = callMark != null && putMark != null ? callMark + putMark : null;
        // Spot via put-call parity: S ≈ K + C − P (rates/divs ignored — fine for sizing).
        const spotEst = callMark != null && putMark != null ? strike + callMark - putMark : strike;
        if (!spot && spotEst > 0) spot = spotEst;

        const days = daysUntil(exp);
        let impliedMovePct: number | null = null;
        let method: 'straddle' | 'iv' = 'straddle';
        if (straddle != null && spotEst > 0) {
          impliedMovePct = (straddle / spotEst) * 100;
          method = 'straddle';
        } else if (atmIV != null) {
          impliedMovePct = atmIV * Math.sqrt(Math.max(days, 1) / 365) * 100;
          method = 'iv';
        }

        built.push({
          expiry: exp,
          daysToExpiry: days,
          atmStrike: strike,
          atmIV,
          straddlePrice: straddle,
          impliedMovePct,
          method,
        });
      }
      if (!built.length || spot <= 0) return null;

      const frontAtmIV = built[0].atmIV;
      const impliedMove1DPct = frontAtmIV != null ? frontAtmIV * Math.sqrt(1 / TRADING_DAYS) * 100 : null;

      return {
        source: 'alphavantage',
        spot,
        asOf: new Date().toISOString(),
        frontAtmIV,
        impliedMove1DPct,
        ivRank: null,
        expiries: built,
      };
    } catch (err: any) {
      console.log(`  · alphavantage:options ${ticker} ${err?.response?.status || err?.code || 'err'}`);
      return null;
    }
  },
};
