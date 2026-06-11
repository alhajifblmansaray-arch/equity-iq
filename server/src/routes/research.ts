import { Router } from 'express';
import { buildResearchReport } from '../services/research';
import { twelveDataIntraday, twelveDataQuote, IntradayInterval } from '../services/twelveData';
import { finnhubMarketNews, finnhubNews, finnhubQuote } from '../services/finnhub';
import { yahooHistory, yahooNews, yahooQuote } from '../services/yahoo';
import { twelveDataHistory } from '../services/twelveData';
import { stooqHistory } from '../services/stooq';
import { alphaVantageHistory } from '../services/alphaVantage';
import { finnhubStream } from '../services/finnhubStream';
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

// Live price stream — Server-Sent Events. The browser subscribes via
// EventSource, the server holds one Finnhub WebSocket per process and fans
// trade ticks out to any listening clients.
router.get('/:ticker/stream', requireAuth, (req, res) => {
  const ticker = String(req.params.ticker || '').toUpperCase().trim();
  if (!validTicker(ticker)) {
    res.status(400).end();
    return;
  }
  if (!finnhubStream.enabled()) {
    res.status(503).json({ error: 'Live stream unavailable — FINNHUB_API_KEY not set.' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
  res.write(`: connected ${ticker}\n\n`);

  const handler = (tick: { ticker: string; price: number; volume: number; timestamp: number }) => {
    res.write(`data: ${JSON.stringify(tick)}\n\n`);
  };

  finnhubStream.on(`trade:${ticker}`, handler);
  finnhubStream.subscribe(ticker);

  const heartbeat = setInterval(() => res.write(`: ping ${Date.now()}\n\n`), 25_000);

  const cleanup = () => {
    clearInterval(heartbeat);
    finnhubStream.off(`trade:${ticker}`, handler);
    finnhubStream.unsubscribe(ticker);
    try {
      res.end();
    } catch {
      /* ignore */
    }
  };

  req.on('close', cleanup);
  req.on('error', cleanup);
});

// Sparkline endpoint — last N daily closes. Cheap (shares Twelve Data history
// cache) and works for any US ticker even when intraday data isn't available.
router.get('/:ticker/spark', requireAuth, async (req, res, next) => {
  const ticker = String(req.params.ticker || '').toUpperCase().trim();
  if (!validTicker(ticker)) {
    res.status(400).json({ error: 'Invalid ticker.' });
    return;
  }
  const days = Math.min(60, Math.max(3, Number(req.query.days) || 10));
  try {
    let bars =
      (await twelveDataHistory(ticker, Math.max(30, days * 2))) ||
      (await yahooHistory(ticker, days * 2)) ||
      (await alphaVantageHistory(ticker)) ||
      (await stooqHistory(ticker, days * 2));
    if (!bars || !bars.length) {
      res.status(404).json({ error: `No history for ${ticker}.` });
      return;
    }
    const closes = bars.slice(-days).map((b) => b.close);
    res.json({ ticker, closes });
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
    let bars = await twelveDataIntraday(ticker, interval, outputsize);
    let actualInterval: string = interval;
    let fellBack = false;
    // If intraday is rate-limited or unavailable, fall back to recent daily
    // closes so the Live page still has something to show.
    if (!bars || !bars.length) {
      const daily =
        (await twelveDataHistory(ticker, 60)) ||
        (await yahooHistory(ticker, 60)) ||
        (await alphaVantageHistory(ticker)) ||
        (await stooqHistory(ticker, 60));
      if (daily && daily.length) {
        bars = daily.slice(-30);
        actualInterval = '1day';
        fellBack = true;
      }
    }
    if (!bars || !bars.length) {
      res.status(404).json({ error: `No intraday data for ${ticker}.` });
      return;
    }
    const quote =
      (await twelveDataQuote(ticker)) || (await finnhubQuote(ticker)) || (await yahooQuote(ticker));
    res.json({ ticker, interval: actualInterval, bars, quote, fellBack });
  } catch (err) {
    next(err);
  }
});

// AI thesis (Anthropic Claude). Returns one ~3-paragraph synthesis.
import { chatAboutTicker, generateForecast, generateOutlook, generateThesis, isAnthropicEnabled } from '../services/anthropic';
import type { ForecastHorizon } from '../services/anthropic';
import { getAccuracySummary, formatAccuracyForPrompt, logForecast } from '../services/forecastTracker';
import { z } from 'zod';

router.post('/:ticker/thesis', requireAuth, async (req, res, next) => {
  const ticker = String(req.params.ticker || '').toUpperCase().trim();
  if (!validTicker(ticker)) {
    res.status(400).json({ error: 'Invalid ticker symbol.' });
    return;
  }
  if (!isAnthropicEnabled()) {
    res.status(503).json({
      error: 'AI thesis is unavailable. Set ANTHROPIC_API_KEY in server/.env to enable.',
    });
    return;
  }
  try {
    const report = await buildResearchReport(ticker);
    if (!report.snapshot && !report.priceHistory) {
      res.status(404).json({ error: `No data found for ${ticker}.` });
      return;
    }
    const thesis = await generateThesis(report);
    res.json({ ticker, ...thesis });
  } catch (err: any) {
    const status: number | undefined = err?.status || err?.response?.status;

    // Anthropic SDK errors carry the parsed body on .error.error.message, OR
    // the raw JSON in .message. Try several extractors then fall back to a
    // generic string.
    let apiMessage: string | undefined =
      err?.error?.error?.message ||
      err?.error?.message ||
      err?.response?.data?.error?.message;

    if (!apiMessage && typeof err?.message === 'string') {
      // SDK sometimes throws with message like '400 {"type":"error",...}'
      const m = err.message.match(/\{[\s\S]+\}$/);
      if (m) {
        try {
          const parsed = JSON.parse(m[0]);
          apiMessage = parsed?.error?.message || parsed?.message;
        } catch {
          /* ignore */
        }
      }
      if (!apiMessage) apiMessage = err.message;
    }

    console.error('Thesis error:', status || '', apiMessage || err);

    if (status === 401) {
      res.status(401).json({
        error: 'Invalid ANTHROPIC_API_KEY. Double-check it in server/.env.',
      });
    } else if (status === 429) {
      res.status(429).json({
        error: 'Anthropic rate-limited this account. Wait a minute and try again.',
      });
    } else if (/credit balance is too low|insufficient/i.test(apiMessage || '')) {
      res.status(402).json({
        error:
          'Your Anthropic account is out of credits. Add credits at https://console.anthropic.com/settings/billing — as little as $5 is enough for hundreds of theses.',
      });
    } else if (status === 404 && /model/i.test(apiMessage || '')) {
      res.status(404).json({
        error: `Model not found: ${process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5'}. Set ANTHROPIC_MODEL to an available model.`,
      });
    } else if (apiMessage) {
      res.status(status && status < 600 ? status : 500).json({ error: apiMessage });
    } else {
      next(err);
    }
  }
});

// Anthropic shared error handler — used by /chat and /outlook routes too.
function handleAiError(err: any, res: any, next: any, label: string) {
  const status: number | undefined = err?.status || err?.response?.status;
  let apiMessage: string | undefined =
    err?.error?.error?.message ||
    err?.error?.message ||
    err?.response?.data?.error?.message;
  if (!apiMessage && typeof err?.message === 'string') {
    const m = err.message.match(/\{[\s\S]+\}$/);
    if (m) {
      try {
        const parsed = JSON.parse(m[0]);
        apiMessage = parsed?.error?.message || parsed?.message;
      } catch {
        /* ignore */
      }
    }
    if (!apiMessage) apiMessage = err.message;
  }
  console.error(`${label} error:`, status || '', apiMessage || err);
  if (status === 401) {
    res.status(401).json({ error: 'Invalid ANTHROPIC_API_KEY.' });
  } else if (status === 429) {
    res.status(429).json({ error: 'Anthropic rate-limited. Try again in a moment.' });
  } else if (/credit balance is too low|insufficient/i.test(apiMessage || '')) {
    res.status(402).json({
      error:
        'Your Anthropic account is out of credits. Add credits at https://console.anthropic.com/settings/billing.',
    });
  } else if (apiMessage) {
    res.status(status && status < 600 ? status : 500).json({ error: apiMessage });
  } else {
    next(err);
  }
}

// Conversational follow-up — chat about a ticker with the full research as
// preloaded system context.
const chatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().min(1).max(2000),
    })
  ).min(1).max(20),
});

