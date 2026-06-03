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

export async function finnhubNews(ticker: string, limit = 6): Promise<NormalizedNews[] | null> {
  const k = key();
  if (!k) return null;
  try {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 14);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const { data } = await axios.get(`${BASE}/company-news`, {
      params: { symbol: ticker, from: fmt(from), to: fmt(to), token: k },
      timeout: 6000,
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
  } catch {
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
