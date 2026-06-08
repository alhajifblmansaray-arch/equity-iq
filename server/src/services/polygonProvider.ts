import axios from 'axios';
import type { NormalizedBar, NormalizedNews, NormalizedQuote } from './yahoo';

// Polygon.io data provider — single source of truth when paid.
// Free tier:  aggregates (history), reference/profile, news, options snapshot.
// Starter ($29): financials/fundamentals, unlimited calls.
// Developer ($79): real-time snapshot + WebSocket.
// Options add-on ($29): full chain IV/greeks (handled in polygonOptionsAdapter.ts).

const BASE = 'https://api.polygon.io';
const CACHE_TTL = 5 * 60_000;

function key(): string | null {
  return process.env.POLYGON_API_KEY || null;
}

function get(path: string, params: Record<string, any> = {}) {
  const k = key();
  if (!k) return Promise.reject(new Error('No POLYGON_API_KEY'));
  return axios.get(`${BASE}${path}`, {
    params: { apiKey: k, ...params },
    timeout: 12_000,
  });
}

// ---- simple in-process cache ----
const cache = new Map<string, { value: any; expires: number }>();
function fromCache<T>(cacheKey: string): T | null {
  const hit = cache.get(cacheKey);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  return null;
}
function toCache(cacheKey: string, value: any, ttl = CACHE_TTL) {
  cache.set(cacheKey, { value, expires: Date.now() + ttl });
}

// ---- Quote (Developer tier: real-time; free tier: returns null) ----
export interface PolygonQuote extends NormalizedQuote {}

export async function polygonQuote(ticker: string): Promise<PolygonQuote | null> {
  const ck = `quote:${ticker}`;
  const cached = fromCache<PolygonQuote>(ck);
  if (cached) return cached;
  try {
    const { data } = await get(`/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}`);
    const t = data?.ticker;
    if (!t) return null;
    const price = t.lastTrade?.p ?? t.min?.c ?? t.day?.c;
    if (!price) return null;
    const result: PolygonQuote = {
      price,
      open: t.day?.o,
      high: t.day?.h,
      low: t.day?.l,
      volume: t.day?.v,
      vwap: t.day?.vw,
      prevClose: t.prevDay?.c,
      change: t.todaysChange,
      changePct: t.todaysChangePerc,
      source: 'polygon',
      asOf: new Date().toISOString(),
    };
    toCache(ck, result, 60_000);
    return result;
  } catch (err: any) {
    console.warn(`  ✗ polygon:quote ${ticker} ${err?.response?.status || err?.code || 'ERR'}`);
    return null;
  }
}

// ---- Price history (free tier: daily aggregates) ----
export async function polygonHistory(ticker: string, days = 200): Promise<NormalizedBar[] | null> {
  const ck = `history:${ticker}:${days}`;
  const cached = fromCache<NormalizedBar[]>(ck);
  if (cached) return cached;
  try {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - days * 1.5 * 86_400_000).toISOString().slice(0, 10);
    const { data } = await get(`/v2/aggs/ticker/${ticker}/range/1/day/${from}/${to}`, {
      adjusted: true,
      sort: 'asc',
      limit: days,
    });
    const results: any[] = data?.results || [];
    if (!results.length) return null;
    const bars: NormalizedBar[] = results.map((r) => ({
      date: new Date(r.t).toISOString().slice(0, 10),
      open: r.o,
      high: r.h,
      low: r.l,
      close: r.c,
      volume: r.v,
    }));
    toCache(ck, bars);
    return bars;
  } catch (err: any) {
    console.warn(`  ✗ polygon:history ${ticker} ${err?.response?.status || err?.code || 'ERR'}`);
    return null;
  }
}

// ---- Intraday bars (free tier: previous day only; Developer: today) ----
export async function polygonIntraday(ticker: string, multiplier = 5, span = 'minute'): Promise<NormalizedBar[] | null> {
  const ck = `intraday:${ticker}:${multiplier}:${span}`;
  const cached = fromCache<NormalizedBar[]>(ck);
  if (cached) return cached;
  try {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10);
    const { data } = await get(`/v2/aggs/ticker/${ticker}/range/${multiplier}/${span}/${from}/${to}`, {
      adjusted: true,
      sort: 'asc',
      limit: 500,
    });
    const results: any[] = data?.results || [];
    if (!results.length) return null;
    const bars: NormalizedBar[] = results.map((r) => ({
      date: new Date(r.t).toISOString(),
      open: r.o,
      high: r.h,
      low: r.l,
      close: r.c,
      volume: r.v,
    }));
    toCache(ck, bars, 60_000);
    return bars;
  } catch (err: any) {
    console.warn(`  ✗ polygon:intraday ${ticker} ${err?.response?.status || err?.code || 'ERR'}`);
    return null;
  }
}

// ---- Company profile (free tier) ----
export interface PolygonProfile {
  name?: string;
  sector?: string;
  industry?: string;
  exchange?: string;
  summary?: string;
  logo?: string;
  website?: string;
  marketCap?: number;
  employees?: number;
  country?: string;
}