router.post('/:ticker/chat', requireAuth, async (req, res, next) => {
  const ticker = String(req.params.ticker || '').toUpperCase().trim();
  if (!validTicker(ticker)) {
    res.status(400).json({ error: 'Invalid ticker.' });
    return;
  }
  if (!isAnthropicEnabled()) {
    res.status(503).json({ error: 'AI chat is unavailable. Set ANTHROPIC_API_KEY in server/.env.' });
    return;
  }
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid chat history.' });
    return;
  }
  try {
    const report = await buildResearchReport(ticker);
    const result = await chatAboutTicker(report, parsed.data.messages);
    res.json({ ticker, ...result });
  } catch (err: any) {
    handleAiError(err, res, next, 'Chat');
  }
});

// Forward-looking Outlook — structured AI synthesis.
router.post('/:ticker/outlook', requireAuth, async (req, res, next) => {
  const ticker = String(req.params.ticker || '').toUpperCase().trim();
  if (!validTicker(ticker)) {
    res.status(400).json({ error: 'Invalid ticker.' });
    return;
  }
  if (!isAnthropicEnabled()) {
    res.status(503).json({ error: 'AI outlook is unavailable. Set ANTHROPIC_API_KEY in server/.env.' });
    return;
  }
  try {
    const report = await buildResearchReport(ticker);
    if (!report.snapshot && !report.priceHistory) {
      res.status(404).json({ error: `No data found for ${ticker}.` });
      return;
    }
    const outlook = await generateOutlook(report);
    res.json({ ticker, outlook });
  } catch (err: any) {
    handleAiError(err, res, next, 'Outlook');
  }
});

