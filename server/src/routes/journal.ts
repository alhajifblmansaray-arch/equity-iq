import { Router } from 'express';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '../middleware/auth';
import { TradeJournal, ITradeJournal } from '../models/TradeJournal';
import { IUser } from '../models/User';

const SCREENSHOT_SYSTEM_PROMPT = `You are a trade data extraction engine for EquityIQ's trading journal. You will be given one or more screenshots of brokerage trade confirmations, options chain details, or portfolio holdings pages. Extract the trade information and return ONLY valid JSON matching the schema below — no preamble, no markdown fences, no explanation.

RULES:
1. Determine assetType first: "option" if strike/expiry/contract type is present, otherwise "stock".
2. For options, entryPremium and exitPremium are the PER-CONTRACT price (e.g. "100 x $0.51" means entryPremium: 0.51, NOT the total cost). Never confuse the underlying stock price with the premium.
3. direction is "long" if the action was "Buy to open" / "Limit buy" / "Market buy", and "short" if "Sell to open".
4. If a screenshot shows "Sell to close" or "Buy to close", treat it as the EXIT — populate exitPremium/exitDate, not entryPremium/entryDate.
5. If multiple screenshots are provided together, merge them into a single trade record.
6. Pull any available Greeks (IV, delta, theta, gamma, vega) into optionDetails as *Entry fields if near entry time. Flag timestamp mismatches in "notes".
7. Extract account type (TFSA, RRSP, margin, non-registered, etc.) if visible.
8. Use "Filled" timestamp for entryDate/exitDate, not "Submitted".
9. Do NOT compute P&L. Leave pnl fields null.
10. If a field is not visible, omit it or set it to null — never fabricate.
11. If screenshots are ambiguous or insufficient, return {"error": "description of what's missing"}.

OUTPUT SCHEMA (return ONLY this JSON, nothing else):
{
  "ticker": string,
  "assetType": "stock" | "option",
  "direction": "long" | "short",
  "account": string | null,
  "entryDate": ISO 8601 string | null,
  "exitDate": ISO 8601 string | null,
  "fees": number | null,
  "stockDetails": { "entryPrice": number, "exitPrice": number|null, "shares": number } | null,
  "optionDetails": {
    "contractType": "call" | "put",
    "strike": number,
    "expiry": ISO 8601 date string,
    "contracts": number,
    "entryPremium": number,
    "exitPremium": number | null,
    "multiplier": 100,
    "underlyingPriceAtEntry": number | null,
    "underlyingPriceAtExit": number | null,
    "ivEntry": number | null,
    "deltaEntry": number | null,
    "thetaEntry": number | null,
    "gammaEntry": number | null,
    "vegaEntry": number | null
  } | null,
  "notes": string | null
}`;

const NL_SYSTEM_PROMPT = `You are a trade entry parser for a trading journal. The user will type a short natural-language description of a trade. Extract the fields and return ONLY valid JSON matching the schema below — no preamble, no markdown fences.

Examples:
- "SOFI 19p 7/17, bought .51 sold .65, 100 contracts, TFSA, faded overbought RSI" → option trade
- "bought 50 AAPL at 190, sold 195, margin account" → stock trade
- "NVDA call 130 Aug 15 expiry, 2 contracts, paid 2.40" → open option trade

OUTPUT SCHEMA (return ONLY this JSON):
{
  "ticker": string | null,
  "assetType": "stock" | "option" | null,
  "direction": "long" | "short" | null,
  "account": string | null,
  "entryDate": ISO 8601 string | null,
  "exitDate": ISO 8601 string | null,
  "fees": number | null,
  "stockDetails": { "entryPrice": number | null, "exitPrice": number | null, "shares": number | null } | null,
  "optionDetails": {
    "contractType": "call" | "put" | null,
    "strike": number | null,
    "expiry": string | null,
    "contracts": number | null,
    "entryPremium": number | null,
    "exitPremium": number | null,
    "multiplier": 100
  } | null,
  "thesis": string | null,
  "setupTags": string[],
  "confidence": "high" | "medium" | "low"
}

For setupTags, infer from context: "faded overbought RSI" → ["mean_reversion"], "earnings play" → ["earnings_play"], "breakout" → ["breakout"], etc.
For thesis, extract any reasoning the user gave (e.g. "faded overbought RSI" → "Faded overbought RSI signal").
If the year is missing from a date, assume the current year.
Set confidence to "low" if critical fields (ticker, price/premium) are missing.`;

const router = Router();
router.use(requireAuth);

