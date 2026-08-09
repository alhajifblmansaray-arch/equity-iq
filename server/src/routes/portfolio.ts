import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import Portfolio from '../models/Portfolio';
import SnaptradeAuth from '../models/SnaptradeAuth';
import { IUser } from '../models/User';
import { twelveDataQuote, twelveDataHistory } from '../services/twelveData';
import { finnhubQuote } from '../services/finnhub';
import { yahooQuote, yahooHistory } from '../services/yahoo';
import { SnaptradeService } from '../services/snaptrade';

const router = Router();
router.use(requireAuth);

// ── Live data helpers (cached briefly to avoid hammering free-tier APIs) ────────
const quoteCache = new Map<string, { at: number; price: number; change: number; changePct: number }>();
const historyCache = new Map<string, { at: number; closes: number[] }>();
const QUOTE_TTL = 60_000;      // 1 min
const HISTORY_TTL = 15 * 60_000; // 15 min

async function liveQuote(ticker: string) {
  const hit = quoteCache.get(ticker);
  if (hit && Date.now() - hit.at < QUOTE_TTL) return hit;
  const q = (await twelveDataQuote(ticker)) || (await finnhubQuote(ticker)) || (await yahooQuote(ticker));
  if (!q?.price) return null;
  const entry = { at: Date.now(), price: q.price, change: q.change ?? 0, changePct: q.changePct ?? 0 };
  quoteCache.set(ticker, entry);
  return entry;
}

async function closes(ticker: string, days: number): Promise<number[]> {
  const hit = historyCache.get(ticker);
  if (hit && Date.now() - hit.at < HISTORY_TTL) return hit.closes.slice(-days);
  const bars = (await twelveDataHistory(ticker, Math.max(60, days * 2))) || (await yahooHistory(ticker, days * 2));
  const c = (bars || []).map((b) => b.close).filter((n) => typeof n === 'number');
  historyCache.set(ticker, { at: Date.now(), closes: c });
  return c.slice(-days);
}

async function getOrCreate(userId: string) {
  let p = await Portfolio.findOne({ user: userId });
  if (!p) p = await Portfolio.create({ user: userId });
  return p;
}

// Deterministic avatar colour from a ticker (Wealthsimple-style monogram fallback)
function tickerColor(ticker: string): string {
  const palette = ['#2f5d50', '#3b5bdb', '#c2410c', '#7c3aed', '#0891b2', '#be123c', '#4d7c0f', '#a16207'];
  let h = 0;
  for (let i = 0; i < ticker.length; i++) h = (h * 31 + ticker.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

// ── GET / — enriched portfolio snapshot ─────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const p = await getOrCreate(user.id);
    const account = typeof req.query.account === 'string' && req.query.account !== 'all' ? req.query.account : null;

    const holdings = account ? p.holdings.filter((h) => h.account === account) : p.holdings;

    // Enrich each holding with a live quote
    const enriched = await Promise.all(
      holdings.map(async (h) => {
        const q = await liveQuote(h.ticker);
        const price = q?.price ?? null;
        const marketValue = price != null ? price * h.quantity : null;
        const costBasis = h.avgCost * h.quantity;
        const allTimeReturn = marketValue != null ? marketValue - costBasis : null;
        const allTimeReturnPct = costBasis > 0 && allTimeReturn != null ? (allTimeReturn / costBasis) * 100 : null;
        const todayReturn = q?.change != null && price != null ? q.change * h.quantity : null;
        return {
          id: (h as any)._id?.toString(),
          ticker: h.ticker,
          quantity: h.quantity,
          avgCost: h.avgCost,
          currency: h.currency,
          account: h.account,
          color: tickerColor(h.ticker),
          price,
          change: q?.change ?? null,
          changePct: q?.changePct ?? null,
          marketValue,
          costBasis,
          todayReturn,
          allTimeReturn,
          allTimeReturnPct,
        };
      })
    );

    const investedValue = enriched.reduce((s, h) => s + (h.marketValue ?? 0), 0);
    const totalCost = enriched.reduce((s, h) => s + h.costBasis, 0);
    const todayChange = enriched.reduce((s, h) => s + (h.todayReturn ?? 0), 0);
    const allTimeReturn = investedValue - totalCost;
    const cash = account ? 0 : p.cash;
    const totalValue = investedValue + cash;

    // Allocation % of invested value
    for (const h of enriched) {
      (h as any).allocation = investedValue > 0 && h.marketValue != null ? (h.marketValue / investedValue) * 100 : 0;
    }
    enriched.sort((a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0));

    // Value history — sum of (closes × quantity) across holdings, aligned by length
    let history: number[] = [];
    if (enriched.length) {
      const DAYS = 30;
      const series = await Promise.all(holdings.map(async (h) => ({ q: h.quantity, closes: await closes(h.ticker, DAYS) })));
      const minLen = Math.min(...series.map((s) => s.closes.length).filter((n) => n > 0), DAYS);
      if (minLen && Number.isFinite(minLen)) {
        history = Array.from({ length: minLen }, (_, i) =>
          series.reduce((sum, s) => {
            const c = s.closes.slice(-minLen);
            return sum + (c[i] ?? 0) * s.q;
          }, cash)
        );
      }
    }

    const transactions = (account ? p.transactions.filter((t) => !t.ticker || holdings.some((h) => h.ticker === t.ticker)) : p.transactions)
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((t) => ({
        id: (t as any)._id?.toString(),
        date: new Date(t.date).toISOString(),
        type: t.type,
        ticker: t.ticker ?? null,
        quantity: t.quantity ?? null,
        price: t.price ?? null,
        amount: t.amount,
        currency: t.currency,
        note: t.note ?? null,
        color: t.ticker ? tickerColor(t.ticker) : '#4b5563',
      }));

    res.json({
      accounts: p.accounts,
      cash,
      cashCurrency: p.cashCurrency,
      holdings: enriched,
      transactions,
      history,
      summary: {
        totalValue,
        investedValue,
        totalCost,
        todayChange,
        todayChangePct: investedValue - todayChange > 0 ? (todayChange / (investedValue - todayChange)) * 100 : 0,
        allTimeReturn,
        allTimeReturnPct: totalCost > 0 ? (allTimeReturn / totalCost) * 100 : 0,
      },
    });
  } catch (err) { next(err); }
});

