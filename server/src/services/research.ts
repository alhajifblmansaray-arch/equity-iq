import { fetchMassive } from './massive';
import { EarningsEvent, finnhubEarnings, finnhubNews, finnhubProfile, finnhubQuote } from './finnhub';
import { alphaVantageEarnings, alphaVantageOverview } from './alphaVantage';
import {
  NormalizedBar,
  NormalizedNews,
  NormalizedQuote,
  yahooHistory,
  yahooNews,
  yahooProfile,
  yahooQuote,
} from './yahoo';
import { stooqHistory } from './stooq';
import { twelveDataHistory, twelveDataProfile, twelveDataQuote } from './twelveData';

// -------- Technical indicators (computed locally so we never depend on a paid tier) --------

function rsi(bars: NormalizedBar[], period = 14): number | undefined {
  if (bars.length < period + 1) return undefined;
  let gain = 0;
  let loss = 0;
  for (let i = bars.length - period; i < bars.length; i++) {
    const diff = bars[i].close - bars[i - 1].close;
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  const avgGain = gain / period;
  const avgLoss = loss / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function sma(bars: NormalizedBar[], window: number): number | undefined {
  if (bars.length < window) return undefined;
  const slice = bars.slice(-window);
  return slice.reduce((s, b) => s + b.close, 0) / window;
}

function ema(values: number[], window: number): number[] {
  const k = 2 / (window + 1);
  const result: number[] = [];
  let prev = values[0];
  values.forEach((v, i) => {
    prev = i === 0 ? v : v * k + prev * (1 - k);
    result.push(prev);
  });
  return result;
}

function macd(bars: NormalizedBar[]): { macd: number; signal: number; histogram: number } | undefined {
  if (bars.length < 35) return undefined;
  const closes = bars.map((b) => b.close);
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = ema(macdLine.slice(-50), 9);
  const last = macdLine[macdLine.length - 1];
  const sig = signalLine[signalLine.length - 1];
  return { macd: last, signal: sig, histogram: last - sig };
}

function volatility(bars: NormalizedBar[]): number | undefined {
  if (bars.length < 5) return undefined;
  const returns: number[] = [];
  for (let i = 1; i < bars.length; i++) returns.push((bars[i].close - bars[i - 1].close) / bars[i - 1].close);
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(252);
}

// -------- Aggregator --------

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
    reports: Array<{ fiscalDateEnding: string; reportedEPS?: number; estimatedEPS?: number; surprisePct?: number }>;
  } | null;
  shortInterest: { shortPercent?: number; sharesShort?: number; daysToCover?: number; reportedAt?: string } | null;
  news: NormalizedNews[];
  nextEarnings: { date: string; estimate?: number; hour?: string } | null;
}

