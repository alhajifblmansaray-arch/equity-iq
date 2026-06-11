import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { SimulatorPortfolio } from '../models/SimulatorPortfolio';
import { SimulatorSnapshot } from '../models/SimulatorSnapshot';
import { SimulatorTrade } from '../models/SimulatorTrade';
import { IUser } from '../models/User';
import { twelveDataQuote } from '../services/twelveData';
import { finnhubQuote } from '../services/finnhub';
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

/* GET /api/simulator — portfolio with current prices */
router.get('/', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const portfolio = await getOrCreatePortfolio(String(user.id));

    // Fetch current prices for all holdings
    const priceMap: Record<string, number | null> = {};
    await Promise.all(
      portfolio.holdings.map(async (h) => {
        priceMap[h.ticker] = await livePrice(h.ticker);
      })
    );

    const holdingsWithPrices = portfolio.holdings.map((h) => {
      const current = priceMap[h.ticker];
      const marketValue = current != null ? current * h.shares : null;
      const costBasis = h.avgCost * h.shares;
      const pnl = marketValue != null ? marketValue - costBasis : null;
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
      };
    });

    const totalMarketValue = holdingsWithPrices.reduce(
      (s, h) => s + (h.marketValue ?? h.costBasis),
      0
    );
    const totalValue = portfolio.cash + totalMarketValue;
    const totalPnl = totalValue - STARTING_BALANCE;
    const totalPnlPct = (totalPnl / STARTING_BALANCE) * 100;

    // Record daily snapshot (upsert — only writes once per day)
    recordSnapshot(String(user.id), totalValue, portfolio.cash, totalMarketValue);

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
  } catch (err) {
    next(err);
  }
});

/* GET /api/simulator/snapshots — equity curve history */
router.get('/snapshots', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const snapshots = await SimulatorSnapshot.find({ user: user.id })
      .sort({ date: 1 })
      .limit(365)
      .lean();
    res.json({ snapshots });
  } catch (err) {
    next(err);
  }
});

/* POST /api/simulator/buy */
router.post('/buy', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const ticker = String(req.body.ticker || '').toUpperCase().trim();
    const shares = Number(req.body.shares);

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
        error: `Not enough cash. You need $${cost.toFixed(2)} but only have $${portfolio.cash.toFixed(2)}.`,
      });

    // Update holdings
    const existing = portfolio.holdings.find((h) => h.ticker === ticker);
    if (existing) {
      const totalShares = existing.shares + shares;
      const totalCost = existing.avgCost * existing.shares + price * shares;
      existing.avgCost = totalCost / totalShares;
      existing.shares = totalShares;
    } else {
      portfolio.holdings.push({ ticker, shares, avgCost: price });
    }
    portfolio.cash -= cost;
    await portfolio.save();

    // Record trade
    await SimulatorTrade.create({
      user: user.id,
      ticker,
      action: 'buy',
      shares,
      price,
      total: cost,
      pnl: null,
      pnlPct: null,
      aiDebrief: null,
      season: portfolio.season,
    });

    // Rough snapshot: invested value = cost basis of all holdings after buy
    const investedValue = portfolio.holdings.reduce((s, h) => s + h.avgCost * h.shares, 0);
    recordSnapshot(String(user.id), portfolio.cash + investedValue, portfolio.cash, investedValue);

    res.json({ ok: true, ticker, shares, price, total: cost, cashRemaining: portfolio.cash });
  } catch (err) {
    next(err);
  }
});

