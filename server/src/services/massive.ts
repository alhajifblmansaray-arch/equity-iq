import axios, { AxiosInstance } from 'axios';

const BASE = 'https://api.massive.com';

function client(): AxiosInstance | null {
  const k = process.env.MASSIVE_API_KEY;
  if (!k) return null;
  return axios.create({
    baseURL: BASE,
    timeout: 7000,
    headers: { Authorization: `Bearer ${k}` },
  });
}

async function safe<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err: any) {
    const status = err?.response?.status;
    console.warn(`  ✗ massive:${label} ${status || 'ERR'}`);
    return null;
  }
}

export interface MassiveBundle {
  snapshot: any;
  ratios: any;
  income: any;
  technicals: { rsi: any; macd: any; sma50: any; sma200: any };
  priceHistory: any;
  options: any;
  shortInterest: any;
  news: any;
}

export async function fetchMassive(ticker: string): Promise<MassiveBundle> {
  const c = client();
  if (!c) {
    return {
      snapshot: null,
      ratios: null,
      income: null,
      technicals: { rsi: null, macd: null, sma50: null, sma200: null },
      priceHistory: null,
      options: null,
      shortInterest: null,
      news: null,
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const from = new Date();
  from.setDate(from.getDate() - 120);
  const fromStr = from.toISOString().slice(0, 10);

  const [snapshot, ratios, income, rsi, macd, sma50, sma200, priceHistory, options, shortInterest, news] =
    await Promise.all([
      safe('snapshot', () => c.get(`/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}`).then((r) => r.data)),
      safe('ratios', () => c.get(`/stocks/financials/v1/ratios`, { params: { ticker, limit: 1 } }).then((r) => r.data)),
      safe('income', () =>
        c
          .get(`/stocks/financials/v1/income-statements`, { params: { ticker, limit: 4, timeframe: 'quarterly' } })
          .then((r) => r.data)
      ),
      safe('rsi', () =>
        c.get(`/v1/indicators/rsi/${ticker}`, { params: { timespan: 'day', window: 14, limit: 1 } }).then((r) => r.data)
      ),
      safe('macd', () =>
        c.get(`/v1/indicators/macd/${ticker}`, { params: { timespan: 'day', limit: 1 } }).then((r) => r.data)
      ),
      safe('sma50', () =>
        c.get(`/v1/indicators/sma/${ticker}`, { params: { timespan: 'day', window: 50, limit: 1 } }).then((r) => r.data)
      ),
      safe('sma200', () =>
        c.get(`/v1/indicators/sma/${ticker}`, { params: { timespan: 'day', window: 200, limit: 1 } }).then((r) => r.data)
      ),
      safe('priceHistory', () =>
        c
          .get(`/v2/aggs/ticker/${ticker}/range/1/day/${fromStr}/${today}`, {
            params: { adjusted: true, sort: 'asc', limit: 150 },
          })
          .then((r) => r.data)
      ),
      safe('options', () => c.get(`/v3/snapshot/options/${ticker}`, { params: { limit: 50 } }).then((r) => r.data)),
      safe('shortInterest', () =>
        c.get(`/stocks/v1/short-interest`, { params: { ticker, limit: 1 } }).then((r) => r.data)
      ),
      safe('news', () =>
        c.get(`/v2/reference/news`, { params: { ticker, limit: 6, order: 'desc' } }).then((r) => r.data)
      ),
    ]);

  return {
    snapshot,
    ratios,
    income,
    technicals: { rsi, macd, sma50, sma200 },
    priceHistory,
    options,
    shortInterest,
    news,
  };
}
