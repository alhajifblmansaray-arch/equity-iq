export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  watchlist: string[];
  createdAt: string;
}

export interface NormalizedBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
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
  source: 'massive' | 'finnhub' | 'yahoo' | 'derived' | 'live';
  asOf: string;
  currency?: string;
  name?: string;
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

export interface ResearchReport {
  ticker: string;
  timestamp: string;
  meta: {
    sections: Record<string, boolean>;
    providers: string[];
  };
  profile: {
    name?: string;
    sector?: string;
    industry?: string;
    exchange?: string;
    summary?: string;
    logo?: string;
    website?: string;
    marketCap?: number;
  } | null;
  snapshot: NormalizedQuote | null;
  priceHistory: NormalizedBar[] | null;
  technicals: {
    rsi?: number;
    macd?: { macd: number; signal: number; histogram: number };
    sma50?: number;
    sma200?: number;
    volatility?: number;
  };
  valuation: {
    peRatio?: number;
    forwardPE?: number;
    pegRatio?: number;
    evToEbitda?: number;
    priceToBook?: number;
    priceToSales?: number;
    dividendYield?: number;
    eps?: number;
    beta?: number;
    profitMargin?: number;
    operatingMargin?: number;
    returnOnEquity?: number;
    fiftyTwoWeekHigh?: number;
    fiftyTwoWeekLow?: number;
    analystTargetPrice?: number;
  } | null;
  earnings: {
    reports: Array<{
      fiscalDateEnding: string;
      reportedEPS?: number;
      estimatedEPS?: number;
      surprisePct?: number;
    }>;
  } | null;
  shortInterest: {
    shortPercent?: number;
    sharesShort?: number;
    daysToCover?: number;
    reportedAt?: string;
  } | null;
  news: NormalizedNews[];
  nextEarnings: { date: string; estimate?: number; hour?: string } | null;
  pulse: {
    stockTwits: StockTwitsSentiment | null;
    reddit: RedditSentiment | null;
    insider: InsiderTrade[] | null;
    congressional: CongressionalTrade[] | null;
    options: OptionsFlow | null;
  };
}

export interface StockTwitsMessage {
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
  bullishPct: number;
  messages: StockTwitsMessage[];
}

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
  chamber?: string;
  transaction: string;
  amount: string;
  reportDate?: string;
}

export interface OptionsFlow {
  source: 'polygon';
  putCallRatioOI: number | null;
  putCallRatioVol: number | null;
  totalOpenInterest: { calls: number; puts: number };
  totalVolume: { calls: number; puts: number };
  avgImpliedVol: number | null;
  topOI: Array<{
    type: 'call' | 'put';
    strike: number;
    expiry: string;
    openInterest: number;
    volume: number;
    impliedVol?: number;
  }>;
  sampleSize: number;
}

export interface EarningsEvent {
  date: string;
  symbol: string;
  estimate?: number;
  actual?: number;
  hour?: string;
  quarter?: number;
  year?: number;
  revenueEstimate?: number;
  revenueActual?: number;
}

export interface PriceAlert {
  id: string;
  ticker: string;
  condition: 'above' | 'below';
  price: number;
  active: boolean;
  triggeredAt?: string;
  createdAt: string;
}

export type Confidence = 'low' | 'moderate' | 'high';
export type Direction = 'up' | 'down' | 'flat';
export type Impact = 'high' | 'medium' | 'low';

export interface Prediction {
  direction: Direction;
  magnitudePct: number;
  confidence: Confidence;
  basis: string;
}

export type ForecastHorizon = '1H' | '1D' | '3D' | '1W';
export type ForecastDirection = 'up' | 'down' | 'flat';
export type ForecastConfidence = 'low' | 'medium' | 'high';

export interface HorizonForecast {
  horizon: ForecastHorizon;
  direction: ForecastDirection;
  probability_up: number;
  expected_move_pct: number;
  price_range: { low: number; base: number; high: number };
  confidence: ForecastConfidence;
  key_drivers: string[];
  key_risks: string[];
}

export interface Forecast {
  ticker: string;
  as_of: string;
  market_session: string;
  current_price: number;
  forecasts: HorizonForecast[];
  overall_thesis: string;
  conflicting_signals: string[];
  data_gaps: string[];
}

export interface Outlook {
  industry: {
    name: string;
    tamUsd?: number;
    growthPctAnnual?: number;
    horizonYears?: number;
    subAreas: string[];
    summary: string;
  };
  positioning: {
    rank: 'leader' | 'established' | 'challenger' | 'niche' | 'early';
    moats: string[];
    rationale: string;
  };
  catalysts: Array<{
    label: string;
    when: string;
    impact: Impact;
    direction: 'bullish' | 'bearish' | 'neutral';
    note: string;
  }>;
  sentiment: {
    news: number;
    technical: number;
    institutional?: number | null;
    social?: number | null;
    note: string;
  };
  predictions: {
    day: Prediction;
    week: Prediction;
    month: Prediction;
    year: Prediction;
  };
  summary: string;
}