function safeNumber(v: any): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function buildResearchReport(rawTicker: string): Promise<ResearchReport> {
  const ticker = rawTicker.trim().toUpperCase();
  console.log(`▶ Research request: ${ticker}`);
  const providers: string[] = [];

  const [
    massive,
    fhQuote,
    fhNews,
    fhProfile,
    fhEarnings,
    avOverview,
    avEarnings,
    yQuote,
    yHistory,
    yNews,
    yProfile,
    sqHistory,
    tdQuote,
    tdHistory,
    tdProfile,
  ] = await Promise.all([
    fetchMassive(ticker),
    finnhubQuote(ticker),
    finnhubNews(ticker, 6),
    finnhubProfile(ticker),
    finnhubEarnings(ticker, 200, 7),
    alphaVantageOverview(ticker),
    alphaVantageEarnings(ticker),
    yahooQuote(ticker),
    yahooHistory(ticker, 120),
    yahooNews(ticker, 6),
    yahooProfile(ticker),
    stooqHistory(ticker, 200),
    twelveDataQuote(ticker),
    twelveDataHistory(ticker, 200),
    twelveDataProfile(ticker),
  ]);

  // Profile (Finnhub → Yahoo → Twelve Data)
  const profile = fhProfile
    ? {
        name: fhProfile.name,
        industry: fhProfile.industry,
        exchange: fhProfile.exchange,
        logo: fhProfile.logo,
        website: fhProfile.weburl,
        marketCap: fhProfile.marketCap,
        sector: yProfile?.sector || tdProfile?.sector,
        summary: yProfile?.summary || tdProfile?.description,
      }
    : yProfile
    ? { name: yProfile.name, sector: yProfile.sector, industry: yProfile.industry, summary: yProfile.summary }
    : tdProfile
    ? {
        name: tdProfile.name,
        sector: tdProfile.sector,
        industry: tdProfile.industry,
        exchange: tdProfile.exchange,
        summary: tdProfile.description,
        website: tdProfile.website,
      }
    : null;
  if (fhProfile) providers.push('finnhub');
  if (yProfile) providers.push('yahoo');
  if (tdProfile) providers.push('twelvedata');

  // Price history (Massive → Yahoo → Twelve Data → Stooq)
  let priceHistory: NormalizedBar[] | null = null;
  if (massive.priceHistory?.results?.length) {
    priceHistory = massive.priceHistory.results.map((r: any) => ({
      date: new Date(r.t).toISOString().slice(0, 10),
      open: r.o,
      high: r.h,
      low: r.l,
      close: r.c,
      volume: r.v,
    }));
    providers.push('massive');
  } else if (yHistory && yHistory.length) {
    priceHistory = yHistory;
  } else if (tdHistory && tdHistory.length) {
    priceHistory = tdHistory;
    providers.push('twelvedata');
  } else if (sqHistory && sqHistory.length) {
    priceHistory = sqHistory;
    providers.push('stooq');
  }

  // Snapshot (Massive → Finnhub → Yahoo → derived)
  let snapshot: NormalizedQuote | null = null;
  const massiveTicker = massive.snapshot?.ticker;
  if (massiveTicker?.day?.c) {
    const d = massiveTicker.day;
    snapshot = {
      price: massiveTicker.lastTrade?.p ?? massiveTicker.min?.c ?? d.c,
      open: d.o,
      high: d.h,
      low: d.l,
      volume: d.v,
      vwap: d.vw,
      prevClose: massiveTicker.prevDay?.c,
      change: massiveTicker.todaysChange,
      changePct: massiveTicker.todaysChangePerc,
      source: 'massive',
      asOf: new Date().toISOString(),
    };
  } else if (fhQuote) {
    snapshot = fhQuote;
  } else if (yQuote) {
    snapshot = yQuote;
  } else if (tdQuote) {
    snapshot = tdQuote;
  } else if (priceHistory && priceHistory.length >= 2) {
    const last = priceHistory[priceHistory.length - 1];
    const prev = priceHistory[priceHistory.length - 2];
    const change = last.close - prev.close;
    snapshot = {
      price: last.close,
      open: last.open,
      high: last.high,
      low: last.low,
      volume: last.volume,
      prevClose: prev.close,
      change,
      changePct: (change / prev.close) * 100,
      source: 'derived',
      asOf: last.date,
    };
  }

  // Technicals (locally computed from priceHistory; Massive RSI/MACD if available)
  const technicals: ResearchReport['technicals'] = {};
  if (priceHistory && priceHistory.length) {
    technicals.rsi = rsi(priceHistory);
    technicals.macd = macd(priceHistory);
    technicals.sma50 = sma(priceHistory, 50);
    technicals.sma200 = sma(priceHistory, 200);
    technicals.volatility = volatility(priceHistory);
  }
  // If Massive supplied better values, prefer them
  if (massive.technicals.rsi?.results?.values?.[0]?.value)
    technicals.rsi = massive.technicals.rsi.results.values[0].value;
  if (massive.technicals.macd?.results?.values?.[0]) {
    const v = massive.technicals.macd.results.values[0];
    technicals.macd = { macd: v.value, signal: v.signal, histogram: v.histogram };
  }
  if (massive.technicals.sma50?.results?.values?.[0]?.value)
    technicals.sma50 = massive.technicals.sma50.results.values[0].value;
  if (massive.technicals.sma200?.results?.values?.[0]?.value)
    technicals.sma200 = massive.technicals.sma200.results.values[0].value;

  // Valuation (Alpha Vantage → Finnhub bits)
  let valuation: ResearchReport['valuation'] = null;
  if (avOverview) {
    valuation = {
      peRatio: avOverview.peRatio,
      forwardPE: avOverview.forwardPE,
      pegRatio: avOverview.pegRatio,
      evToEbitda: avOverview.evToEbitda,
      priceToBook: avOverview.priceToBook,
      priceToSales: avOverview.priceToSales,
      dividendYield: avOverview.dividendYield,
      eps: avOverview.eps,
      beta: avOverview.beta,
      profitMargin: avOverview.profitMargin,
      operatingMargin: avOverview.operatingMargin,
      returnOnEquity: avOverview.returnOnEquity,
      fiftyTwoWeekHigh: avOverview.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: avOverview.fiftyTwoWeekLow,
      analystTargetPrice: avOverview.analystTargetPrice,
    };
    providers.push('alphavantage');
  }

  // Earnings (Alpha Vantage)
  const earnings = avEarnings;

  // Short interest (Massive only)
  let shortInterest: ResearchReport['shortInterest'] = null;
  const siRow = massive.shortInterest?.results?.[0];
  if (siRow) {
    const float = safeNumber(siRow.share_float ?? siRow.float);
    const shortShares = safeNumber(siRow.short_interest ?? siRow.short_interest_shares);
    shortInterest = {
      sharesShort: shortShares,
      daysToCover: safeNumber(siRow.days_to_cover ?? siRow.daysToCover),
      shortPercent: float && shortShares ? (shortShares / float) * 100 : safeNumber(siRow.short_percent_of_float),
      reportedAt: siRow.settlement_date || siRow.record_date,
    };
  }

  // News (Massive → Finnhub → Yahoo)
  let news: NormalizedNews[] = [];
  if (massive.news?.results?.length) {
    news = massive.news.results.slice(0, 6).map((n: any): NormalizedNews => ({
      id: n.id,
      title: n.title,
      description: n.description,
      url: n.article_url,
      publisher: n.publisher?.name,
      publishedAt: n.published_utc,
      sentiment: n.insights?.[0]?.sentiment,
      imageUrl: n.image_url,
    }));
  } else if (fhNews && fhNews.length) {
    news = fhNews;
  } else if (yNews && yNews.length) {
    news = yNews;
  }

  // Next earnings (Finnhub)
  let nextEarnings: ResearchReport['nextEarnings'] = null;
  if (fhEarnings && fhEarnings.length) {
    const now = new Date().toISOString().slice(0, 10);
    const future = fhEarnings
      .filter((e: EarningsEvent) => e.date >= now)
      .sort((a: EarningsEvent, b: EarningsEvent) => a.date.localeCompare(b.date));
    if (future[0]) {
      nextEarnings = { date: future[0].date, estimate: future[0].estimate, hour: future[0].hour };
    }
  }

  const sections = {
    profile: !!profile,
    snapshot: !!snapshot,
    priceHistory: !!(priceHistory && priceHistory.length),
    technicals: !!(technicals.rsi || technicals.macd),
    valuation: !!valuation,
    earnings: !!earnings,
    shortInterest: !!shortInterest,
    news: news.length > 0,
    nextEarnings: !!nextEarnings,
  };

  console.log(`  sections:`, sections);

  return {
    ticker,
    timestamp: new Date().toISOString(),
    meta: { sections, providers: Array.from(new Set(providers)) },
    profile,
    snapshot,
    priceHistory,
    technicals,
    valuation,
    earnings,
    shortInterest,
    news,
    nextEarnings,
  };
}
