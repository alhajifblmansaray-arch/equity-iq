import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { TradeJournal, ITradeJournal } from '../models/TradeJournal';
import { IUser } from '../models/User';

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
      'thesis', 'setupTags', 'catalystTags', 'emotionalStateEntry', 'convictionLevel',
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
