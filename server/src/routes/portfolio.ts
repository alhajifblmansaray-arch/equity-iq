import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import Portfolio, { ITransaction } from '../models/Portfolio';
import SnaptradeAuth from '../models/SnaptradeAuth';
import { IUser } from '../models/User';
import { twelveDataQuote, twelveDataHistory } from '../services/twelveData';
import { finnhubQuote } from '../services/finnhub';
import { yahooQuote, yahooHistory } from '../services/yahoo';
import * as SnaptradeSDK from '../services/snaptradeSDK';
import { usdToCad, convert, type Currency as FxCurrency } from '../services/fx';

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

    // Everything is reported in one display currency; CAD is the default.
    const display: FxCurrency = req.query.currency === 'USD' ? 'USD' : 'CAD';
    const rate = await usdToCad();
    /** Money in a holding's native currency → the display currency. */
    const toDisplay = (amount: number | null, from: FxCurrency): number | null =>
      amount == null ? null : convert(amount, from, display, rate);

    const holdings = account ? p.holdings.filter((h) => h.account === account) : p.holdings;

    // Enrich each holding with a live quote, converted into the display currency
    const enriched = await Promise.all(
      holdings.map(async (h) => {
        const q = await liveQuote(h.ticker);
        const native = h.currency as FxCurrency;
        const price = toDisplay(q?.price ?? null, native);
        const avgCost = toDisplay(h.avgCost, native) ?? 0;
        const marketValue = price != null ? price * h.quantity : null;
        const costBasis = avgCost * h.quantity;
        const allTimeReturn = marketValue != null ? marketValue - costBasis : null;
        const allTimeReturnPct = costBasis > 0 && allTimeReturn != null ? (allTimeReturn / costBasis) * 100 : null;
        const change = toDisplay(q?.change ?? null, native);
        const todayReturn = change != null && price != null ? change * h.quantity : null;
        return {
          id: (h as any)._id?.toString(),
          ticker: h.ticker,
          quantity: h.quantity,
          avgCost,
          currency: display,
          nativeCurrency: native,
          account: h.account,
          color: tickerColor(h.ticker),
          price,
          change,
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
    const cash = account ? 0 : toDisplay(p.cash, p.cashCurrency as FxCurrency) ?? 0;
    const totalValue = investedValue + cash;

    // Allocation % of invested value
    for (const h of enriched) {
      (h as any).allocation = investedValue > 0 && h.marketValue != null ? (h.marketValue / investedValue) * 100 : 0;
    }
    enriched.sort((a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0));

    // Per-account rollup so the UI can group holdings by RRSP/TFSA/etc.
    const accountMap = new Map<string, { name: string; value: number; cost: number; todayChange: number; holdings: number }>();
    for (const h of enriched) {
      const row = accountMap.get(h.account) ?? { name: h.account, value: 0, cost: 0, todayChange: 0, holdings: 0 };
      row.value += h.marketValue ?? 0;
      row.cost += h.costBasis;
      row.todayChange += h.todayReturn ?? 0;
      row.holdings += 1;
      accountMap.set(h.account, row);
    }
    const accountSummaries = [...accountMap.values()]
      .map((a) => ({
        ...a,
        allTimeReturn: a.value - a.cost,
        allTimeReturnPct: a.cost > 0 ? ((a.value - a.cost) / a.cost) * 100 : 0,
        allocation: investedValue > 0 ? (a.value / investedValue) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    // Value history — sum of (closes × quantity) across holdings, aligned by length
    let history: number[] = [];
    if (enriched.length) {
      const DAYS = 30;
      const series = await Promise.all(
        holdings.map(async (h) => ({
          q: h.quantity,
          native: h.currency as FxCurrency,
          closes: await closes(h.ticker, DAYS),
        }))
      );
      const minLen = Math.min(...series.map((s) => s.closes.length).filter((n) => n > 0), DAYS);
      if (minLen && Number.isFinite(minLen)) {
        history = Array.from({ length: minLen }, (_, i) =>
          series.reduce((sum, s) => {
            const c = s.closes.slice(-minLen);
            return sum + (toDisplay(c[i] ?? 0, s.native) ?? 0) * s.q;
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
        price: toDisplay(t.price ?? null, t.currency as FxCurrency),
        amount: toDisplay(t.amount, t.currency as FxCurrency) ?? t.amount,
        currency: display,
        note: t.note ?? null,
        color: t.ticker ? tickerColor(t.ticker) : '#4b5563',
      }));

    // A holding we can't price is excluded from every total above. Report those
    // tickers so the UI can say the value is partial instead of quietly understating it.
    const unpricedTickers = enriched.filter((h) => h.price == null).map((h) => h.ticker);

    res.json({
      accounts: p.accounts,
      accountSummaries,
      cash,
      cashCurrency: display,
      displayCurrency: display,
      fxRate: rate,
      holdings: enriched,
      transactions,
      history,
      unpricedTickers,
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

// ── Snaptrade SDK Integration ─────────────────────────────────────────────────

// Snaptrade errors carry the useful detail in responseBody — surface it instead of a bare 500.
function snapError(err: unknown): { status: number; error: string } {
  const e = err as { status?: number; responseBody?: { detail?: string; code?: string }; message?: string };
  const detail = e?.responseBody?.detail;
  if (detail) return { status: e.status && e.status >= 400 && e.status < 500 ? e.status : 502, error: detail };
  return { status: 502, error: e?.message || 'Snaptrade request failed.' };
}

/**
 * Returns a Snaptrade auth row that is known-good, registering on first use.
 *
 * A stored row is not automatically usable: earlier builds wrote placeholder
 * secrets, and a user deleted on Snaptrade's side leaves our row orphaned. Both
 * cases surface as a 401 on every later call, so verify the credentials and
 * re-register when they are rejected.
 */
async function ensureSnaptradeUser(equityIQUserId: string) {
  const existing = await SnaptradeAuth.findOne({ user: equityIQUserId });

  if (existing) {
    try {
      await SnaptradeSDK.listAccounts(existing.snaptradeUserId, existing.snaptradeUserSecret);
      return existing;
    } catch (err) {
      if ((err as { status?: number })?.status !== 401) throw err;
      console.warn(`Snaptrade credentials rejected for ${existing.snaptradeUserId} — re-registering.`);
      await existing.deleteOne();
    }
  }

  // A previous attempt may have left a user behind under this id; clear it first.
  try { await SnaptradeSDK.deleteUser(SnaptradeSDK.snaptradeUserIdFor(equityIQUserId)); } catch { /* nothing to remove */ }

  const { userId, userSecret } = await SnaptradeSDK.registerUser(equityIQUserId);
  return SnaptradeAuth.create({
    user: equityIQUserId,
    snaptradeUserId: userId,
    snaptradeUserSecret: userSecret,
    isConnected: false,
  });
}

// GET /snaptrade/status — includes the brokers currently linked
router.get('/snaptrade/status', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const auth = await SnaptradeAuth.findOne({ user: user.id });

    let brokers: Array<{ id: string; name: string; slug: string; logoUrl: string | null; disabled: boolean; accounts: number }> = [];
    if (auth) {
      try {
        const [connections, accounts] = await Promise.all([
          SnaptradeSDK.listConnections(auth.snaptradeUserId, auth.snaptradeUserSecret) as Promise<any[]>,
          SnaptradeSDK.listAccounts(auth.snaptradeUserId, auth.snaptradeUserSecret) as Promise<any[]>,
        ]);
        brokers = (connections ?? []).map((c: any) => ({
          id: c.id,
          name: c.brokerage?.display_name || c.brokerage?.name || 'Brokerage',
          slug: c.brokerage?.slug || '',
          logoUrl: c.brokerage?.aws_s3_square_logo_url || c.brokerage?.aws_s3_logo_url || null,
          disabled: Boolean(c.disabled),
          accounts: (accounts ?? []).filter((a: any) => a.brokerage_authorization === c.id).length,
        }));
      } catch (err) {
        // A rejected credential shouldn't blank the whole card — report zero brokers.
        console.warn('Could not list Snaptrade connections:', snapError(err).error);
      }
    }

    res.json({
      configured: SnaptradeSDK.snaptradeConfigured,
      isConnected: (auth?.isConnected ?? false) && brokers.length > 0,
      connectedAt: auth?.connectedAt,
      lastSyncAt: auth?.lastSyncAt,
      brokers,
    });
  } catch (err) { next(err); }
});

// DELETE /snaptrade/connections/:id — unlink one brokerage, keep the rest
router.delete('/snaptrade/connections/:id', async (req, res) => {
  try {
    const user = req.user as IUser;
    const auth = await SnaptradeAuth.findOne({ user: user.id });
    if (!auth) { res.status(400).json({ error: 'Snaptrade is not connected.' }); return; }
    await SnaptradeSDK.removeConnection(auth.snaptradeUserId, auth.snaptradeUserSecret, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    const { status, error } = snapError(err);
    res.status(status).json({ error });
  }
});

// POST /snaptrade/register — create the Snaptrade-side user account
router.post('/snaptrade/register', async (req, res) => {
  try {
    const user = req.user as IUser;
    const auth = await ensureSnaptradeUser(user.id);
    res.json({ userId: auth.snaptradeUserId });
  } catch (err) {
    const { status, error } = snapError(err);
    console.error('Snaptrade register failed:', error);
    res.status(status).json({ error });
  }
});

// POST /snaptrade/connect — one-time portal URL (registers first if needed)
router.post('/snaptrade/connect', async (req, res) => {
  try {
    const user = req.user as IUser;
    const broker = typeof req.body?.broker === 'string' ? req.body.broker : undefined;
    const auth = await ensureSnaptradeUser(user.id);

    const redirectUri = `${process.env.CLIENT_ORIGIN}/portfolio?connected=1`;
    const portalUrl = await SnaptradeSDK.getPortalUrl(
      auth.snaptradeUserId,
      auth.snaptradeUserSecret,
      redirectUri,
      broker
    );
    res.json({ portalUrl });
  } catch (err) {
    const { status, error } = snapError(err);
    console.error('Snaptrade connect failed:', error);
    res.status(status).json({ error });
  }
});

// POST /snaptrade/sync — pull accounts, holdings and activity
router.post('/snaptrade/sync', async (req, res) => {
  try {
    const user = req.user as IUser;
    const auth = await SnaptradeAuth.findOne({ user: user.id });
    if (!auth) { res.status(400).json({ error: 'Snaptrade is not connected.' }); return; }

    const summary = await syncSnaptradeData(user.id, auth.snaptradeUserId, auth.snaptradeUserSecret);
    auth.isConnected = true;
    auth.lastSyncAt = new Date();
    await auth.save();

    res.json({ ok: true, lastSyncAt: auth.lastSyncAt, ...summary });
  } catch (err) {
    const { status, error } = snapError(err);
    console.error('Snaptrade sync failed:', error);
    res.status(status).json({ error });
  }
});

// POST /snaptrade/disconnect — drop our record and the Snaptrade-side user
router.post('/snaptrade/disconnect', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const auth = await SnaptradeAuth.findOneAndDelete({ user: user.id });
    if (auth) {
      // Best effort — the local record is already gone either way.
      try { await SnaptradeSDK.deleteUser(auth.snaptradeUserId); }
      catch (err) { console.warn('Snaptrade user delete failed:', snapError(err).error); }
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── Snaptrade response readers ──────────────────────────────────────────────────
// Snaptrade returns snake_case, and a position's ticker sits behind a
// brokerage-specific wrapper: position.symbol.symbol.symbol. Some brokerages
// flatten a level, so walk down until we hit the string.
function readTicker(node: any): string | null {
  for (let i = 0, cur = node; i < 4 && cur; i++, cur = cur.symbol) {
    if (typeof cur.symbol === 'string') return cur.symbol.toUpperCase();
    if (typeof cur.raw_symbol === 'string') return cur.raw_symbol.toUpperCase();
  }
  return null;
}

function readCurrency(node: any): ITransaction['currency'] {
  const code = node?.currency?.code ?? node?.symbol?.currency?.code ?? node?.symbol?.symbol?.currency?.code;
  return code === 'CAD' ? 'CAD' : 'USD';
}

// Snaptrade activity types we can represent. Anything else (FUNDS_CONVERSION,
// OPTIONEXPIRATION, …) is counted and reported rather than silently dropped.
const ACTIVITY_TYPES: Record<string, ITransaction['type']> = {
  BUY: 'buy',
  SELL: 'sell',
  DIVIDEND: 'dividend',
  INTEREST: 'dividend',
  CONTRIBUTION: 'deposit',
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
};

/**
 * Wealthsimple hands back several accounts sharing one name (two TFSAs, two
 * RRSPs, …) that differ only by currency, so the raw name is not a safe key —
 * distinct accounts would collapse into one bucket. Qualify with currency, then
 * with a slice of the account id if that still collides.
 */
function buildAccountNames(accounts: any[]): Map<string, string> {
  const names = new Map<string, string>();
  const taken = new Map<string, string>();

  for (const a of accounts) {
    const base = a.name || [a.institution_name, a.number].filter(Boolean).join(' ') || `Account ${a.id}`;
    const currency = a.balance?.total?.currency ?? a.currency?.code;
    let name = currency ? `${base} · ${currency}` : base;

    const owner = taken.get(name);
    if (owner && owner !== a.id) name = `${name} (${String(a.id).slice(0, 4)})`;

    taken.set(name, a.id);
    names.set(a.id, name);
  }
  return names;
}

// Pulls accounts → positions → balances → activity and folds them into the Portfolio doc.
// Exported so a scheduled job can refresh a user without going through HTTP.
export async function syncSnaptradeData(userId: string, snaptradeUserId: string, snaptradeUserSecret: string) {
  const p = await getOrCreate(userId);
  const accounts = (await SnaptradeSDK.listAccounts(snaptradeUserId, snaptradeUserSecret)) as any[];

  if (!accounts.length) {
    throw new Error('No brokerage accounts are linked yet — finish connecting a broker in the Snaptrade portal first.');
  }

  const accountNames = buildAccountNames(accounts);
  const syncedAccounts = new Set(accountNames.values());
  const seenTx = new Set(p.transactions.map((t) => t.externalId).filter(Boolean));
  const cashByCurrency: Record<string, number> = { CAD: 0, USD: 0 };
  const skippedTypes: Record<string, number> = {};

  const freshHoldings: Array<{ ticker: string; quantity: number; avgCost: number; currency: ITransaction['currency']; account: string }> = [];
  let importedTx = 0;

  for (const account of accounts) {
    const accountId: string = account.id;
    const accountName = accountNames.get(accountId)!;
    if (!p.accounts.includes(accountName)) p.accounts.push(accountName);

    // Positions → holdings. Snaptrade is the source of truth, so collect the full
    // fresh set and reconcile below rather than upserting (sold-out positions must go).
    const positions = (await SnaptradeSDK.getAccountPositions(snaptradeUserId, snaptradeUserSecret, accountId)) as any[];
    for (const pos of positions) {
      const ticker = readTicker(pos.symbol ?? pos);
      const units = Number(pos.units ?? pos.fractional_units);
      if (!ticker || !Number.isFinite(units) || units === 0) continue;
      freshHoldings.push({
        ticker,
        quantity: units,
        avgCost: Number(pos.average_purchase_price ?? pos.price ?? 0) || 0,
        currency: readCurrency(pos),
        account: accountName,
      });
    }

    // Uninvested cash sitting in the account
    const balances = (await SnaptradeSDK.getAccountBalance(snaptradeUserId, snaptradeUserSecret, accountId)) as any[];
    for (const b of balances ?? []) {
      const amount = Number(b?.cash);
      const code = b?.currency?.code === 'CAD' ? 'CAD' : 'USD';
      if (Number.isFinite(amount) && amount !== 0) cashByCurrency[code] += amount;
    }

    // Full activity history, deduped on Snaptrade's immutable activity id
    const activities = await SnaptradeSDK.getAccountActivities(snaptradeUserId, snaptradeUserSecret, accountId);
    for (const act of activities) {
      const rawType = String(act.type || '').toUpperCase();
      const type = ACTIVITY_TYPES[rawType];
      const externalId: string | undefined = act.id;

      if (!type) { skippedTypes[rawType] = (skippedTypes[rawType] ?? 0) + 1; continue; }
      if (!externalId || seenTx.has(externalId)) continue;

      const isCash = type === 'deposit' || type === 'withdrawal';
      p.transactions.push({
        externalId,
        date: new Date(act.trade_date || act.settlement_date || Date.now()),
        type,
        ticker: readTicker(act.symbol) ?? undefined,
        quantity: isCash ? undefined : Number(act.units) || undefined,
        price: isCash ? undefined : Number(act.price) || undefined,
        amount: Math.abs(Number(act.amount) || 0),
        currency: readCurrency(act),
        note: act.description ? `${accountName} — ${act.description}`.slice(0, 200) : accountName,
      } as any);
      seenTx.add(externalId);
      importedTx++;
    }
  }

  // Reconcile holdings: replace everything under the accounts we just synced, and
  // leave hand-entered holdings in other accounts untouched.
  const manual = p.holdings.filter((h) => !syncedAccounts.has(h.account)).map((h) => h.toObject());
  p.set('holdings', [...manual, ...freshHoldings]);

  // The schema carries a single cash figure, so pick the currency holding the most
  // and record it in that currency — no silent FX conversion.
  const [topCurrency, topCash] = Object.entries(cashByCurrency).sort((a, b) => b[1] - a[1])[0];
  p.cash = Number(topCash.toFixed(2));
  p.cashCurrency = topCurrency as ITransaction['currency'];

  await p.save();

  return {
    accounts: accounts.length,
    holdings: freshHoldings.length,
    transactions: importedTx,
    cash: cashByCurrency,
    skippedActivityTypes: skippedTypes,
  };
}

export default router;
