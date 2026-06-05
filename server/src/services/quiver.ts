import axios from 'axios';

// Quiver Quant — alternative-data API.
//   https://api.quiverquant.com  (free tier requires a Bearer token)
// Sign up at https://www.quiverquant.com/api → copy token → QUIVER_API_KEY.

const BASE = 'https://api.quiverquant.com/beta';

function key(): string | null {
  return process.env.QUIVER_API_KEY || null;
}

function client() {
  const k = key();
  if (!k) return null;
  return axios.create({
    baseURL: BASE,
    timeout: 9000,
    headers: { Authorization: `Bearer ${k}` },
  });
}

export interface InsiderTrade {
  date: string;
  insider: string;
  title?: string;
  transaction: 'buy' | 'sell' | 'other';
  shares: number;
  pricePerShare?: number;
  totalValue?: number;
}

export interface CongressionalTrade {
  date: string;
  representative: string;
  party?: string;
  chamber?: 'House' | 'Senate' | string;
  transaction: 'Purchase' | 'Sale' | string;
  amount: string;
  reportDate?: string;
}

const cache = new Map<string, { value: any; expires: number }>();
const TTL = 10 * 60_000;

async function memo<T>(k: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(k);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const v = await fn();
  cache.set(k, { value: v, expires: Date.now() + TTL });
  return v;
}

function classify(transaction: string): 'buy' | 'sell' | 'other' {
  const t = transaction?.toLowerCase() || '';
  if (t.includes('buy') || t.includes('purchase') || t.includes('acquir')) return 'buy';
  if (t.includes('sell') || t.includes('sale') || t.includes('dispos')) return 'sell';
  return 'other';
}

export async function quiverInsider(ticker: string, limit = 15): Promise<InsiderTrade[] | null> {
  const c = client();
  if (!c) return null;
  const t = ticker.toUpperCase();
  return memo(`insider:${t}`, async () => {
    try {
      const { data } = await c.get(`/historical/insiders/${t}`);
      if (!Array.isArray(data)) return null;
      const trades: InsiderTrade[] = data.slice(0, limit).map((r: any) => ({
        date: r.Date || r.date || r.FileDate,
        insider: r.Name || r.name || r.Insider || 'Insider',
        title: r.Title || r.Position,
        transaction: classify(r.AcquiredDisposedCode || r.Transaction || r.Code || ''),
        shares: Number(r.Shares ?? r.shares ?? 0),
        pricePerShare: Number(r.PricePerShare ?? r.Price ?? r.price ?? 0) || undefined,
        totalValue: Number(r.TransactionValue ?? r.Value ?? 0) || undefined,
      }));
      return trades.length ? trades : null;
    } catch (err: any) {
      console.warn(`  ✗ quiver:insider ${t} ${err?.response?.status || err?.code || 'ERR'}`);
      return null;
    }
  });
}

export async function quiverCongressional(
  ticker: string,
  limit = 15
): Promise<CongressionalTrade[] | null> {
  const c = client();
  if (!c) return null;
  const t = ticker.toUpperCase();
  return memo(`congress:${t}`, async () => {
    try {
      const { data } = await c.get(`/historical/congresstrading/${t}`);
      if (!Array.isArray(data)) return null;
      const trades: CongressionalTrade[] = data.slice(0, limit).map((r: any) => ({
        date: r.TransactionDate || r.Date || r.date,
        reportDate: r.ReportDate,
        representative: r.Representative || r.Name || 'Member',
        party: r.Party,
        chamber: r.House || r.Chamber,
        transaction: r.Transaction || r.Action || 'Trade',
        amount: r.Range || r.Amount || '—',
      }));
      return trades.length ? trades : null;
    } catch (err: any) {
      console.warn(`  ✗ quiver:congress ${t} ${err?.response?.status || err?.code || 'ERR'}`);
      return null;
    }
  });
}