function sanitize(t: ITradeJournal) {
  return {
    id: t.id,
    ticker: t.ticker,
    direction: t.direction,
    assetType: t.assetType,
    status: t.status,
    entryDate: t.entryDate?.toISOString(),
    thesis: t.thesis,
    setupTags: t.setupTags,
    catalystTags: t.catalystTags,
    emotionalStateEntry: t.emotionalStateEntry,
    convictionLevel: t.convictionLevel,
    stopLoss: t.stopLoss,
    targetPrice: t.targetPrice,
    stockDetails: t.stockDetails,
    optionDetails: t.optionDetails,
    technicalSnapshotEntry: t.technicalSnapshotEntry,
    linkedResearchId: t.linkedResearchId,
    linkedForecastId: t.linkedForecastId,
    linkedAlertId: t.linkedAlertId,
    agreedWithForecast: t.agreedWithForecast,
    exitDate: t.exitDate?.toISOString(),
    fees: t.fees,
    emotionalStateExit: t.emotionalStateExit,
    exitReason: t.exitReason,
    mistakeTags: t.mistakeTags,
    realizedPnl: t.realizedPnl,
    realizedPnlPct: t.realizedPnlPct,
    rMultiple: t.rMultiple,
    holdingPeriodDays: t.holdingPeriodDays,
    didFollowThesis: t.didFollowThesis,
    reviewNotes: t.reviewNotes,
    createdAt: t.createdAt?.toISOString(),
  };
}

const entrySchema = z.object({
  ticker: z.string().regex(/^[A-Z0-9.\-]{1,10}$/i),
  direction: z.enum(['long', 'short']),
  assetType: z.enum(['stock', 'option', 'etf', 'crypto']).default('stock'),
  entryDate: z.string(),
  thesis: z.string().max(2000).default(''),
  setupTags: z.array(z.string()).default([]),
  catalystTags: z.array(z.string()).default([]),
  emotionalStateEntry: z.string().default('calm'),
  convictionLevel: z.number().min(1).max(5).default(3),
  stopLoss: z.number().positive().optional(),
  targetPrice: z.number().positive().optional(),
  stockDetails: z.object({
    entryPrice: z.number().positive(),
    shares: z.number().positive(),
  }).optional(),
  optionDetails: z.object({
    contractType: z.enum(['call', 'put']),
    strike: z.number().positive(),
    expiry: z.string(),
    contracts: z.number().positive(),
    multiplier: z.number().default(100),
    entryPremium: z.number().positive(),
    underlyingPriceAtEntry: z.number().optional(),
    ivEntry: z.number().optional(),
    deltaEntry: z.number().optional(),
    thetaEntry: z.number().optional(),
    dteEntry: z.number().optional(),
  }).optional(),
  technicalSnapshotEntry: z.object({
    price: z.number(),
    rsi: z.number().optional(),
    sma50: z.number().optional(),
    sma200: z.number().optional(),
    macdHistogram: z.number().optional(),
  }).optional(),
  linkedResearchId: z.string().optional(),
  linkedForecastId: z.string().optional(),
  linkedAlertId: z.string().optional(),
  agreedWithForecast: z.boolean().nullable().optional(),
});

const closeSchema = z.object({
  exitDate: z.string(),
  fees: z.number().min(0).default(0),
  emotionalStateExit: z.string().optional(),
  exitReason: z.string().max(500).optional(),
  mistakeTags: z.array(z.string()).default([]),
  didFollowThesis: z.boolean().optional(),
  reviewNotes: z.string().max(2000).optional(),
  // Stock exit
  exitPrice: z.number().positive().optional(),
  // Option exit
  exitPremium: z.number().positive().optional(),
  underlyingPriceAtExit: z.number().optional(),
  ivExit: z.number().optional(),
});

// GET /api/journal
router.get('/', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const { status, ticker } = req.query;
    const filter: any = { user: user.id };
    if (status) filter.status = status;
    if (ticker) filter.ticker = (ticker as string).toUpperCase();
    const trades = await TradeJournal.find(filter).sort({ entryDate: -1 }).limit(200);
    res.json({ trades: trades.map(sanitize) });
  } catch (err) { next(err); }
});