// Multi-horizon price forecast — structured AI synthesis weighting inputs by horizon.
const VALID_HORIZONS = new Set<ForecastHorizon>(['1H', '1D', '3D', '1W']);

router.post('/:ticker/forecast', requireAuth, async (req, res, next) => {
  const ticker = String(req.params.ticker || '').toUpperCase().trim();
  if (!validTicker(ticker)) {
    res.status(400).json({ error: 'Invalid ticker.' });
    return;
  }
  if (!isAnthropicEnabled()) {
    res.status(503).json({ error: 'AI forecast is unavailable. Set ANTHROPIC_API_KEY in server/.env.' });
    return;
  }
  // Optional: which horizons to forecast. Defaults to all four.
  const rawHorizons = Array.isArray(req.body?.horizons) ? req.body.horizons : null;
  const horizons: ForecastHorizon[] | undefined = rawHorizons
    ? rawHorizons.filter((h: unknown): h is ForecastHorizon => VALID_HORIZONS.has(h as ForecastHorizon))
    : undefined;
  try {
    const report = await buildResearchReport(ticker);
    if (!report.snapshot && !report.priceHistory) {
      res.status(404).json({ error: `No data found for ${ticker}.` });
      return;
    }
    // Feed the model its own past accuracy so it can calibrate over time.
    const accuracyBlock = formatAccuracyForPrompt(await getAccuracySummary(ticker));
    const forecast = await generateForecast(report, { horizons, accuracyBlock });
    // Log predictions so a background job can grade them later (the learning loop).
    void logForecast(ticker, forecast);
    res.json({ ticker, forecast });
  } catch (err: any) {
    handleAiError(err, res, next, 'Forecast');
  }
});