// ── POST /holdings — add a position ─────────────────────────────────────────────
const holdingSchema = z.object({
  ticker: z.string().regex(/^[A-Z0-9.\-]{1,10}$/i),
  quantity: z.number().positive(),
  avgCost: z.number().min(0),
  currency: z.enum(['CAD', 'USD']).default('USD'),
  account: z.string().min(1).default('RRSP'),
});

router.post('/holdings', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const d = holdingSchema.parse(req.body);
    const p = await getOrCreate(user.id);
    if (!p.accounts.includes(d.account)) p.accounts.push(d.account);

    // Merge into an existing holding of the same ticker+account (weighted avg cost)
    const existing = p.holdings.find((h) => h.ticker === d.ticker.toUpperCase() && h.account === d.account);
    if (existing) {
      const totalQty = existing.quantity + d.quantity;
      existing.avgCost = (existing.avgCost * existing.quantity + d.avgCost * d.quantity) / totalQty;
      existing.quantity = totalQty;
    } else {
      p.holdings.push({ ...d, ticker: d.ticker.toUpperCase() } as any);
    }
    await p.save();
    res.status(201).json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: 'Invalid holding.', details: err.errors }); return; }
    next(err);
  }
});

// ── PATCH /holdings/:id — edit a position ───────────────────────────────────────
router.patch('/holdings/:id', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const p = await getOrCreate(user.id);
    const h = p.holdings.id(req.params.id);
    if (!h) { res.status(404).json({ error: 'Holding not found.' }); return; }
    const fields = ['quantity', 'avgCost', 'currency', 'account'] as const;
    for (const f of fields) if (req.body[f] !== undefined) (h as any)[f] = req.body[f];
    if (req.body.account && !p.accounts.includes(req.body.account)) p.accounts.push(req.body.account);
    await p.save();
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── DELETE /holdings/:id ────────────────────────────────────────────────────────
router.delete('/holdings/:id', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const p = await getOrCreate(user.id);
    const h = p.holdings.id(req.params.id);
    if (h) { h.deleteOne(); await p.save(); }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── POST /transactions — log an activity item ───────────────────────────────────
const txSchema = z.object({
  date: z.string().optional(),
  type: z.enum(['buy', 'sell', 'dividend', 'deposit', 'withdrawal']),
  ticker: z.string().regex(/^[A-Z0-9.\-]{1,10}$/i).optional(),
  quantity: z.number().optional(),
  price: z.number().optional(),
  amount: z.number(),
  currency: z.enum(['CAD', 'USD']).default('USD'),
  note: z.string().max(200).optional(),
});

router.post('/transactions', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const d = txSchema.parse(req.body);
    const p = await getOrCreate(user.id);
    p.transactions.push({
      ...d,
      ticker: d.ticker?.toUpperCase(),
      date: d.date ? new Date(d.date) : new Date(),
    } as any);
    await p.save();
    res.status(201).json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: 'Invalid transaction.', details: err.errors }); return; }
    next(err);
  }
});

