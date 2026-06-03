import axios from 'axios';

// Yahoo's chart + search endpoints are public, JSON, and don't need auth
// (the quoteSummary endpoint now requires a crumb cookie — we skip it).
// All requests carry a browser-like User-Agent to avoid being 403'd.

const UA = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
};

export interface NormalizedQuote {
  price: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  prevClose?: number;
  vwap?: number;
  change?: number;
  changePct?: number;
  marketCap?: number;
  source: 'yahoo' | 'live' | 'derived' | 'finnhub' | 'massive';
  asOf: string;
  currency?: string;
  name?: string;
}

export interface NormalizedBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface NormalizedNews {
  id: string;
  title: string;
  description?: string;
  url: string;
  publisher?: string;
  publishedAt: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  imageUrl?: string;
}

interface ChartFetch {
  snapshot: NormalizedQuote;
  bars: NormalizedBar[];
  name?: string;
}

async function fetchChart(ticker: string, range = '6mo'): Promise<ChartFetch | null> {
  try {
    const { data } = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`,
      {
        params: { range, interval: '1d', includePrePost: false },
        headers: UA,
        timeout: 9000,
      }
    );
    const result = data?.chart?.result?.[0];
    if (!result || !result.meta) return null;
    const meta = result.meta;
    const ts: number[] = result.timestamp || [];
    const q = result.indicators?.quote?.[0];
    if (!q || !ts.length) return null;

    const bars: NormalizedBar[] = ts
      .map((t, i): NormalizedBar | null => {
        if (q.close[i] == null) return null;
        return {
          date: new Date(t * 1000).toISOString().slice(0, 10),
          open: q.open[i] ?? q.close[i],
          high: q.high[i] ?? q.close[i],
          low: q.low[i] ?? q.close[i],
          close: q.close[i],
          volume: q.volume[i] ?? 0,
        };
      })
      .filter((b): b is NormalizedBar => b !== null);

    if (!bars.length) return null;
    const last = bars[bars.length - 1];

    const price: number = meta.regularMarketPrice ?? last.close;
    const prevClose: number = meta.chartPreviousClose ?? meta.previousClose ?? last.close;
    const change = price - prevClose;
    const changePct = prevClose ? (change / prevClose) * 100 : 0;

    const snapshot: NormalizedQuote = {
      price,
      open: last.open,
      high: last.high,
      low: last.low,
      volume: last.volume,
      prevClose,
      change,
      changePct,
      source: 'yahoo',
      currency: meta.currency,
      asOf: new Date((meta.regularMarketTime || ts[ts.length - 1]) * 1000).toISOString(),
      name: meta.longName || meta.shortName,
    };

    return { snapshot, bars, name: meta.longName || meta.shortName || meta.instrumentName };
  } catch (err: any) {
    console.warn(`  ✗ yahoo:chart ${ticker} ${err?.response?.status || err?.code || 'ERR'}`);
    return null;
  }
}

// Short-lived cache so yahooQuote/yahooHistory/yahooProfile share one HTTP fetch.
const chartCache = new Map<string, Promise<ChartFetch | null>>();
function chart(ticker: string): Promise<ChartFetch | null> {
  const key = ticker.toUpperCase();
  let p = chartCache.get(key);
  if (!p) {
    p = fetchChart(key);
    chartCache.set(key, p);
    setTimeout(() => chartCache.delete(key), 30_000);
  }
  return p;
}

export async function yahooQuote(ticker: string): Promise<NormalizedQuote | null> {
  const c = await chart(ticker);
  return c?.snapshot ?? null;
}

export async function yahooHistory(ticker: string, _daysBack = 120): Promise<NormalizedBar[] | null> {
  const c = await chart(ticker);
  return c?.bars ?? null;
}

export async function yahooNews(ticker: string, limit = 6): Promise<NormalizedNews[] | null> {
  try {
    const { data } = await axios.get('https://query1.finance.yahoo.com/v1/finance/search', {
      params: { q: ticker, newsCount: limit, quotesCount: 0, enableFuzzyQuery: false },
      headers: UA,
      timeout: 7000,
    });
    const items = data?.news;
    if (!Array.isArray(items)) return null;
    return items.slice(0, limit).map((n: any): NormalizedNews => ({
      id: n.uuid || n.link,
      title: n.title,
      url: n.link,
      publisher: n.publisher,
      publishedAt: n.providerPublishTime
        ? new Date(n.providerPublishTime * 1000).toISOString()
        : new Date().toISOString(),
      imageUrl: n.thumbnail?.resolutions?.[0]?.url,
    }));
  } catch (err: any) {
    console.warn(`  ✗ yahoo:news ${ticker} ${err?.response?.status || err?.code || 'ERR'}`);
    return null;
  }
}

export async function yahooProfile(
  ticker: string
): Promise<{ name?: string; sector?: string; industry?: string; summary?: string } | null> {
  const c = await chart(ticker);
  if (!c?.name) return null;
  // Full profile (sector/industry/summary) needs the quoteSummary endpoint
  // which now requires a crumb cookie. We surface just the name here; richer
  // profile fields come from Finnhub when its API key is set.
  return { name: c.name };
}