// ── Quick-scan: price + technicals only (no news / AI / options flow) ──────
router.get('/:ticker/quick', requireAuth, async (req, res, next) => {
  const ticker = String(req.params.ticker || '').toUpperCase().trim();
  if (!validTicker(ticker)) { res.status(400).json({ error: 'Invalid ticker.' }); return; }
  try {
    const [quote, bars] = await Promise.all([
      (await twelveDataQuote(ticker)) || (await finnhubQuote(ticker)) || (await yahooQuote(ticker)),
      (await twelveDataHistory(ticker, 60)) || (await yahooHistory(ticker, 60)) || (await alphaVantageHistory(ticker)),
    ]);
    if (!quote) { res.status(404).json({ error: `No data for ${ticker}.` }); return; }

    // Inline technicals (same logic as research.ts — avoids a circular import)
    let rsiVal: number | null = null;
    let macdVal: { macd: number; signal: number; histogram: number } | null = null;
    let sma50Val: number | null = null;
    let sma200Val: number | null = null;

    if (bars && bars.length) {
      const closes = bars.map((b: any) => b.close);

      // RSI-14
      const period = 14;
      if (bars.length > period) {
        let g = 0, l = 0;
        for (let i = bars.length - period; i < bars.length; i++) {
          const d = bars[i].close - bars[i - 1].close;
          if (d >= 0) g += d; else l -= d;
        }
        const al = l / period;
        if (al === 0) rsiVal = 100;
        else rsiVal = 100 - 100 / (1 + (g / period) / al);
      }

      // EMA helper
      const emaFn = (vals: number[], w: number) => {
        const k = 2 / (w + 1); let p = vals[0];
        return vals.map((v: number, i: number) => { p = i === 0 ? v : v * k + p * (1 - k); return p; });
      };

      // MACD(12,26,9)
      if (closes.length >= 35) {
        const e12 = emaFn(closes, 12); const e26 = emaFn(closes, 26);
        const ml = e12.map((v: number, i: number) => v - e26[i]);
        const sl = emaFn(ml.slice(-50), 9);
        const last = ml[ml.length - 1]; const sig = sl[sl.length - 1];
        macdVal = { macd: last, signal: sig, histogram: last - sig };
      }

      // SMAs
      if (closes.length >= 50) sma50Val = closes.slice(-50).reduce((s: number, v: number) => s + v, 0) / 50;
      if (closes.length >= 200) sma200Val = closes.slice(-200).reduce((s: number, v: number) => s + v, 0) / 200;
    }

    res.json({
      ticker,
      price: quote.price,
      change: quote.change ?? 0,
      changePct: quote.changePct ?? 0,
      high: quote.high ?? null,
      low: quote.low ?? null,
      volume: quote.volume ?? null,
      rsi: rsiVal,
      macd: macdVal,
      sma50: sma50Val,
      sma200: sma200Val,
    });
  } catch (err) { next(err); }
});

// ── Options chain (full Polygon snapshot) ──────────────────────────────────
import { polygonOptionsChain } from '../services/polygon';

router.get('/:ticker/options-chain', requireAuth, async (req, res, next) => {
  const ticker = String(req.params.ticker || '').toUpperCase().trim();
  if (!validTicker(ticker)) { res.status(400).json({ error: 'Invalid ticker.' }); return; }
  try {
    const chain = await polygonOptionsChain(ticker, Number(req.query.limit) || 250);
    if (!chain) { res.status(404).json({ error: 'Options chain unavailable. POLYGON_API_KEY may not be set.' }); return; }
    // Attach spot price
    const q = (await twelveDataQuote(ticker)) || (await finnhubQuote(ticker)) || (await yahooQuote(ticker));
    if (q) chain.spot = q.price;
    res.json(chain);
  } catch (err) { next(err); }
});

// ── Forecast accuracy (hit-rate badge) ────────────────────────────────────
router.get('/:ticker/forecast-accuracy', requireAuth, async (req, res, next) => {
  const ticker = String(req.params.ticker || '').toUpperCase().trim();
  if (!validTicker(ticker)) { res.status(400).json({ error: 'Invalid ticker.' }); return; }
  try {
    const summary = await getAccuracySummary(ticker);
    res.json({ ticker, accuracy: summary });
  } catch (err) { next(err); }
});

// Expanded news feed for a specific ticker — used by the dedicated News page.
router.get('/:ticker/profile', requireAuth, async (req, res, next) => {
  const ticker = String(req.params.ticker || '').toUpperCase().trim();
  if (!validTicker(ticker)) {
    res.status(400).json({ error: 'Invalid ticker symbol.' });
    return;
  }
  try {
    const { polygonProfile } = await import('../services/polygonProvider.js');
    const { finnhubProfile } = await import('../services/finnhub.js');
    const [poly, fh] = await Promise.allSettled([
      polygonProfile(ticker),
      finnhubProfile(ticker),
    ]);
    const p = poly.status === 'fulfilled' ? poly.value : null;
    const f = fh.status === 'fulfilled' ? fh.value : null;
    // Finnhub marketCap is in millions
    const fhMarketCap = f?.marketCap ? f.marketCap * 1_000_000 : null;
    res.json({
      ticker,
      name: p?.name || f?.name || null,
      description: p?.summary || null,
      sector: p?.sector || null,
      industry: p?.industry || null,
      exchange: p?.exchange || f?.exchange || null,
      website: p?.website || f?.weburl || null,
      logo: p?.logo || f?.logo || null,
      employees: p?.employees || null,
      ipo: f?.ipo || null,
      marketCap: p?.marketCap ?? fhMarketCap,
    });
  } catch (err) {
    next(err);
  }
});

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
