import axios from 'axios';

// Reddit JSON endpoints — read-only, no auth. They DO require a real
// User-Agent header or you get 403s. We poll a few finance subreddits.

const UA = {
  'User-Agent': 'EquityIQ/1.0 (https://github.com/alhajifblmansaray-arch/equity-iq)',
  Accept: 'application/json',
};

const SUBS = ['wallstreetbets', 'stocks', 'investing', 'StockMarket'];

export interface RedditPost {
  id: string;
  title: string;
  subreddit: string;
  score: number;
  comments: number;
  createdAt: string;
  url: string;
  permalink: string;
  selftext?: string;
}

export interface RedditSentiment {
  source: 'reddit';
  totalMentions: number;
  perSub: Record<string, number>;
  topPosts: RedditPost[];
}

const cache = new Map<string, { value: RedditSentiment | null; expires: number }>();
const TTL = 90_000;

async function fetchSub(sub: string, ticker: string): Promise<RedditPost[]> {
  try {
    const { data } = await axios.get(`https://www.reddit.com/r/${sub}/search.json`, {
      params: {
        q: ticker,
        sort: 'top',
        t: 'week',
        restrict_sr: 'on',
        limit: 10,
      },
      headers: UA,
      timeout: 7000,
    });
    const children = data?.data?.children;
    if (!Array.isArray(children)) return [];
    return children.map((c: any): RedditPost => ({
      id: c.data.id,
      title: c.data.title,
      subreddit: c.data.subreddit,
      score: c.data.score ?? 0,
      comments: c.data.num_comments ?? 0,
      createdAt: new Date((c.data.created_utc ?? 0) * 1000).toISOString(),
      url: c.data.url,
      permalink: `https://reddit.com${c.data.permalink}`,
      selftext: c.data.selftext?.slice(0, 240),
    }));
  } catch (err: any) {
    console.warn(`  · reddit:${sub} ${ticker} ${err?.response?.status || err?.code || 'ERR'}`);
    return [];
  }
}

export async function redditSentiment(ticker: string): Promise<RedditSentiment | null> {
  const key = ticker.toUpperCase();
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;

  const results = await Promise.all(SUBS.map((s) => fetchSub(s, key)));
  const allPosts: RedditPost[] = [];
  const perSub: Record<string, number> = {};
  results.forEach((posts, i) => {
    perSub[SUBS[i]] = posts.length;
    allPosts.push(...posts);
  });
  if (allPosts.length === 0) {
    cache.set(key, { value: null, expires: Date.now() + 30_000 });
    return null;
  }
  const topPosts = allPosts.sort((a, b) => b.score - a.score).slice(0, 6);
  const value: RedditSentiment = {
    source: 'reddit',
    totalMentions: allPosts.length,
    perSub,
    topPosts,
  };
  cache.set(key, { value, expires: Date.now() + TTL });
  return value;
}
