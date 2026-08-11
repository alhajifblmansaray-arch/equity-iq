import axios from 'axios';
import { NormalizedNews, NormalizedQuote } from './yahoo';

const BASE = 'https://finnhub.io/api/v1';

function key(): string | null {
  return process.env.FINNHUB_API_KEY || null;
}

export async function finnhubQuote(ticker: string): Promise<NormalizedQuote | null> {
  const k = key();
  if (!k) return null;
  try {
    const { data } = await axios.get(`${BASE}/quote`, {
      params: { symbol: ticker, token: k },
      timeout: 6000,
    });
    if (!data || typeof data.c !== 'number' || data.c === 0) return null;
    return {
      price: data.c,
      open: data.o,
      high: data.h,
      low: data.l,
      prevClose: data.pc,
      change: data.d,
      changePct: data.dp,
      source: 'finnhub',
      asOf: data.t ? new Date(data.t * 1000).toISOString() : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function finnhubNews(ticker: string, limit = 25, daysBack = 30): Promise<NormalizedNews[] | null> {
  const k = key();
  if (!k) return null;
  try {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - daysBack);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const { data } = await axios.get(`${BASE}/company-news`, {
      params: { symbol: ticker, from: fmt(from), to: fmt(to), token: k },
      timeout: 8000,
    });
    if (!Array.isArray(data)) {
      console.warn(`  ✗ finnhub:news ${ticker} non-array response (${data?.error || typeof data})`);
      return null;
    }
    if (data.length === 0) {
      console.warn(`  · finnhub:news ${ticker} empty (window ${fmt(from)}…${fmt(to)})`);
      return [];
    }
    return data.slice(0, limit).map((n: any): NormalizedNews => ({
      id: String(n.id),
      title: n.headline,
      description: n.summary,
      url: n.url,
      publisher: n.source,
      publishedAt: new Date(n.datetime * 1000).toISOString(),
      imageUrl: n.image,
    }));
  } catch (err: any) {
    console.warn(`  ✗ finnhub:news ${ticker} ${err?.response?.status || err?.code || 'ERR'}`);
    return null;
  }
}

// General market news (no ticker; for News page side rail / fallback)
export async function finnhubMarketNews(limit = 10): Promise<NormalizedNews[] | null> {
  const k = key();
  if (!k) return null;
  try {
    const { data } = await axios.get(`${BASE}/news`, {
      params: { category: 'general', token: k },
      timeout: 8000,
    });
    if (!Array.isArray(data)) return null;
    return data.slice(0, limit).map((n: any): NormalizedNews => ({
      id: String(n.id),
      title: n.headline,
      description: n.summary,
      url: n.url,
      publisher: n.source,
      publishedAt: new Date(n.datetime * 1000).toISOString(),
      imageUrl: n.image,
    }));
  } catch (err: any) {
    console.warn(`  ✗ finnhub:market-news ${err?.response?.status || err?.code || 'ERR'}`);
    return null;
  }
}

export interface CompanyProfile {
  name?: string;
  industry?: string;
  exchange?: string;
  marketCap?: number;
  logo?: string;
  weburl?: string;
  ipo?: string;
  shareOutstanding?: number;
}

export async function finnhubProfile(ticker: string): Promise<CompanyProfile | null> {
  const k = key();
  if (!k) return null;
  try {
    const { data } = await axios.get(`${BASE}/stock/profile2`, {
      params: { symbol: ticker, token: k },
      timeout: 6000,
    });
    if (!data || !data.name) return null;
    return {
      name: data.name,
      industry: data.finnhubIndustry,
      exchange: data.exchange,
      marketCap: data.marketCapitalization,
      logo: data.logo,
      weburl: data.weburl,
      ipo: data.ipo,
      shareOutstanding: data.shareOutstanding,
    };
  } catch {
    return null;
  }
}

export interface EarningsEvent {
  date: string;       // YYYY-MM-DD
  symbol: string;
  estimate?: number;
  actual?: number;
  hour?: 'bmo' | 'amc' | 'dmh' | string;
  quarter?: number;
  year?: number;
  revenueEstimate?: number;
  revenueActual?: number;
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function finnhubEarnings(ticker: string, daysAhead = 365, daysBack = 30): Promise<EarningsEvent[] | null> {
  const k = key();
  if (!k) return null;
  try {
    const from = new Date();
    from.setDate(from.getDate() - daysBack);
    const to = new Date();
    to.setDate(to.getDate() + daysAhead);
    const { data } = await axios.get(`${BASE}/calendar/earnings`, {
      params: { symbol: ticker, from: fmtDate(from), to: fmtDate(to), token: k },
      timeout: 8000,
    });
    const arr = data?.earningsCalendar;
    if (!Array.isArray(arr)) return null;
    return arr.map((e: any): EarningsEvent => ({
      date: e.date,
      symbol: e.symbol,
      estimate: e.epsEstimate ?? undefined,
      actual: e.epsActual ?? undefined,
      hour: e.hour,
      quarter: e.quarter,
      year: e.year,
      revenueEstimate: e.revenueEstimate ?? undefined,
      revenueActual: e.revenueActual ?? undefined,
    }));
  } catch (err: any) {
    console.warn(`  ✗ finnhub:earnings ${ticker} ${err?.response?.status || err?.code || 'ERR'}`);
    return null;
  }
}

export async function finnhubMarketEarnings(daysAhead = 14): Promise<EarningsEvent[] | null> {
  const k = key();
  if (!k) return null;
  try {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + daysAhead);
    const { data } = await axios.get(`${BASE}/calendar/earnings`, {
      params: { from: fmtDate(from), to: fmtDate(to), token: k },
      timeout: 9000,
    });
    const arr = data?.earningsCalendar;
    if (!Array.isArray(arr)) return null;
    return arr.map((e: any): EarningsEvent => ({
      date: e.date,
      symbol: e.symbol,
      estimate: e.epsEstimate ?? undefined,
      actual: e.epsActual ?? undefined,
      hour: e.hour,
      quarter: e.quarter,
      year: e.year,
      revenueEstimate: e.revenueEstimate ?? undefined,
      revenueActual: e.revenueActual ?? undefined,
    }));
  } catch (err: any) {
    console.warn(`  ✗ finnhub:market-earnings ${err?.response?.status || err?.code || 'ERR'}`);
    return null;
  }
}

export interface FinnhubMetrics {
  beta?: number;
  peRatio?: number;
  forwardPE?: number;
  priceToBook?: number;
  priceToSales?: number;
  eps?: number;
  dividendYield?: number;      // fraction, to match the other providers
  profitMargin?: number;
  operatingMargin?: number;
  returnOnEquity?: number;
  marketCap?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
}

/**
 * Basic financials, the free tier's fundamentals endpoint.
 *
 * Preferred over Alpha Vantage for ratios: it allows 60 requests a minute rather
 * than 25 a day, and covers more of a typical book. Percentages come back as
 * whole numbers here (17.44 meaning 17.44%), so they are divided to match the
 * fraction convention used elsewhere.
 */
export async function finnhubMetrics(ticker: string): Promise<FinnhubMetrics | null> {
  const k = key();
  if (!k) return null;
  try {
    const { data } = await axios.get(`${BASE}/stock/metric`, {
      params: { symbol: ticker, metric: 'all', token: k },
      timeout: 8000,
    });
    const m = data?.metric;
    if (!m || typeof m !== 'object') return null;

    const n = (v: unknown): number | undefined =>
      typeof v === 'number' && Number.isFinite(v) && v !== 0 ? v : undefined;
    const asFraction = (v: unknown): number | undefined => {
      const x = n(v);
      return x == null ? undefined : x / 100;
    };

    return {
      beta: n(m.beta),
      peRatio: n(m.peTTM) ?? n(m.peNormalizedAnnual),
      forwardPE: n(m.peNormalizedAnnual),
      priceToBook: n(m.pbAnnual) ?? n(m.pbQuarterly),
      priceToSales: n(m.psTTM) ?? n(m.psAnnual),
      eps: n(m.epsTTM) ?? n(m.epsAnnual),
      dividendYield: asFraction(m.dividendYieldIndicatedAnnual),
      profitMargin: asFraction(m.netProfitMarginTTM),
      operatingMargin: asFraction(m.operatingMarginTTM),
      returnOnEquity: asFraction(m.roeTTM),
      // Reported in millions.
      marketCap: n(m.marketCapitalization) != null ? n(m.marketCapitalization)! * 1_000_000 : undefined,
      fiftyTwoWeekHigh: n(m['52WeekHigh']),
      fiftyTwoWeekLow: n(m['52WeekLow']),
    };
  } catch {
    return null;
  }
}
