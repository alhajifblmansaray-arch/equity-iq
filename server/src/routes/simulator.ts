import axios from 'axios';
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { SimulatorLimitOrder } from '../models/SimulatorLimitOrder';
import { SimulatorPortfolio } from '../models/SimulatorPortfolio';
import { SimulatorSnapshot } from '../models/SimulatorSnapshot';
import { SimulatorTrade } from '../models/SimulatorTrade';
import { IUser } from '../models/User';
import { generatePortfolioCoach } from '../services/anthropic';
import { finnhubQuote } from '../services/finnhub';
import { twelveDataQuote } from '../services/twelveData';
import { yahooQuote } from '../services/yahoo';

const router = Router();
router.use(requireAuth);

const STARTING_BALANCE = 10_000;

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function recordSnapshot(userId: string, totalValue: number, cash: number, investedValue: number) {
  await SimulatorSnapshot.findOneAndUpdate(
    { user: userId, date: today() },
    { totalValue, cash, investedValue },
    { upsert: true, new: true }
  ).catch(() => {});
}

async function livePrice(ticker: string): Promise<number | null> {
  const q =
    (await twelveDataQuote(ticker)) ||
    (await finnhubQuote(ticker)) ||
    (await yahooQuote(ticker));
  return q?.price ?? null;
}

async function getOrCreatePortfolio(userId: string) {
  let p = await SimulatorPortfolio.findOne({ user: userId });
  if (!p) {
    p = await SimulatorPortfolio.create({
      user: userId,
      cash: STARTING_BALANCE,
      startingBalance: STARTING_BALANCE,
      holdings: [],
      season: new Date().toISOString().slice(0, 7),
    });
  }
  return p;
}

function generateDebrief(
  ticker: string,
  shares: number,
  avgCost: number,
  sellPrice: number,
  pnl: number,
  pnlPct: number
): string {
  const abs = Math.abs(pnlPct).toFixed(1);
  const dollarAbs = Math.abs(pnl).toFixed(2);
  if (pnl > 0) {
    if (pnlPct >= 20) return `Strong trade. You bought ${ticker} at $${avgCost.toFixed(2)} and sold at $${sellPrice.toFixed(2)} — a ${abs}% gain ($${dollarAbs}). That's the kind of disciplined profit-taking that protects your gains. Key lesson: always have a target price before you buy.`;
    if (pnlPct >= 5) return `Solid trade. ${ticker} gave you a ${abs}% gain ($${dollarAbs}). Not every trade needs to be a home run — consistent small gains compound over time. Consider why it worked: was it a technical setup, good earnings, or sector momentum?`;
    return `Small win. You made ${abs}% ($${dollarAbs}) on ${ticker}. Every profitable trade builds good habits. Reflect on what gave you conviction to buy — that instinct gets sharper with practice.`;
  } else {
    if (pnlPct <= -20) return `Tough loss. ${ticker} cost you ${abs}% ($${dollarAbs}). Before your next trade, ask: did the original reason to buy this stock change, or did you sell on panic? If the thesis changed, selling was right. If you panicked, consider using stop-losses to remove emotion from the decision.`;
    if (pnlPct <= -5) return `A ${abs}% loss ($${dollarAbs}) on ${ticker}. Losses are part of trading — professional traders lose on 40-50% of their trades but still profit by letting winners run and cutting losers early. Review your entry: was there a clear reason to buy, and did you size the position appropriately?`;
    return `Small loss of ${abs}% ($${dollarAbs}) on ${ticker}. Tiny losses are fine — keeping losses small is one of the most important trading skills. The key is to not let small losses turn into big ones.`;
  }
}

/* ── Sector helper (Polygon reference) ─────────────────────────────────── */

const sectorCache = new Map<string, { sector: string; expires: number }>();

