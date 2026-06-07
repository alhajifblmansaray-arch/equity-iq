import { ForecastLog } from '../models/ForecastLog';
import { twelveDataQuote } from './twelveData';
import { finnhubQuote } from './finnhub';
import { yahooQuote } from './yahoo';
import type { Forecast, ForecastHorizon } from './anthropic';

// How long until each horizon "matures" and can be scored against the real price.
const HORIZON_MS: Record<ForecastHorizon, number> = {
  '1H': 60 * 60 * 1000,
  '1D': 24 * 60 * 60 * 1000,
  '3D': 3 * 24 * 60 * 60 * 1000,
  '1W': 7 * 24 * 60 * 60 * 1000,
};

// A move smaller than this counts as "flat" when scoring direction.
const FLAT_BAND_PCT = 0.25;

async function priceFor(ticker: string): Promise<number | null> {
  const q = (await twelveDataQuote(ticker)) || (await finnhubQuote(ticker)) || (await yahooQuote(ticker));
  return q?.price ?? null;
}

/** Persist each horizon of a freshly generated forecast so we can grade it later. */
export async function logForecast(ticker: string, forecast: Forecast): Promise<void> {
  try {
    const now = Date.now();
    const docs = forecast.forecasts
      .filter((f) => HORIZON_MS[f.horizon] != null)
      .map((f) => ({
        ticker,
        horizon: f.horizon,
        asOf: new Date(forecast.as_of || now),
        basePrice: forecast.current_price,
        direction: f.direction,
        expectedMovePct: f.expected_move_pct,
        probabilityUp: f.probability_up,
        confidence: f.confidence,
        rangeLow: f.price_range?.low ?? forecast.current_price,
        rangeBase: f.price_range?.base ?? forecast.current_price,
        rangeHigh: f.price_range?.high ?? forecast.current_price,
        resolveAt: new Date(now + HORIZON_MS[f.horizon]),
        resolved: false,
      }));
    if (docs.length) await ForecastLog.insertMany(docs, { ordered: false });
  } catch (err) {
    console.error('logForecast error:', err);
  }
}

function classifyMove(pct: number): 'up' | 'down' | 'flat' {
  if (pct > FLAT_BAND_PCT) return 'up';
  if (pct < -FLAT_BAND_PCT) return 'down';
  return 'flat';
}

/** Background pass: grade any matured, unresolved forecasts against the live price. */
export async function resolveDueForecasts(): Promise<void> {
  try {
    const due = await ForecastLog.find({ resolved: false, resolveAt: { $lte: new Date() } }).limit(200);
    if (!due.length) return;

    // One quote per ticker per cycle.
    const priceCache = new Map<string, number | null>();
    for (const doc of due) {
      let price = priceCache.get(doc.ticker);
      if (price === undefined) {
        price = await priceFor(doc.ticker);
        priceCache.set(doc.ticker, price);
      }
      if (price == null || !doc.basePrice) continue;
      const actualMovePct = ((price - doc.basePrice) / doc.basePrice) * 100;
      doc.actualPrice = price;
      doc.actualMovePct = actualMovePct;
      doc.directionHit = classifyMove(actualMovePct) === doc.direction;
      doc.withinRange = price >= doc.rangeLow && price <= doc.rangeHigh;
      doc.resolved = true;
      await doc.save();
    }
    console.log(`  ✓ resolved ${due.length} forecast(s)`);
  } catch (err) {
    console.error('resolveDueForecasts error:', err);
  }
}

export interface HorizonAccuracy {
  horizon: ForecastHorizon;
  n: number;
  directionHitRate: number; // 0..1
  withinRangeRate: number; // 0..1
  avgBiasPct: number; // mean(predicted expected move - actual move); + = over-bullish
}

/**
 * Build a per-horizon accuracy summary from resolved history. Prefers this
 * ticker's own record, falling back to the global record when a ticker is new.
 */
export async function getAccuracySummary(ticker: string): Promise<HorizonAccuracy[]> {
  const horizons: ForecastHorizon[] = ['1H', '1D', '3D', '1W'];
  const out: HorizonAccuracy[] = [];
  for (const horizon of horizons) {
    let rows = await ForecastLog.find({ ticker, horizon, resolved: true })
      .sort({ resolveAt: -1 })
      .limit(40)
      .lean();
    // Fall back to the global record for this horizon if the ticker is sparse.
    if (rows.length < 5) {
      rows = await ForecastLog.find({ horizon, resolved: true }).sort({ resolveAt: -1 }).limit(60).lean();
    }
    if (!rows.length) continue;
    const n = rows.length;
    const dirHits = rows.filter((r) => r.directionHit).length;
    const rangeHits = rows.filter((r) => r.withinRange).length;
    const bias =
      rows.reduce((s, r) => s + ((r.expectedMovePct ?? 0) - (r.actualMovePct ?? 0)), 0) / n;
    out.push({
      horizon,
      n,
      directionHitRate: dirHits / n,
      withinRangeRate: rangeHits / n,
      avgBiasPct: bias,
    });
  }
  return out;
}

/** Render the accuracy summary as a compact prompt block, or null if no history. */
export function formatAccuracyForPrompt(acc: HorizonAccuracy[]): string | null {
  if (!acc.length) return null;
  const lines = acc.map((a) => {
    const biasDir = a.avgBiasPct > 0.3 ? 'over-bullish' : a.avgBiasPct < -0.3 ? 'over-bearish' : 'well-centered';
    return `  ${a.horizon}: direction hit ${(a.directionHitRate * 100).toFixed(0)}%, price in-range ${(a.withinRangeRate * 100).toFixed(0)}% over ${a.n} graded calls; bias ${a.avgBiasPct >= 0 ? '+' : ''}${a.avgBiasPct.toFixed(2)}% (${biasDir}).`;
  });
  return lines.join('\n');
}
