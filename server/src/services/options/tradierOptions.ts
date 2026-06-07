import axios from 'axios';
import type { ExpiryImplied, OptionsAdapter, OptionsImplied } from './types';

// Free options data via Tradier's sandbox (data-center-IP friendly, unlike Yahoo).
// Get a free sandbox token at https://developer.tradier.com → set TRADIER_TOKEN.
// Sandbox market data is delayed ~15 min, which is fine for implied-move sizing.

const TRADING_DAYS = 252;

function client() {
  const base = process.env.TRADIER_BASE || 'https://sandbox.tradier.com/v1';
  const token = process.env.TRADIER_TOKEN || '';
  return axios.create({
    baseURL: base,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    timeout: 9000,
  });
}

function asArray<T>(v: T | T[] | null | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function daysUntil(dateStr: string): number {
  const t = new Date(dateStr + 'T00:00:00Z').getTime();
  return Math.max(0, Math.round((t - Date.now()) / 86_400_000));
}

interface TradierOption {
  strike: number;
  option_type: 'call' | 'put';
  bid?: number;
  ask?: number;
  last?: number;
  greeks?: { mid_iv?: number; smv_vol?: number };
}

function mid(o: TradierOption): number | null {
  if (o.bid != null && o.ask != null && o.bid > 0 && o.ask > 0) return (o.bid + o.ask) / 2;
  if (o.last != null && o.last > 0) return o.last;
  return null;
}

function atm(list: TradierOption[], spot: number): TradierOption | null {
  if (!list.length) return null;
  return list.reduce((best, o) => (Math.abs(o.strike - spot) < Math.abs(best.strike - spot) ? o : best));
}

function ivOf(o: TradierOption | null): number | null {
  const v = o?.greeks?.mid_iv ?? o?.greeks?.smv_vol;
  return typeof v === 'number' && v > 0 ? v : null;
}

async function buildExpiry(api: ReturnType<typeof client>, ticker: string, spot: string | number, expiry: string): Promise<ExpiryImplied | null> {
  const spotN = Number(spot);
  try {
    const { data } = await api.get('/markets/options/chains', {
      params: { symbol: ticker, expiration: expiry, greeks: true },
    });
    const chain = asArray<TradierOption>(data?.options?.option);
    if (!chain.length) return null;
    const calls = chain.filter((o) => o.option_type === 'call');
    const puts = chain.filter((o) => o.option_type === 'put');
    const atmCall = atm(calls, spotN);
    const atmPut = atm(puts, spotN);
    if (!atmCall && !atmPut) return null;

    const ivs = [ivOf(atmCall), ivOf(atmPut)].filter((v): v is number => v != null);
    const atmIV = ivs.length ? ivs.reduce((a, b) => a + b, 0) / ivs.length : null;
    const callMid = atmCall ? mid(atmCall) : null;
    const putMid = atmPut ? mid(atmPut) : null;
    const straddle = callMid != null && putMid != null ? callMid + putMid : null;
    const days = daysUntil(expiry);

    let impliedMovePct: number | null = null;
    let method: 'straddle' | 'iv' = 'straddle';
    if (straddle != null && spotN > 0) {
      impliedMovePct = (straddle / spotN) * 100;
      method = 'straddle';
    } else if (atmIV != null) {
      impliedMovePct = atmIV * Math.sqrt(Math.max(days, 1) / 365) * 100;
      method = 'iv';
    }

    return {
      expiry,
      daysToExpiry: days,
      atmStrike: atmCall?.strike ?? atmPut?.strike ?? spotN,
      atmIV,
      straddlePrice: straddle,
      impliedMovePct,
      method,
    };
  } catch (err: any) {
    console.log(`  · tradier:chain ${ticker} ${expiry} ${err?.response?.status || err?.code || 'err'}`);
    return null;
  }
}

export const tradierOptionsAdapter: OptionsAdapter = {
  name: 'tradier',
  enabled: () => !!process.env.TRADIER_TOKEN,
  async getImplied(ticker: string): Promise<OptionsImplied | null> {
    if (!process.env.TRADIER_TOKEN) return null;
    const api = client();
    try {
      const [quoteRes, expRes] = await Promise.all([
        api.get('/markets/quotes', { params: { symbols: ticker } }),
        api.get('/markets/options/expirations', { params: { symbol: ticker } }),
      ]);
      const q = quoteRes.data?.quotes?.quote;
      const spot = Number(q?.last ?? q?.close);
      if (!spot || spot <= 0) return null;

      const expiries: string[] = asArray<string>(expRes.data?.expirations?.date);
      if (!expiries.length) return null;
      const nearest = expiries[0];
      const week = expiries.find((d) => daysUntil(d) >= 7);

      const chosen = [nearest, ...(week && week !== nearest ? [week] : [])];
      const built = (await Promise.all(chosen.map((e) => buildExpiry(api, ticker, spot, e)))).filter(
        (e): e is ExpiryImplied => e != null
      );
      if (!built.length) return null;

      const frontAtmIV = built[0].atmIV;
      const impliedMove1DPct = frontAtmIV != null ? frontAtmIV * Math.sqrt(1 / TRADING_DAYS) * 100 : null;

      return {
        source: 'tradier',
        spot,
        asOf: new Date().toISOString(),
        frontAtmIV,
        impliedMove1DPct,
        ivRank: null,
        expiries: built,
      };
    } catch (err: any) {
      console.log(`  · tradier:options ${ticker} ${err?.response?.status || err?.code || 'err'}`);
      return null;
    }
  },
};