function sectorFromSic(sic: string): string {
  const s = sic.toLowerCase();
  if (s.includes('software') || s.includes('semiconductor') || s.includes('computer') || s.includes('electronic')) return 'Technology';
  if (s.includes('bank') || s.includes('insurance') || s.includes('finance') || s.includes('credit') || s.includes('invest') || s.includes('broker')) return 'Financials';
  if (s.includes('pharmaceutical') || s.includes('hospital') || s.includes('health') || s.includes('medical') || s.includes('drug') || s.includes('biotech')) return 'Healthcare';
  if (s.includes('retail') || s.includes('catalog') || s.includes('apparel') || s.includes('restaurant') || s.includes('hotel') || s.includes('entertain')) return 'Consumer Discretionary';
  if (s.includes('food') || s.includes('beverage') || s.includes('household') || s.includes('tobacco') || s.includes('personal care')) return 'Consumer Staples';
  if (s.includes('oil') || s.includes('gas') || s.includes('petroleum') || s.includes('coal') || s.includes('mining')) return 'Energy';
  if (s.includes('electric') || s.includes('water') || s.includes('sanitary') || s.includes('utility') || s.includes('utilities')) return 'Utilities';
  if (s.includes('telephone') || s.includes('cable') || s.includes('media') || s.includes('broadcast') || s.includes('internet services')) return 'Communication Services';
  if (s.includes('auto') || s.includes('aerospace') || s.includes('defense') || s.includes('machine') || s.includes('transport') || s.includes('railroad')) return 'Industrials';
  if (s.includes('real estate') || s.includes('reit') || s.includes('mortgage') || s.includes('apartment')) return 'Real Estate';
  if (s.includes('chemical') || s.includes('metal') || s.includes('steel') || s.includes('aluminum') || s.includes('paper')) return 'Materials';
  return 'Other';
}

async function getTickerSector(ticker: string): Promise<string> {
  const hit = sectorCache.get(ticker);
  if (hit && hit.expires > Date.now()) return hit.sector;
  try {
    const key = process.env.POLYGON_API_KEY;
    if (!key) return 'Other';
    const { data } = await axios.get(
      `https://api.polygon.io/v3/reference/tickers/${ticker}`,
      { params: { apiKey: key }, timeout: 5_000 }
    );
    const sic = data?.results?.sic_description || '';
    const sector = sic ? sectorFromSic(sic) : (data?.results?.type === 'ETF' ? 'ETF' : 'Other');
    sectorCache.set(ticker, { sector, expires: Date.now() + 24 * 60 * 60 * 1000 });
    return sector;
  } catch {
    return 'Other';
  }
}

/* ── Holdings helper with short support ────────────────────────────────── */

function buildHolding(h: { ticker: string; shares: number; avgCost: number }, current: number | null) {
  const isShort = h.shares < 0;
  const absShares = Math.abs(h.shares);
  const costBasis = h.avgCost * absShares;
  const marketValue = current != null ? current * absShares : null;
  const pnl = marketValue != null
    ? (isShort ? costBasis - marketValue : marketValue - costBasis)
    : null;
  const pnlPct = pnl != null && costBasis > 0 ? (pnl / costBasis) * 100 : null;
  return {
    ticker: h.ticker,
    shares: h.shares,
    avgCost: h.avgCost,
    currentPrice: current,
    marketValue,
    costBasis,
    pnl,
    pnlPct,
    isShort,
  };
}

/* ── GET /api/simulator ─────────────────────────────────────────────────── */

router.get('/', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const portfolio = await getOrCreatePortfolio(String(user.id));

    const priceMap: Record<string, number | null> = {};
    await Promise.all(portfolio.holdings.map(async (h) => { priceMap[h.ticker] = await livePrice(h.ticker); }));

    const holdingsWithPrices = portfolio.holdings.map((h) => buildHolding(h, priceMap[h.ticker]));

    // Total value: cash + long market values - short coverage costs
    // Using formula: totalValue = cash + Σ(price × shares) [works for neg shares too]
    const totalMarketValue = holdingsWithPrices.reduce((s, h) => {
      if (h.currentPrice != null) return s + h.currentPrice * h.shares;
      // fallback: long = costBasis, short = 0 (no pnl assumption)
      return s + (h.isShort ? 0 : h.costBasis);
    }, 0);
    const totalValue = portfolio.cash + totalMarketValue;
    const totalPnl = totalValue - STARTING_BALANCE;
    const totalPnlPct = (totalPnl / STARTING_BALANCE) * 100;

    const investedValue = holdingsWithPrices.reduce((s, h) => s + (h.marketValue ?? h.costBasis), 0);
    recordSnapshot(String(user.id), totalValue, portfolio.cash, investedValue);

    res.json({
      cash: portfolio.cash,
      startingBalance: STARTING_BALANCE,
      totalValue,
      totalPnl,
      totalPnlPct,
      holdings: holdingsWithPrices,
      season: portfolio.season,
      resetAt: portfolio.resetAt,
    });
  } catch (err) { next(err); }
});

