import axios from 'axios';
import type { NormalizedBar, NormalizedQuote } from './yahoo';

// Twelve Data — free tier (800 req/day, 8 req/min). Works from cloud IPs that
// Yahoo and Stooq block. Provides both quote and daily history.
//   https://twelvedata.com/  (free signup → API key)

const BASE = 'https://api.twelvedata.com';

function key(): string | null {
  return process.env.TWELVE_DATA_API_KEY || null;
}

function num(v: any): number | undefined {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function twelveDataQuote(ticker: string): Promise<NormalizedQuote | null> {
  const k = key();
  if (!k) return null;
  try {
    const { data } = await axios.get(`${BASE}/quote`, {
      params: { symbol: ticker, apikey: k },
      timeout: 8000,
    });
    if (!data || data.status === 'error' || !data.close) return null;
    const price = num(data.close);
    const prevClose = num(data.previous_close);
    if (price == null) return null;
    return {
      price,
      open: num(data.open),
      high: num(data.high),
      low: num(data.low),
      volume: num(data.volume),
      prevClose,
      change: num(data.change),
      changePct: num(data.percent_change),
      currency: data.currency,
      name: data.name,
      source: 'yahoo', // normalized; client doesn't differentiate beyond 'derived'
      asOf: data.datetime || new Date().toISOString(),
    };
  } catch (err: any) {
    console.warn(`  ✗ twelvedata:quote ${ticker} ${err?.response?.status || err?.code || 'ERR'}`);
    return null;
  }
}

export async function twelveDataHistory(ticker: string, outputsize = 1300): Promise<NormalizedBar[] | null> {
  const k = key();
  if (!k) return null;
  try {
    const { data } = await axios.get(`${BASE}/time_series`, {
      params: { symbol: ticker, interval: '1day', outputsize, apikey: k },
      timeout: 12000,
    });
    if (!data || data.status === 'error' || !Array.isArray(data.values)) {
      if (data?.status === 'error') console.warn(`  ✗ twelvedata:history ${ticker} ${data.message || 'error'}`);
      return null;
    }
    // Twelve Data returns newest-first; reverse to oldest-first for our format.
    const bars: NormalizedBar[] = data.values
      .map((v: any): NormalizedBar | null => {
        const close = num(v.close);
        if (close == null) return null;
        return {
          date: v.datetime,
          open: num(v.open) ?? close,
          high: num(v.high) ?? close,
          low: num(v.low) ?? close,
          close,
          volume: num(v.volume) ?? 0,
        };
      })
      .filter((b: NormalizedBar | null): b is NormalizedBar => b !== null)
      .reverse();
    return bars.length ? bars : null;
  } catch (err: any) {
    console.warn(`  ✗ twelvedata:history ${ticker} ${err?.response?.status || err?.code || 'ERR'}`);
    return null;
  }
}

export type IntradayInterval = '1min' | '5min' | '15min' | '30min' | '1h';

export async function twelveDataIntraday(
  ticker: string,
  interval: IntradayInterval = '5min',
  outputsize = 200
): Promise<NormalizedBar[] | null> {
  const k = key();
  if (!k) return null;
  try {
    const { data } = await axios.get(`${BASE}/time_series`, {
      params: { symbol: ticker, interval, outputsize, apikey: k },
      timeout: 10000,
    });
    if (!data || data.status === 'error' || !Array.isArray(data.values)) {
      if (data?.status === 'error') {
        console.warn(`  ✗ twelvedata:intraday ${ticker} ${data.message || 'error'}`);
      }
      return null;
    }
    const bars: NormalizedBar[] = data.values
      .map((v: any): NormalizedBar | null => {
        const close = num(v.close);
        if (close == null) return null;
        return {
          date: v.datetime,
          open: num(v.open) ?? close,
          high: num(v.high) ?? close,
          low: num(v.low) ?? close,
          close,
          volume: num(v.volume) ?? 0,
        };
      })
      .filter((b: NormalizedBar | null): b is NormalizedBar => b !== null)
      .reverse();
    return bars.length ? bars : null;
  } catch (err: any) {
    console.warn(`  ✗ twelvedata:intraday ${ticker} ${err?.response?.status || err?.code || 'ERR'}`);
    return null;
  }
}

export interface TDProfile {
  name?: string;
  exchange?: string;
  industry?: string;
  sector?: string;
  description?: string;
  website?: string;
  ceo?: string;
  employees?: number;
}

export async function twelveDataProfile(ticker: string): Promise<TDProfile | null> {
  const k = key();
  if (!k) return null;
  try {
    const { data } = await axios.get(`${BASE}/profile`, {
      params: { symbol: ticker, apikey: k },
      timeout: 7000,
    });
    if (!data || data.status === 'error' || !data.name) return null;
    return {
      name: data.name,
      exchange: data.exchange,
      industry: data.industry,
      sector: data.sector,
      description: data.description,
      website: data.website,
      ceo: data.CEO,
      employees: num(data.employees),
    };
  } catch {
    return null;
  }
}