// GET /api/journal/stats
router.get('/stats', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const closed = await TradeJournal.find({ user: user.id, status: 'closed' });
    if (!closed.length) return res.json({ totalTrades: 0 });

    const wins = closed.filter(t => (t.realizedPnl ?? 0) > 0);
    const losses = closed.filter(t => (t.realizedPnl ?? 0) <= 0);
    const totalPnl = closed.reduce((s, t) => s + (t.realizedPnl ?? 0), 0);
    const avgWin = wins.length ? wins.reduce((s, t) => s + (t.realizedPnl ?? 0), 0) / wins.length : 0;
    const avgLoss = losses.length ? losses.reduce((s, t) => s + (t.realizedPnl ?? 0), 0) / losses.length : 0;

    // By setup tag
    const bySetup: Record<string, { trades: number; wins: number; pnl: number }> = {};
    for (const t of closed) {
      for (const tag of t.setupTags ?? []) {
        if (!bySetup[tag]) bySetup[tag] = { trades: 0, wins: 0, pnl: 0 };
        bySetup[tag].trades++;
        if ((t.realizedPnl ?? 0) > 0) bySetup[tag].wins++;
        bySetup[tag].pnl += t.realizedPnl ?? 0;
      }
    }

    // Mistake frequency
    const mistakeCount: Record<string, number> = {};
    for (const t of closed) {
      for (const m of t.mistakeTags ?? []) {
        mistakeCount[m] = (mistakeCount[m] ?? 0) + 1;
      }
    }

    // Forecast agreement accuracy
    const withForecast = closed.filter(t => t.agreedWithForecast != null);
    const agreedWins = withForecast.filter(t => t.agreedWithForecast && (t.realizedPnl ?? 0) > 0).length;
    const agreedTotal = withForecast.filter(t => t.agreedWithForecast).length;
    const fadedWins = withForecast.filter(t => !t.agreedWithForecast && (t.realizedPnl ?? 0) > 0).length;
    const fadedTotal = withForecast.filter(t => !t.agreedWithForecast).length;

    res.json({
      totalTrades: closed.length,
      openTrades: await TradeJournal.countDocuments({ user: user.id, status: 'open' }),
      winRate: wins.length / closed.length,
      totalPnl,
      avgWin,
      avgLoss,
      profitFactor: avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : null,
      bySetup,
      mistakeCount,
      forecastEdge: {
        agreedWinRate: agreedTotal ? agreedWins / agreedTotal : null,
        fadedWinRate: fadedTotal ? fadedWins / fadedTotal : null,
        agreedTotal,
        fadedTotal,
      },
    });
  } catch (err) { next(err); }
});

// POST /api/journal/parse-screenshot — vision call to extract trade from images
router.post('/parse-screenshot', async (req, res, next) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) { res.status(503).json({ error: 'ANTHROPIC_API_KEY not set.' }); return; }
    const { images } = req.body as { images: string[] }; // base64 data URLs
    if (!images?.length) { res.status(400).json({ error: 'No images provided.' }); return; }

    const client = new Anthropic({ apiKey });
    const imageContent = images.map((img: string) => {
      const [header, data] = img.split(',');
      const mediaType = (header.match(/data:([^;]+)/) ?.[1] ?? 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
      return { type: 'image' as const, source: { type: 'base64' as const, media_type: mediaType, data } };
    });

    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: SCREENSHOT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: [...imageContent, { type: 'text', text: 'Extract the trade data from these screenshots.' }] }],
    });

    const text = response.content.find(b => b.type === 'text')?.text ?? '';
    const jsonText = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(jsonText);
    res.json(result);
  } catch (err: any) {
    if (err instanceof SyntaxError) { res.status(422).json({ error: 'Could not parse AI response as JSON.' }); return; }
    next(err);
  }
});

// POST /api/journal/parse-text — NL quick entry
router.post('/parse-text', async (req, res, next) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) { res.status(503).json({ error: 'ANTHROPIC_API_KEY not set.' }); return; }
    const { text } = req.body as { text: string };
    if (!text?.trim()) { res.status(400).json({ error: 'No text provided.' }); return; }

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: NL_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: text }],
    });

    const raw = response.content.find(b => b.type === 'text')?.text ?? '';
    const jsonText = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(jsonText);
    res.json(result);
  } catch (err: any) {
    if (err instanceof SyntaxError) { res.status(422).json({ error: 'Could not parse AI response.' }); return; }
    next(err);
  }
});

// POST /api/journal
router.post('/', async (req, res, next) => {
  const parsed = entrySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input.' });
    return;
  }
  try {
    const user = req.user as IUser;
    const d = parsed.data;
    const trade = await TradeJournal.create({
      user: user.id,
      ...d,
      entryDate: new Date(d.entryDate),
    });
    res.status(201).json({ trade: sanitize(trade) });
  } catch (err) { next(err); }
});

