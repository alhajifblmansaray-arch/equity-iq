import axios from 'axios';
import type { NormalizedBar } from './yahoo';

// Stooq.com publishes free daily OHLCV CSVs with no API key and tolerates
// cloud-provider IPs that Yahoo refuses. Format:
//   https://stooq.com/q/d/l/?s=aapl.us&i=d
// → CSV: Date,Open,High,Low,Close,Volume (oldest first)

const UA = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};

function ymd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

export async function stooqHistory(ticker: string, daysBack = 200): Promise<NormalizedBar[] | null> {
  const symbol = ticker.toLowerCase();
  // Stooq lists US tickers as e.g. "aapl.us". For non-US, the suffix differs;
  // we just try the .us variant — non-US tickers can fall through other sources.
  const today = new Date();
  const from = new Date();
  from.setDate(from.getDate() - daysBack);

  try {
    const { data } = await axios.get('https://stooq.com/q/d/l/', {
      params: { s: `${symbol}.us`, i: 'd', d1: ymd(from), d2: ymd(today) },
      headers: UA,
      timeout: 9000,
      responseType: 'text',
    });
    if (typeof data !== 'string' || !data.length) return null;
    if (data.trim().toLowerCase().startsWith('no data')) return null;

    const lines = data.split(/\r?\n/).filter((l) => l.trim().length);
    if (lines.length < 2) return null;
    const header = lines[0].toLowerCase();
    if (!header.includes('date') || !header.includes('close')) return null;

    const bars: NormalizedBar[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length < 5) continue;
      const [date, open, high, low, close, volume] = cols;
      const c = Number(close);
      if (!Number.isFinite(c)) continue;
      bars.push({
        date,
        open: Number(open) || c,
        high: Number(high) || c,
        low: Number(low) || c,
        close: c,
        volume: Number(volume) || 0,
      });
    }
    return bars.length ? bars : null;
  } catch (err: any) {
    console.warn(`  ✗ stooq:history ${ticker} ${err?.response?.status || err?.code || 'ERR'}`);
    return null;
  }
}