/* ── GET /api/simulator/snapshots ──────────────────────────────────────── */

router.get('/snapshots', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const snapshots = await SimulatorSnapshot.find({ user: user.id })
      .sort({ date: 1 })
      .limit(365)
      .lean();
    res.json({ snapshots });
  } catch (err) { next(err); }
});

/* ── GET /api/simulator/sectors ────────────────────────────────────────── */

router.get('/sectors', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const portfolio = await getOrCreatePortfolio(String(user.id));
    const sectors: Record<string, string> = {};
    await Promise.all(portfolio.holdings.map(async (h) => {
      sectors[h.ticker] = await getTickerSector(h.ticker);
    }));
    res.json({ sectors });
  } catch (err) { next(err); }
});

/* ── POST /api/simulator/buy ───────────────────────────────────────────── */

router.post('/buy', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const ticker = String(req.body.ticker || '').toUpperCase().trim();
    const shares = Number(req.body.shares);
    const note = req.body.note ? String(req.body.note).slice(0, 280) : null;

    if (!/^[A-Z][A-Z0-9.\-]{0,9}$/.test(ticker))
      return void res.status(400).json({ error: 'Invalid ticker.' });
    if (!Number.isFinite(shares) || shares <= 0 || shares !== Math.floor(shares))
      return void res.status(400).json({ error: 'Shares must be a positive whole number.' });

    const price = await livePrice(ticker);
    if (price == null)
      return void res.status(404).json({ error: `Could not get a price for ${ticker}.` });

    const cost = price * shares;
    const portfolio = await getOrCreatePortfolio(String(user.id));

    if (portfolio.cash < cost)
      return void res.status(400).json({
        error: `Not enough cash. Need $${cost.toFixed(2)} but have $${portfolio.cash.toFixed(2)}.`,
      });

    const existing = portfolio.holdings.find((h) => h.ticker === ticker && h.shares > 0);
    if (existing) {
      const totalShares = existing.shares + shares;
      existing.avgCost = (existing.avgCost * existing.shares + price * shares) / totalShares;
      existing.shares = totalShares;
    } else {
      portfolio.holdings.push({ ticker, shares, avgCost: price });
    }
    portfolio.cash -= cost;
    await portfolio.save();

    await SimulatorTrade.create({ user: user.id, ticker, action: 'buy', shares, price, total: cost, pnl: null, pnlPct: null, aiDebrief: null, note, season: portfolio.season });

    const investedValue = portfolio.holdings.reduce((s, h) => s + h.avgCost * Math.abs(h.shares), 0);
    recordSnapshot(String(user.id), portfolio.cash + investedValue, portfolio.cash, investedValue);

    res.json({ ok: true, ticker, shares, price, total: cost, cashRemaining: portfolio.cash });
  } catch (err) { next(err); }
});

/* ── POST /api/simulator/sell ──────────────────────────────────────────── */

