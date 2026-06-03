import axios from 'axios';

const BASE = 'https://www.alphavantage.co/query';

function key(): string | null {
  return process.env.ALPHA_VANTAGE_API_KEY || null;
}

export interface AVOverview {
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
  marketCap?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  analystTargetPrice?: number;
  sector?: string;
  industry?: string;
  description?: string;
}

function n(v: any): number | undefined {
  const num = Number(v);
  return Number.isFinite(num) && num !== 0 ? num : undefined;
}

export async function alphaVantageOverview(ticker: string): Promise<AVOverview | null> {
  const k = key();
  if (!k) return null;
  try {
    const { data } = await axios.get(BASE, {
      params: { function: 'OVERVIEW', symbol: ticker, apikey: k },
      timeout: 8000,
    });
    if (!data || !data.Symbol) return null;
    return {
      peRatio: n(data.PERatio),
      forwardPE: n(data.ForwardPE),
      pegRatio: n(data.PEGRatio),
      evToEbitda: n(data.EVToEBITDA),
      priceToBook: n(data.PriceToBookRatio),
      priceToSales: n(data.PriceToSalesRatioTTM),
      dividendYield: n(data.DividendYield),
      eps: n(data.EPS),
      beta: n(data.Beta),
      profitMargin: n(data.ProfitMargin),
      operatingMargin: n(data.OperatingMarginTTM),
      returnOnEquity: n(data.ReturnOnEquityTTM),
      marketCap: n(data.MarketCapitalization),
      fiftyTwoWeekHigh: n(data['52WeekHigh']),
      fiftyTwoWeekLow: n(data['52WeekLow']),
      analystTargetPrice: n(data.AnalystTargetPrice),
      sector: data.Sector,
      industry: data.Industry,
      description: data.Description,
    };
  } catch {
    return null;
  }
}

export interface AVEarnings {
  reports: Array<{ fiscalDateEnding: string; reportedEPS?: number; estimatedEPS?: number; surprisePct?: number }>;
}

export async function alphaVantageEarnings(ticker: string): Promise<AVEarnings | null> {
  const k = key();
  if (!k) return null;
  try {
    const { data } = await axios.get(BASE, {
      params: { function: 'EARNINGS', symbol: ticker, apikey: k },
      timeout: 8000,
    });
    if (!data || !Array.isArray(data.quarterlyEarnings)) return null;
    return {
      reports: data.quarterlyEarnings.slice(0, 4).map((r: any) => ({
        fiscalDateEnding: r.fiscalDateEnding,
        reportedEPS: n(r.reportedEPS),
        estimatedEPS: n(r.estimatedEPS),
        surprisePct: n(r.surprisePercentage),
      })),
    };
  } catch {
    return null;
  }
}