export async function polygonProfile(ticker: string): Promise<PolygonProfile | null> {
  const ck = `profile:${ticker}`;
  const cached = fromCache<PolygonProfile>(ck);
  if (cached) return cached;
  try {
    const { data } = await get(`/v3/reference/tickers/${ticker}`);
    const r = data?.results;
    if (!r) return null;
    const result: PolygonProfile = {
      name: r.name,
      sector: r.sic_description,
      industry: r.sic_description,
      exchange: r.primary_exchange,
      summary: r.description,
      logo: r.branding?.logo_url ? `${r.branding.logo_url}?apiKey=${key()}` : undefined,
      website: r.homepage_url,
      marketCap: r.market_cap,
      employees: r.total_employees,
      country: r.locale,
    };
    toCache(ck, result, 60 * 60_000);
    return result;
  } catch (err: any) {
    console.warn(`  ✗ polygon:profile ${ticker} ${err?.response?.status || err?.code || 'ERR'}`);
    return null;
  }
}

// ---- Financials (Starter tier+) ----
export interface PolygonFinancials {
  peRatio?: number;
  eps?: number;
  revenueGrowthYoy?: number;
  netIncome?: number;
  revenue?: number;
  operatingIncome?: number;
  grossProfit?: number;
  totalAssets?: number;
  totalDebt?: number;
  cashAndEquivalents?: number;
  reportedAt?: string;
}

export async function polygonFinancials(ticker: string): Promise<PolygonFinancials | null> {
  const ck = `financials:${ticker}`;
  const cached = fromCache<PolygonFinancials>(ck);
  if (cached) return cached;
  try {
    const { data } = await get(`/vX/reference/financials`, {
      ticker,
      timeframe: 'annual',
      limit: 2,
      order: 'desc',
    });
    const results: any[] = data?.results || [];
    if (!results.length) return null;
    const r = results[0];
    const ic = r.financials?.income_statement;
    const bs = r.financials?.balance_sheet;
    const result: PolygonFinancials = {
      revenue: ic?.revenues?.value,
      netIncome: ic?.net_income_loss?.value,
      operatingIncome: ic?.operating_income_loss?.value,
      grossProfit: ic?.gross_profit?.value,
      totalAssets: bs?.assets?.value,
      totalDebt: bs?.long_term_debt?.value,
      cashAndEquivalents: bs?.cash_and_cash_equivalents_including_short_term_investments?.value,
      reportedAt: r.end_date,
    };
    // EPS from basic EPS if available
    const eps = ic?.basic_earnings_per_share?.value ?? ic?.diluted_earnings_per_share?.value;
    if (eps != null) result.eps = eps;
    // YoY revenue growth
    if (results.length >= 2) {
      const prev = results[1].financials?.income_statement?.revenues?.value;
      if (prev && result.revenue) result.revenueGrowthYoy = ((result.revenue - prev) / Math.abs(prev)) * 100;
    }
    toCache(ck, result, 24 * 60 * 60_000);
    return result;
  } catch (err: any) {
    console.warn(`  ✗ polygon:financials ${ticker} ${err?.response?.status || err?.code || 'ERR'}`);
    return null;
  }
}

// ---- News (free tier) ----
export async function polygonNews(ticker: string, limit = 6): Promise<NormalizedNews[] | null> {
  const ck = `news:${ticker}:${limit}`;
  const cached = fromCache<NormalizedNews[]>(ck);
  if (cached) return cached;
  try {
    const { data } = await get(`/v2/reference/news`, { ticker, limit, order: 'desc', sort: 'published_utc' });
    const results: any[] = data?.results || [];
    if (!results.length) return null;
    const news: NormalizedNews[] = results.map((n) => ({
      id: n.id,
      title: n.title,
      description: n.description,
      url: n.article_url,
      publisher: n.publisher?.name,
      publishedAt: n.published_utc,
      sentiment: n.insights?.[0]?.sentiment,
      imageUrl: n.image_url,
    }));
    toCache(ck, news, 10 * 60_000);
    return news;
  } catch (err: any) {
    console.warn(`  ✗ polygon:news ${ticker} ${err?.response?.status || err?.code || 'ERR'}`);
    return null;
  }
}

// ---- Short interest (Starter tier+: /vX/reference/short_interest) ----
export interface PolygonShortInterest {
  shortPercent?: number;
  sharesShort?: number;
  daysToCover?: number;
  reportedAt?: string;
}

export async function polygonShortInterest(ticker: string): Promise<PolygonShortInterest | null> {
  const ck = `short:${ticker}`;
  const cached = fromCache<PolygonShortInterest>(ck);
  if (cached) return cached;
  try {
    const { data } = await get(`/vX/reference/short_interest`, { ticker, limit: 1, order: 'desc' });
    const r = data?.results?.[0];
    if (!r) return null;
    const result: PolygonShortInterest = {
      sharesShort: r.short_interest,
      daysToCover: r.days_to_cover,
      shortPercent: r.short_percent_of_float,
      reportedAt: r.settlement_date,
    };
    toCache(ck, result, 24 * 60 * 60_000);
    return result;
  } catch (err: any) {
    if (err?.response?.status !== 403) {
      console.warn(`  ✗ polygon:shortInterest ${ticker} ${err?.response?.status || err?.code || 'ERR'}`);
    }
    return null;
  }
}

export function polygonEnabled(): boolean {
  return !!process.env.POLYGON_API_KEY;
}