router.post('/sell', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const ticker = String(req.body.ticker || '').toUpperCase().trim();
    const shares = Number(req.body.shares);
    const note = req.body.note ? String(req.body.note).slice(0, 280) : null;

    if (!/^[A-Z][A-Z0-9.\-]{0,9}$/.test(ticker))
      return void res.status(400).json({ error: 'Invalid ticker.' });
    if (!Number.isFinite(shares) || shares <= 0 || shares !== Math.floor(shares))
      return void res.status(400).json({ error: 'Shares must be a positive whole number.' });

    const portfolio = await getOrCreatePortfolio(String(user.id));
    const holding = portfolio.holdings.find((h) => h.ticker === ticker && h.shares > 0);

    if (!holding || holding.shares < shares)
      return void res.status(400).json({
        error: `You don't have ${shares} shares of ${ticker} (long). You hold ${holding?.shares ?? 0}.`,
      });

    const price = await livePrice(ticker);
    if (price == null)
      return void res.status(404).json({ error: `Could not get a price for ${ticker}.` });

    const proceeds = price * shares;
    const costBasis = holding.avgCost * shares;
    const pnl = proceeds - costBasis;
    const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

    holding.shares -= shares;
    if (holding.shares === 0) portfolio.holdings = portfolio.holdings.filter((h) => h.ticker !== ticker || h.shares < 0);
    portfolio.cash += proceeds;
    await portfolio.save();

    const debrief = generateDebrief(ticker, shares, holding.avgCost + (pnl / shares) / price * price, price, pnl, pnlPct);
    await SimulatorTrade.create({ user: user.id, ticker, action: 'sell', shares, price, total: proceeds, pnl, pnlPct, aiDebrief: debrief, note, season: portfolio.season });

    const investedValue = portfolio.holdings.reduce((s, h) => s + h.avgCost * Math.abs(h.shares), 0);
    recordSnapshot(String(user.id), portfolio.cash + investedValue, portfolio.cash, investedValue);

    res.json({ ok: true, ticker, shares, price, proceeds, pnl, pnlPct, cashNow: portfolio.cash });
  } catch (err) { next(err); }
});

/* ── POST /api/simulator/short ─────────────────────────────────────────── */

router.post('/short', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const ticker = String(req.body.ticker || '').toUpperCase().trim();
    const shares = Number(req.body.shares);
    const note = req.body.note ? String(req.body.note).slice(0, 280) : null;

    if (!/^[A-Z][A-Z0-9.\-]{0,9}$/.test(ticker))
      return void res.status(400).json({ error: 'Invalid ticker.' });
    if (!Number.isFinite(shares) || shares <= 0 || shares !== Math.floor(shares))
      return void res.status(400).json({ error: 'Shares must be a positive whole number.' });

    const price = await livePrice(ticker);
    if (price == null)
      return void res.status(404).json({ error: `Could not get a price for ${ticker}.` });

    const portfolio = await getOrCreatePortfolio(String(user.id));
    const shortValue = price * shares;

    // Require 100% margin (cash must cover the short exposure)
    if (portfolio.cash < shortValue)
      return void res.status(400).json({
        error: `Insufficient margin. Shorting ${shares} shares of ${ticker} at $${price.toFixed(2)} requires $${shortValue.toFixed(2)} in cash as margin.`,
      });

    const proceeds = shortValue;
    // Find or merge short holding (negative shares)
    const existing = portfolio.holdings.find((h) => h.ticker === ticker && h.shares < 0);
    if (existing) {
      const totalShares = Math.abs(existing.shares) + shares;
      existing.avgCost = (existing.avgCost * Math.abs(existing.shares) + price * shares) / totalShares;
      existing.shares = -totalShares;
    } else {
      portfolio.holdings.push({ ticker, shares: -shares, avgCost: price });
    }
    portfolio.cash += proceeds; // receive proceeds, but margin is "locked" conceptually
    await portfolio.save();

    await SimulatorTrade.create({ user: user.id, ticker, action: 'short', shares, price, total: proceeds, pnl: null, pnlPct: null, aiDebrief: null, note, season: portfolio.season });

    const investedValue = portfolio.holdings.reduce((s, h) => s + h.avgCost * Math.abs(h.shares), 0);
    recordSnapshot(String(user.id), portfolio.cash - shortValue, portfolio.cash, investedValue);

    res.json({ ok: true, ticker, shares, price, proceeds, cashNow: portfolio.cash });
  } catch (err) { next(err); }
});

/* ── POST /api/simulator/cover ─────────────────────────────────────────── */

