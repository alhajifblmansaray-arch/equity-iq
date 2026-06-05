import axios from 'axios';

// StockTwits public stream — last ~30 messages tagged with the ticker.
// No auth needed; rate limit ~200/hr per IP.

const UA = {
  'User-Agent':
    'Mozilla/5.0 (compatible; EquityIQ/1.0; +https://github.com/alhajifblmansaray-arch/equity-iq)',
  Accept: 'application/json',
};

export interface SocialMessage {
  id: string;
  user: string;
  body: string;
  sentiment: 'bullish' | 'bearish' | null;
  createdAt: string;
  url?: string;
}

export interface StockTwitsSentiment {
  source: 'stocktwits';
  total: number;
  bullish: number;
  bearish: number;
  neutral: number;
  bullishPct: number; // 0..100 share of opinion-bearing messages that are bullish
  messages: SocialMessage[];
}

// Tiny TTL cache.
const cache = new Map<string, { value: StockTwitsSentiment | null; expires: number }>();
const TTL = 60_000;

export async function stockTwitsSentiment(ticker: string): Promise<StockTwitsSentiment | null> {
  const key = ticker.toUpperCase();
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  try {
    const { data } = await axios.get(
      `https://api.stocktwits.com/api/2/streams/symbol/${encodeURIComponent(key)}.json`,
      { headers: UA, timeout: 7000 }
    );
    if (!data || !Array.isArray(data.messages)) {
      cache.set(key, { value: null, expires: Date.now() + 15_000 });
      return null;
    }
    let bullish = 0;
    let bearish = 0;
    let neutral = 0;
    const messages: SocialMessage[] = [];
    for (const m of data.messages) {
      const s = m?.entities?.sentiment?.basic;
      const sentiment = s === 'Bullish' ? 'bullish' : s === 'Bearish' ? 'bearish' : null;
      if (sentiment === 'bullish') bullish++;
      else if (sentiment === 'bearish') bearish++;
      else neutral++;
      messages.push({
        id: String(m.id),
        user: m.user?.username || 'anon',
        body: m.body,
        sentiment,
        createdAt: m.created_at,
        url: m.id ? `https://stocktwits.com/message/${m.id}` : undefined,
      });
    }
    const opinion = bullish + bearish;
    const result: StockTwitsSentiment = {
      source: 'stocktwits',
      total: messages.length,
      bullish,
      bearish,
      neutral,
      bullishPct: opinion > 0 ? (bullish / opinion) * 100 : 50,
      messages: messages.slice(0, 8),
    };
    cache.set(key, { value: result, expires: Date.now() + TTL });
    return result;
  } catch (err: any) {
    console.warn(`  ✗ stocktwits ${key} ${err?.response?.status || err?.code || 'ERR'}`);
    cache.set(key, { value: null, expires: Date.now() + 15_000 });
    return null;
  }
}