/* POST /api/simulator/sell */
router.post('/sell', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const ticker = String(req.body.ticker || '').toUpperCase().trim();
    const shares = Number(req.body.shares);

    if (!/^[A-Z][A-Z0-9.\-]{0,9}$/.test(ticker))
      return void res.status(400).json({ error: 'Invalid ticker.' });
    if (!Number.isFinite(shares) || shares <= 0 || shares !== Math.floor(shares))
      return void res.status(400).json({ error: 'Shares must be a positive whole number.' });

    const portfolio = await getOrCreatePortfolio(String(user.id));
    const holding = portfolio.holdings.find((h) => h.ticker === ticker);

    if (!holding || holding.shares < shares)
      return void res.status(400).json({
        error: `You don't have ${shares} shares of ${ticker}. You hold ${holding?.shares ?? 0}.`,
      });

    const price = await livePrice(ticker);
    if (price == null)
      return void res.status(404).json({ error: `Could not get a price for ${ticker}.` });

    const proceeds = price * shares;
    const costBasis = holding.avgCost * shares;
    const pnl = proceeds - costBasis;
    const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

    // Update holdings
    holding.shares -= shares;
    if (holding.shares === 0) {
      portfolio.holdings = portfolio.holdings.filter((h) => h.ticker !== ticker);
    }
    portfolio.cash += proceeds;
    await portfolio.save();

    // Simple AI debrief based on P&L
    const debrief = generateDebrief(ticker, shares, holding.avgCost, price, pnl, pnlPct);

    // Record trade
    await SimulatorTrade.create({
      user: user.id,
      ticker,
      action: 'sell',
      shares,
      price,
      total: proceeds,
      pnl,
      pnlPct,
      aiDebrief: debrief,
      season: portfolio.season,
    });

    const investedValueAfter = portfolio.holdings.reduce((s, h) => s + h.avgCost * h.shares, 0);
    recordSnapshot(String(user.id), portfolio.cash + investedValueAfter, portfolio.cash, investedValueAfter);

    res.json({ ok: true, ticker, shares, price, proceeds, pnl, pnlPct, cashNow: portfolio.cash });
  } catch (err) {
    next(err);
  }
});

/* GET /api/simulator/trades */
router.get('/trades', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const trades = await SimulatorTrade.find({ user: user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ trades });
  } catch (err) {
    next(err);
  }
});

/* POST /api/simulator/reset */
router.post('/reset', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    await SimulatorPortfolio.findOneAndUpdate(
      { user: user.id },
      {
        cash: STARTING_BALANCE,
        holdings: [],
        startingBalance: STARTING_BALANCE,
        season: new Date().toISOString().slice(0, 7),
        resetAt: new Date(),
      },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/* ─── Simple trade debrief generator ────────────────────────────────────── */

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
    if (pnlPct >= 20)
      return `Strong trade. You bought ${ticker} at $${avgCost.toFixed(2)} and sold at $${sellPrice.toFixed(2)} — a ${abs}% gain ($${dollarAbs}). That's the kind of disciplined profit-taking that protects your gains. Key lesson: always have a target price before you buy.`;
    if (pnlPct >= 5)
      return `Solid trade. ${ticker} gave you a ${abs}% gain ($${dollarAbs}). Not every trade needs to be a home run — consistent small gains compound over time. Consider why it worked: was it a technical setup, good earnings, or sector momentum?`;
    return `Small win. You made ${abs}% ($${dollarAbs}) on ${ticker}. Every profitable trade builds good habits. Reflect on what gave you conviction to buy — that instinct gets sharper with practice.`;
  } else {
    if (pnlPct <= -20)
      return `Tough loss. ${ticker} cost you ${abs}% ($${dollarAbs}). Before your next trade, ask: did the original reason to buy this stock change, or did you sell on panic? If the thesis changed, selling was right. If you panicked, consider using stop-losses to remove emotion from the decision.`;
    if (pnlPct <= -5)
      return `A ${abs}% loss ($${dollarAbs}) on ${ticker}. Losses are part of trading — professional traders lose on 40-50% of their trades but still profit by letting winners run and cutting losers early. Review your entry: was there a clear reason to buy, and did you size the position appropriately?`;
    return `Small loss of ${abs}% ($${dollarAbs}) on ${ticker}. Tiny losses are fine — keeping losses small is one of the most important trading skills. The key is to not let small losses turn into big ones.`;
  }
}

export default router;