router.post('/cover', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const ticker = String(req.body.ticker || '').toUpperCase().trim();
    const shares = Number(req.body.shares);
    const note = req.body.note ? String(req.body.note).slice(0, 280) : null;

    if (!/^[A-Z][A-Z0-9.\-]{0,9}$/.test(ticker))
      return void res.status(400).json({ error: 'Invalid ticker.' });
    if (!Number.isFinite(shares) || shares <= 0 || shares !== Math.floor(shares))
      return void res.status(400).json({ error: 'Shares must be a positive whole number.' });

    const portfolio = await getOrCreatePortfolio(String(user.id));
    const holding = portfolio.holdings.find((h) => h.ticker === ticker && h.shares < 0);
    const shortShares = holding ? Math.abs(holding.shares) : 0;

    if (!holding || shortShares < shares)
      return void res.status(400).json({
        error: `You don't have a short position of ${shares} ${ticker}. You are short ${shortShares} shares.`,
      });

    const price = await livePrice(ticker);
    if (price == null)
      return void res.status(404).json({ error: `Could not get a price for ${ticker}.` });

    const cost = price * shares;
    if (portfolio.cash < cost)
      return void res.status(400).json({ error: `Not enough cash to cover. Need $${cost.toFixed(2)}.` });

    const costBasis = holding.avgCost * shares;
    const pnl = costBasis - cost; // profit when price drops below avgCost
    const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

    holding.shares += shares; // e.g. -10 + 5 = -5
    if (holding.shares === 0) portfolio.holdings = portfolio.holdings.filter((h) => h.ticker !== ticker || h.shares > 0);
    portfolio.cash -= cost;
    await portfolio.save();

    // Debrief for cover
    const debriefAbs = Math.abs(pnlPct).toFixed(1);
    const debriefDollar = Math.abs(pnl).toFixed(2);
    const aiDebrief = pnl > 0
      ? `Profitable short cover. You shorted ${ticker} at $${holding.avgCost.toFixed(2)} and covered at $${price.toFixed(2)} — a ${debriefAbs}% gain ($${debriefDollar}). Short selling is a powerful tool but works best with clear thesis and tight risk management.`
      : `Short cover at a loss. ${ticker} moved against your short by ${debriefAbs}% ($${debriefDollar}). The key lesson: always define your cover price before you open a short. A stop-loss order would have limited this damage.`;

    await SimulatorTrade.create({ user: user.id, ticker, action: 'cover', shares, price, total: cost, pnl, pnlPct, aiDebrief, note, season: portfolio.season });

    const investedValue = portfolio.holdings.reduce((s, h) => s + h.avgCost * Math.abs(h.shares), 0);
    recordSnapshot(String(user.id), portfolio.cash + investedValue, portfolio.cash, investedValue);

    res.json({ ok: true, ticker, shares, price, pnl, pnlPct, cashNow: portfolio.cash });
  } catch (err) { next(err); }
});

/* ── GET /api/simulator/trades ─────────────────────────────────────────── */

router.get('/trades', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const trades = await SimulatorTrade.find({ user: user.id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ trades });
  } catch (err) { next(err); }
});

/* ── GET /api/simulator/limits ─────────────────────────────────────────── */

router.get('/limits', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const orders = await SimulatorLimitOrder.find({
      user: user.id,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ orders });
  } catch (err) { next(err); }
});

/* ── POST /api/simulator/limits ────────────────────────────────────────── */

router.post('/limits', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const ticker = String(req.body.ticker || '').toUpperCase().trim();
    const action = String(req.body.action || '') as 'buy' | 'sell';
    const orderType = String(req.body.orderType || 'limit') as 'limit' | 'stop';
    const shares = Number(req.body.shares);
    const limitPrice = Number(req.body.limitPrice);
    const note = req.body.note ? String(req.body.note).slice(0, 280) : undefined;

    if (!/^[A-Z][A-Z0-9.\-]{0,9}$/.test(ticker))
      return void res.status(400).json({ error: 'Invalid ticker.' });
    if (!['buy', 'sell'].includes(action))
      return void res.status(400).json({ error: 'action must be buy or sell.' });
    if (!['limit', 'stop'].includes(orderType))
      return void res.status(400).json({ error: 'orderType must be limit or stop.' });
    if (!Number.isFinite(shares) || shares <= 0 || shares !== Math.floor(shares))
      return void res.status(400).json({ error: 'Shares must be a positive whole number.' });
    if (!Number.isFinite(limitPrice) || limitPrice <= 0)
      return void res.status(400).json({ error: 'Limit price must be a positive number.' });

    const portfolio = await getOrCreatePortfolio(String(user.id));
    const order = await SimulatorLimitOrder.create({
      user: user.id,
      ticker,
      action,
      orderType,
      shares,
      limitPrice,
      note,
      season: portfolio.season,
    });

    res.json({ ok: true, order });
  } catch (err) { next(err); }
});