// PATCH /api/journal/:id/close
router.patch('/:id/close', async (req, res, next) => {
  const parsed = closeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input.' });
    return;
  }
  try {
    const user = req.user as IUser;
    const trade = await TradeJournal.findOne({ _id: req.params.id, user: user.id });
    if (!trade) { res.status(404).json({ error: 'Trade not found.' }); return; }

    const d = parsed.data;
    trade.exitDate = new Date(d.exitDate);
    trade.fees = d.fees;
    trade.emotionalStateExit = d.emotionalStateExit as any;
    trade.exitReason = d.exitReason;
    trade.mistakeTags = d.mistakeTags as any;
    trade.didFollowThesis = d.didFollowThesis;
    trade.reviewNotes = d.reviewNotes;
    trade.status = 'closed';

    const dir = trade.direction === 'long' ? 1 : -1;

    if (trade.assetType === 'option' && trade.optionDetails) {
      const { entryPremium, contracts, multiplier = 100 } = trade.optionDetails;
      const exitPremium = d.exitPremium;
      if (exitPremium == null) { res.status(400).json({ error: 'exitPremium is required for option trades.' }); return; }
      trade.optionDetails.exitPremium = exitPremium;
      if (d.underlyingPriceAtExit) trade.optionDetails.underlyingPriceAtExit = d.underlyingPriceAtExit;
      if (d.ivExit) trade.optionDetails.ivExit = d.ivExit;
      const gross = dir * (exitPremium - entryPremium) * contracts * multiplier;
      trade.realizedPnl = gross - (d.fees ?? 0);
      trade.realizedPnlPct = ((exitPremium - entryPremium) / entryPremium) * dir * 100;
      if (trade.stopLoss) {
        const risk = Math.abs(entryPremium - trade.stopLoss) * contracts * multiplier;
        trade.rMultiple = risk > 0 ? trade.realizedPnl / risk : undefined;
      }
    } else if (trade.stockDetails) {
      const { entryPrice, shares } = trade.stockDetails;
      const exitPrice = d.exitPrice;
      if (exitPrice == null) { res.status(400).json({ error: 'exitPrice is required for stock trades.' }); return; }
      trade.stockDetails.exitPrice = exitPrice;
      const gross = dir * (exitPrice - entryPrice) * shares;
      trade.realizedPnl = gross - (d.fees ?? 0);
      trade.realizedPnlPct = ((exitPrice - entryPrice) / entryPrice) * dir * 100;
      if (trade.stopLoss) {
        const risk = Math.abs(entryPrice - trade.stopLoss) * shares;
        trade.rMultiple = risk > 0 ? trade.realizedPnl / risk : undefined;
      }
    }

    const ms = trade.exitDate!.getTime() - trade.entryDate.getTime();
    trade.holdingPeriodDays = Math.round(ms / 86_400_000);

    await trade.save();
    res.json({ trade: sanitize(trade) });
  } catch (err) { next(err); }
});

// PATCH /api/journal/:id — edit any field on an existing entry (re-computes P&L if closed)
router.patch('/:id', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const trade = await TradeJournal.findOne({ _id: req.params.id, user: user.id });
    if (!trade) { res.status(404).json({ error: 'Trade not found.' }); return; }

    const allowed = [
      'direction', 'thesis', 'setupTags', 'catalystTags', 'emotionalStateEntry', 'convictionLevel',
      'stopLoss', 'targetPrice', 'agreedWithForecast', 'entryDate',
      'stockDetails', 'optionDetails', 'exitReason', 'mistakeTags',
      'emotionalStateExit', 'didFollowThesis', 'reviewNotes', 'fees',
    ];
    for (const key of allowed) {
      if (req.body[key] !== undefined) (trade as any)[key] = req.body[key];
    }

    // Re-compute P&L if the trade is closed and prices changed
    if (trade.status === 'closed') {
      const dir = trade.direction === 'long' ? 1 : -1;
      if (trade.assetType === 'option' && trade.optionDetails?.exitPremium != null) {
        const { entryPremium, exitPremium, contracts, multiplier = 100 } = trade.optionDetails;
        const gross = dir * (exitPremium - entryPremium) * contracts * multiplier;
        trade.realizedPnl = gross - (trade.fees ?? 0);
        trade.realizedPnlPct = ((exitPremium - entryPremium) / entryPremium) * dir * 100;
      } else if (trade.stockDetails?.exitPrice != null) {
        const { entryPrice, exitPrice, shares } = trade.stockDetails;
        const gross = dir * (exitPrice - entryPrice) * shares;
        trade.realizedPnl = gross - (trade.fees ?? 0);
        trade.realizedPnlPct = ((exitPrice - entryPrice) / entryPrice) * dir * 100;
      }
    }

    await trade.save();
    res.json({ trade: sanitize(trade) });
  } catch (err) { next(err); }
});

// DELETE /api/journal/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    await TradeJournal.deleteOne({ _id: req.params.id, user: user.id });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