router.delete('/transactions/:id', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const p = await getOrCreate(user.id);
    const t = p.transactions.id(req.params.id);
    if (t) { t.deleteOne(); await p.save(); }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── PATCH /cash — set total cash available ──────────────────────────────────────
router.patch('/cash', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const p = await getOrCreate(user.id);
    if (typeof req.body.cash === 'number') p.cash = req.body.cash;
    if (req.body.cashCurrency === 'CAD' || req.body.cashCurrency === 'USD') p.cashCurrency = req.body.cashCurrency;
    await p.save();
    res.json({ ok: true, cash: p.cash, cashCurrency: p.cashCurrency });
  } catch (err) { next(err); }
});

// ── POST /accounts — add a named account ────────────────────────────────────────
router.post('/accounts', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const name = String(req.body.name || '').trim().slice(0, 24);
    if (!name) { res.status(400).json({ error: 'Account name required.' }); return; }
    const p = await getOrCreate(user.id);
    if (!p.accounts.includes(name)) { p.accounts.push(name); await p.save(); }
    res.status(201).json({ ok: true, accounts: p.accounts });
  } catch (err) { next(err); }
});

// ── Snaptrade broker integration ────────────────────────────────────────────────

// GET /snaptrade/status — check if connected
router.get('/snaptrade/status', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const auth = await SnaptradeAuth.findOne({ user: user.id });
    res.json({
      isConnected: auth?.isConnected ?? false,
      connectedAt: auth?.connectedAt,
      lastSyncAt: auth?.lastSyncAt,
    });
  } catch (err) { next(err); }
});

// POST /snaptrade/init — start OAuth flow
router.post('/snaptrade/init', async (req, res, next) => {
  try {
    const user = req.user as IUser;

    // Generate or retrieve Snaptrade user record
    let auth = await SnaptradeAuth.findOne({ user: user.id });
    if (!auth) {
      auth = await SnaptradeAuth.create({
        user: user.id,
        snaptradeUserId: SnaptradeService.generateUserId(user.id),
        snaptradeUserSecret: 'placeholder', // Not used in simplified flow
      });
    }

    const redirectUri = `${process.env.CLIENT_ORIGIN}/portfolio?snaptrade=callback`;
    const authUrl = SnaptradeService.getAuthURL(user.id, redirectUri);
    res.json({ authUrl });
  } catch (err) { next(err); }
});

// POST /snaptrade/callback — handle OAuth return from Snaptrade OR direct credential entry
router.post('/snaptrade/callback', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const { code, state, snaptradeUserId, snaptradeUserSecret } = req.body;

    let userId: string;
    let userSecret: string;

    // Two paths: OAuth (code + state) or direct credentials (for test mode)
    if (code && state) {
      // OAuth path: In a real implementation, exchange code for tokens here
      userId = SnaptradeService.generateUserId(state);
      userSecret = code;
    } else if (snaptradeUserId && snaptradeUserSecret) {
      // Direct credentials path (test/fallback mode)
      userId = snaptradeUserId;
      userSecret = snaptradeUserSecret;
    } else {
      res.status(400).json({ error: 'OAuth code+state or credentials (userId+userSecret) required.' });
      return;
    }

    let auth = await SnaptradeAuth.findOne({ user: user.id });
    if (!auth) {
      auth = await SnaptradeAuth.create({
        user: user.id,
        snaptradeUserId: userId,
        snaptradeUserSecret: userSecret,
      });
    } else {
      auth.snaptradeUserId = userId;
      auth.snaptradeUserSecret = userSecret;
    }

    // Mark as connected
    auth.isConnected = true;
    auth.connectedAt = new Date();
    await auth.save();

    // Auto-sync holdings on first connect
    try {
      await syncSnaptradeHoldings(user.id, userId, userSecret);
    } catch (syncErr) {
      console.warn('First sync skipped (may be invalid credentials):', syncErr);
      // Don't fail the connection, user can retry sync later
    }

    res.json({ ok: true, message: 'Snaptrade connected.' });
  } catch (err) { next(err); }
});

