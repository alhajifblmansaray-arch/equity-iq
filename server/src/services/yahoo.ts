// yahoo-finance2 is ESM-only and ships no TypeScript types. We hide the import
// specifier from TS via Function() so it doesn't try to resolve it at compile
// time, then load it lazily at runtime through Node's native dynamic import.
const dynamicImport: (s: string) => Promise<any> = new Function(
  's',
  'return import(s)'
) as any;

let _yf: any = null;
async function yf(): Promise<any> {
  if (_yf) return _yf;
  const mod: any = await dynamicImport('yahoo-finance2');
  const inst = mod.default || mod;
  try {
    inst.suppressNotices?.(['yahooSurvey', 'ripHistorical']);
  } catch {
    /* ignore */
  }
  _yf = inst;
  return _yf;
}

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

export async function yahooQuote(ticker: string): Promise<NormalizedQuote | null> {
  try {
    const finance = await yf();
    const q: any = await finance.quote(ticker);
    if (!q || typeof q.regularMarketPrice !== 'number') return null;
    return {
      price: q.regularMarketPrice,
      open: q.regularMarketOpen,
      high: q.regularMarketDayHigh,
      low: q.regularMarketDayLow,
      volume: q.regularMarketVolume,
      prevClose: q.regularMarketPreviousClose,
      change: q.regularMarketChange,
      changePct: q.regularMarketChangePercent,
      marketCap: q.marketCap,
      currency: q.currency,
      name: q.longName || q.shortName,
      source: 'yahoo',
      asOf: q.regularMarketTime ? new Date(q.regularMarketTime).toISOString() : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function yahooHistory(ticker: string, daysBack = 120): Promise<NormalizedBar[] | null> {
  try {
    const finance = await yf();
    const period1 = new Date();
    period1.setDate(period1.getDate() - daysBack);
    const result: any = await finance.chart(ticker, { period1, interval: '1d' });
    const quotes = result?.quotes;
    if (!Array.isArray(quotes)) return null;
    return quotes
      .filter((b: any) => b.close != null)
      .map((b: any): NormalizedBar => ({
        date: new Date(b.date).toISOString().slice(0, 10),
        open: b.open ?? b.close,
        high: b.high ?? b.close,
        low: b.low ?? b.close,
        close: b.close,
        volume: b.volume ?? 0,
      }));
  } catch {
    return null;
  }
}

export async function yahooNews(ticker: string, limit = 6): Promise<NormalizedNews[] | null> {
  try {
    const finance = await yf();
    const result: any = await finance.search(ticker, { newsCount: limit });
    const items = result?.news;
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
  } catch {
    return null;
  }
}

export async function yahooProfile(
  ticker: string
): Promise<{ name?: string; sector?: string; industry?: string; summary?: string } | null> {
  try {
    const finance = await yf();
    const result: any = await finance.quoteSummary(ticker, { modules: ['assetProfile', 'price'] });
    return {
      name: result?.price?.longName || result?.price?.shortName,
      sector: result?.assetProfile?.sector,
      industry: result?.assetProfile?.industry,
      summary: result?.assetProfile?.longBusinessSummary,
    };
  } catch {
    return null;
  }
}
