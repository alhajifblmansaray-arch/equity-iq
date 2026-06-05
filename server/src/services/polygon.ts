import axios from 'axios';

// Polygon.io options snapshot — free tier gives us a starter slice (~250
// contracts/page, rate-limited to 5/min). We aggregate to a put/call
// snapshot. Full "unusual whales" large-block detection is paywalled
// everywhere reputable, so we keep this scoped.

const BASE = 'https://api.polygon.io';

function key(): string | null {
  return process.env.POLYGON_API_KEY || null;
}

export interface OptionsFlow {
  source: 'polygon';
  putCallRatioOI: number | null;       // total put OI / total call OI
  putCallRatioVol: number | null;      // total put volume / total call volume today
  totalOpenInterest: { calls: number; puts: number };
  totalVolume: { calls: number; puts: number };
  avgImpliedVol: number | null;        // simple mean across the snapshot slice
  topOI: Array<{
    type: 'call' | 'put';
    strike: number;
    expiry: string;
    openInterest: number;
    volume: number;
    impliedVol?: number;
  }>;
  sampleSize: number; // how many contracts were aggregated
}

const cache = new Map<string, { value: OptionsFlow | null; expires: number }>();
const TTL = 5 * 60_000;

export async function polygonOptionsFlow(ticker: string): Promise<OptionsFlow | null> {
  const k = key();
  if (!k) return null;
  const t = ticker.toUpperCase();
  const hit = cache.get(t);
  if (hit && hit.expires > Date.now()) return hit.value;
  try {
    const { data } = await axios.get(`${BASE}/v3/snapshot/options/${t}`, {
      params: { apiKey: k, limit: 250 },
      timeout: 12000,
    });
    const results = data?.results;
    if (!Array.isArray(results) || results.length === 0) {
      cache.set(t, { value: null, expires: Date.now() + 30_000 });
      return null;
    }
    let callOI = 0;
    let putOI = 0;
    let callVol = 0;
    let putVol = 0;
    let ivSum = 0;
    let ivCount = 0;
    const all: OptionsFlow['topOI'] = [];
    for (const r of results) {
      const type = r?.details?.contract_type as 'call' | 'put' | undefined;
      const strike = Number(r?.details?.strike_price);
      const expiry = r?.details?.expiration_date;
      const oi = Number(r?.open_interest ?? 0);
      const vol = Number(r?.day?.volume ?? 0);
      const iv = Number(r?.implied_volatility ?? 0) || undefined;
      if (!type || !Number.isFinite(strike)) continue;
      if (type === 'call') {
        callOI += oi;
        callVol += vol;
      } else if (type === 'put') {
        putOI += oi;
        putVol += vol;
      }
      if (iv != null && Number.isFinite(iv) && iv > 0 && iv < 5) {
        ivSum += iv;
        ivCount++;
      }
      all.push({ type, strike, expiry, openInterest: oi, volume: vol, impliedVol: iv });
    }
    const topOI = all.sort((a, b) => b.openInterest - a.openInterest).slice(0, 6);
    const value: OptionsFlow = {
      source: 'polygon',
      putCallRatioOI: callOI > 0 ? putOI / callOI : null,
      putCallRatioVol: callVol > 0 ? putVol / callVol : null,
      totalOpenInterest: { calls: callOI, puts: putOI },
      totalVolume: { calls: callVol, puts: putVol },
      avgImpliedVol: ivCount > 0 ? ivSum / ivCount : null,
      topOI,
      sampleSize: results.length,
    };
    cache.set(t, { value, expires: Date.now() + TTL });
    return value;
  } catch (err: any) {
    console.warn(`  ✗ polygon:options ${t} ${err?.response?.status || err?.code || 'ERR'}`);
    cache.set(t, { value: null, expires: Date.now() + 30_000 });
    return null;
  }
}