// POST /snaptrade/sync — manual sync
router.post('/snaptrade/sync', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const auth = await SnaptradeAuth.findOne({ user: user.id });
    if (!auth || !auth.isConnected) { res.status(400).json({ error: 'Snaptrade not connected.' }); return; }

    await syncSnaptradeHoldings(user.id, auth.snaptradeUserId, auth.snaptradeUserSecret);
    auth.lastSyncAt = new Date();
    await auth.save();

    res.json({ ok: true, lastSyncAt: auth.lastSyncAt });
  } catch (err) { next(err); }
});

// POST /snaptrade/disconnect
router.post('/snaptrade/disconnect', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    await SnaptradeAuth.findOneAndDelete({ user: user.id });
    res.json({ ok: true, message: 'Snaptrade disconnected.' });
  } catch (err) { next(err); }
});

// Helper: sync holdings from Snaptrade into Portfolio
async function syncSnaptradeHoldings(userId: string, snaptradeUserId: string, snaptradeUserSecret: string) {
  try {
    const holdings = await SnaptradeService.getHoldings(snaptradeUserId, snaptradeUserSecret);
    const transactions = await SnaptradeService.getTransactions(snaptradeUserId, snaptradeUserSecret);
    const accounts = await SnaptradeService.getAccounts(snaptradeUserId, snaptradeUserSecret);

    const p = await getOrCreate(userId);

    // Add/merge holdings
    for (const h of holdings) {
      const ticker = h.symbol?.symbol?.toUpperCase() || 'UNKNOWN';
      const currency = (h.currency?.code || h.symbol?.currency?.code || 'USD') as 'CAD' | 'USD';
      const account = 'Snaptrade Import';

      if (!p.accounts.includes(account)) p.accounts.push(account);

      const existing = p.holdings.find((x) => x.ticker === ticker && x.account === account);
      if (existing) {
        existing.quantity = h.quantity;
        existing.avgCost = h.price || existing.avgCost;
      } else {
        p.holdings.push({ ticker, quantity: h.quantity, avgCost: h.price || 0, currency, account } as any);
      }
    }

    // Add transactions (avoid duplicates by checking date + action + ticker + quantity)
    for (const tx of transactions) {
      const type = tx.action === 'BUY' ? 'buy'
        : tx.action === 'SELL' ? 'sell'
        : tx.action === 'DIVIDEND' ? 'dividend'
        : tx.action === 'DEPOSIT' ? 'deposit'
        : tx.action === 'WITHDRAWAL' ? 'withdrawal'
        : null;

      if (!type) continue;

      const exists = p.transactions.some(
        (t) =>
          new Date(t.date).getTime() === new Date(tx.trade_date).getTime() &&
          t.type === type &&
          t.ticker === tx.symbol &&
          t.quantity === tx.units
      );

      if (!exists) {
        p.transactions.push({
          date: new Date(tx.trade_date),
          type,
          ticker: tx.symbol,
          quantity: type !== 'dividend' ? tx.units : undefined,
          price: type !== 'dividend' ? tx.price : undefined,
          amount: Math.abs(tx.net_proceeds),
          currency: (tx.currency || 'USD') as 'CAD' | 'USD',
          note: `Imported from Snaptrade (${tx.id})`,
        } as any);
      }
    }

    // Update cash (sum of deposits/withdrawals from Snaptrade)
    let snapCash = 0;
    for (const tx of transactions) {
      if (tx.action === 'DEPOSIT') snapCash += tx.net_proceeds;
      else if (tx.action === 'WITHDRAWAL') snapCash -= tx.net_proceeds;
    }
    if (snapCash !== 0) p.cash = snapCash;

    await p.save();
  } catch (error) {
    console.error('Snaptrade sync failed:', error);
    throw error;
  }
}

export default router;