/* ── DELETE /api/simulator/limits/:id ──────────────────────────────────── */

router.delete('/limits/:id', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const order = await SimulatorLimitOrder.findOne({ _id: req.params.id, user: user.id });
    if (!order) return void res.status(404).json({ error: 'Order not found.' });
    order.status = 'cancelled';
    await order.save();
    res.json({ ok: true });
  } catch (err) { next(err); }
});

/* ── GET /api/simulator/leaderboard ────────────────────────────────────── */

router.get('/leaderboard', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const top = await SimulatorTrade.find({
      action: { $in: ['sell', 'cover'] },
      pnlPct: { $ne: null, $gte: 1 }, // positive gains only
    })
      .sort({ pnlPct: -1 })
      .limit(limit)
      .populate('user', 'name avatarUrl')
      .lean();

    const trades = top.map((t) => ({
      _id: t._id,
      ticker: t.ticker,
      action: t.action,
      shares: t.shares,
      price: t.price,
      total: t.total,
      pnl: t.pnl,
      pnlPct: t.pnlPct,
      createdAt: t.createdAt,
      userName: (t.user as any)?.name || 'Anonymous',
      userAvatarUrl: (t.user as any)?.avatarUrl || null,
    }));

    res.json({ trades });
  } catch (err) { next(err); }
});

/* ── POST /api/simulator/coach ─────────────────────────────────────────── */

router.post('/coach', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const portfolio = await getOrCreatePortfolio(String(user.id));
    const tradeHistory = await SimulatorTrade.find({ user: user.id })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const priceMap: Record<string, number | null> = {};
    await Promise.all(portfolio.holdings.map(async (h) => { priceMap[h.ticker] = await livePrice(h.ticker); }));

    const holdingsForCoach = portfolio.holdings.map((h) => {
      const current = priceMap[h.ticker];
      const isShort = h.shares < 0;
      const absShares = Math.abs(h.shares);
      const costBasis = h.avgCost * absShares;
      const marketValue = current != null ? current * absShares : null;
      const pnl = marketValue != null ? (isShort ? costBasis - marketValue : marketValue - costBasis) : null;
      const pnlPct = pnl != null && costBasis > 0 ? (pnl / costBasis) * 100 : null;
      return { ticker: h.ticker, shares: h.shares, avgCost: h.avgCost, currentPrice: current, pnlPct, isShort };
    });

    const closed = tradeHistory.filter((t) => ['sell', 'cover'].includes(t.action) && t.pnl != null);
    const winRate = closed.length > 0
      ? `${Math.round(closed.filter((t) => (t.pnl ?? 0) > 0).length / closed.length * 100)}% (${closed.filter((t) => (t.pnl ?? 0) > 0).length}/${closed.length} trades)`
      : 'no closed trades yet';

    const totalMarketValue = portfolio.holdings.reduce((s, h) => {
      const p = priceMap[h.ticker];
      return s + (p != null ? p * h.shares : 0);
    }, 0);
    const totalValue = portfolio.cash + totalMarketValue;

    const advice = await generatePortfolioCoach(
      totalValue,
      portfolio.cash,
      holdingsForCoach,
      tradeHistory.slice(0, 10).map((t) => ({
        action: t.action,
        ticker: t.ticker,
        shares: t.shares,
        price: t.price,
        pnlPct: t.pnlPct ?? null,
      })),
      winRate
    );

    res.json({ advice });
  } catch (err) { next(err); }
});

/* ── POST /api/simulator/reset ─────────────────────────────────────────── */

router.post('/reset', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    await SimulatorPortfolio.findOneAndUpdate(
      { user: user.id },
      { cash: STARTING_BALANCE, holdings: [], startingBalance: STARTING_BALANCE, season: new Date().toISOString().slice(0, 7), resetAt: new Date() },
      { upsert: true }
    );
    // Cancel all pending limit orders on reset
    await SimulatorLimitOrder.updateMany({ user: user.id, status: 'pending' }, { status: 'cancelled' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
