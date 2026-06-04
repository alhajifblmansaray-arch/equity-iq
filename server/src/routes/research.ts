import { Router } from 'express';
import { buildResearchReport } from '../services/research';
import { twelveDataIntraday, twelveDataQuote, IntradayInterval } from '../services/twelveData';
import { finnhubMarketNews, finnhubNews, finnhubQuote } from '../services/finnhub';
import { yahooNews, yahooQuote } from '../services/yahoo';
import { requireAuth } from '../middleware/auth';

const router = Router();

const TICKER_RE = /^[A-Z][A-Z0-9.\-]{0,9}$/;

function validTicker(t: string): boolean {
  return TICKER_RE.test(t);
}

router.get('/:ticker', requireAuth, async (req, res, next) => {
  const ticker = String(req.params.ticker || '').toUpperCase().trim();
  if (!validTicker(ticker)) {
    res.status(400).json({ error: 'Invalid ticker symbol.' });
    return;
  }
  try {
    const report = await buildResearchReport(ticker);
    if (!report.snapshot && !report.priceHistory) {
      res.status(404).json({ error: `No data found for ${ticker}.` });
      return;
    }
    res.json(report);
  } catch (err) {
    next(err);
  }
});

// Lightweight quote endpoint for watchlist rows & live polling — no heavy
// indicator computation, no news; just the latest price + change.
router.get('/:ticker/quote', requireAuth, async (req, res, next) => {
  const ticker = String(req.params.ticker || '').toUpperCase().trim();
  if (!validTicker(ticker)) {
    res.status(400).json({ error: 'Invalid ticker symbol.' });
    return;
  }
  try {
    const q = (await twelveDataQuote(ticker)) || (await finnhubQuote(ticker)) || (await yahooQuote(ticker));
    if (!q) {
      res.status(404).json({ error: `No quote for ${ticker}.` });
      return;
    }
    res.json({ ticker, quote: q });
  } catch (err) {
    next(err);
  }
});

// Intraday bars for the Live page.
const VALID_INTERVALS = new Set<IntradayInterval>(['1min', '5min', '15min', '30min', '1h']);
router.get('/:ticker/intraday', requireAuth, async (req, res, next) => {
  const ticker = String(req.params.ticker || '').toUpperCase().trim();
  if (!validTicker(ticker)) {
    res.status(400).json({ error: 'Invalid ticker symbol.' });
    return;
  }
  const rawInterval = String(req.query.interval || '5min') as IntradayInterval;
  const interval = VALID_INTERVALS.has(rawInterval) ? rawInterval : '5min';
  const outputsize = Math.min(500, Math.max(20, Number(req.query.outputsize) || 200));
  try {
    const bars = await twelveDataIntraday(ticker, interval, outputsize);
    if (!bars || !bars.length) {
      res.status(404).json({ error: `No intraday data for ${ticker}.` });
      return;
    }
    const quote =
      (await twelveDataQuote(ticker)) || (await finnhubQuote(ticker)) || (await yahooQuote(ticker));
    res.json({ ticker, interval, bars, quote });
  } catch (err) {
    next(err);
  }
});

// Expanded news feed for a specific ticker — used by the dedicated News page.
router.get('/:ticker/news', requireAuth, async (req, res, next) => {
  const ticker = String(req.params.ticker || '').toUpperCase().trim();
  if (!validTicker(ticker)) {
    res.status(400).json({ error: 'Invalid ticker symbol.' });
    return;
  }
  const limit = Math.min(50, Math.max(5, Number(req.query.limit) || 25));
  const days = Math.min(60, Math.max(7, Number(req.query.days) || 30));
  try {
    let articles = await finnhubNews(ticker, limit, days);
    if (!articles || articles.length === 0) {
      const yn = await yahooNews(ticker, limit);
      if (yn && yn.length) articles = yn;
    }
    res.json({ ticker, articles: articles || [] });
  } catch (err) {
    next(err);
  }
});

export default router;
