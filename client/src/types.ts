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
