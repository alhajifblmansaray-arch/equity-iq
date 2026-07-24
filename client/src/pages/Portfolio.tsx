import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus, X, ChevronDown, Landmark, ArrowRight, ArrowUpRight,
  TrendingDown, Trash2, PenLine, Star, Search,
} from '../lib/icons';
import { portfolio as portfolioApi, research } from '../lib/api';
import { useWatchlist } from '../contexts/WatchlistContext';
import Sparkline from '../components/Sparkline';
import type { PortfolioData, PortfolioHolding, PortfolioTransaction, Currency } from '../types';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const RANGES = ['1W', '1M', '3M', 'YTD', '1Y', 'ALL'] as const;
type Range = (typeof RANGES)[number];

// ── formatters ──────────────────────────────────────────────────────────────────
function money(n: number | null | undefined, cur = 'USD'): string {
  if (n == null) return '—';
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur}`;
}
function dollars(n: number | null | undefined): string {
  if (n == null) return '—';
  return `${n < 0 ? '−' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function pct(n: number | null | undefined): string {
  if (n == null) return '—';
  return `${Math.abs(n).toFixed(2)}%`;
}
function pnlColor(n: number | null | undefined) {
  return n == null ? 'text-ink-secondary' : n > 0 ? 'text-forest' : n < 0 ? 'text-brick' : 'text-ink-secondary';
}

// ── monogram avatar ──────────────────────────────────────────────────────────────
function Monogram({ ticker, color, size = 36 }: { ticker: string; color: string; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold"
      style={{ width: size, height: size, background: color, fontSize: size * 0.34 }}
    >
      {ticker.slice(0, 2)}
    </div>
  );
}

// ── return pill (green/red) ──────────────────────────────────────────────────────
function ReturnCell({ amount, percent }: { amount: number | null; percent: number | null }) {
  if (amount == null) return <span className="text-ink-secondary text-sm">—</span>;
  const up = amount >= 0;
  return (
    <div className="flex items-center justify-end gap-2">
      <span className={`text-sm ${pnlColor(amount)}`}>{up ? '+' : '−'}${Math.abs(amount).toFixed(2)}</span>
      {percent != null && (
        <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${up ? 'bg-forest/15 text-forest' : 'bg-brick/15 text-brick'}`}>
          {pct(percent)}
        </span>
      )}
    </div>
  );
}

// ── hero area chart ──────────────────────────────────────────────────────────────
function AreaChart({ values, height = 180 }: { values: number[]; height?: number }) {
  const width = 720;
  if (values.length < 2) {
    return (
      <div className="flex items-center justify-center text-ink-secondary text-sm border-y border-glass-border/50" style={{ height }}>
        Add holdings to see your value over time.
      </div>
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const pts = values.map((v, i) => [i * step, height - ((v - min) / span) * (height - 20) - 10] as [number, number]);
  const line = pts.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(' ');
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  const up = values[values.length - 1] >= values[0];
  const stroke = up ? 'var(--forest)' : 'var(--brick)';
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="pfGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.18} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="var(--glass-border)" strokeDasharray="4 6" strokeWidth={1} />
      <path d={area} fill="url(#pfGrad)" />
      <path d={line} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r={4} fill={stroke} />
    </svg>
  );
}

// ── allocation donut ─────────────────────────────────────────────────────────────
function Donut({ holdings, size = 92 }: { holdings: PortfolioHolding[]; size?: number }) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const segs = holdings.filter((h) => h.allocation > 0);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--glass-border)" strokeWidth={stroke} />
        {segs.map((h) => {
          const len = (h.allocation / 100) * c;
          const el = (
            <circle
              key={h.id}
              cx={size / 2} cy={size / 2} r={r}
              fill="none" stroke={h.color} strokeWidth={stroke}
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset}
            />
          );
          offset += len;
          return el;
        })}
      </g>
    </svg>
  );
}

// ── generic modal shell ──────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 16 }}
        transition={{ duration: 0.2, ease: EASE }}
        className="card w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-ink">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 transition-all text-ink-secondary"><X size={16} /></button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

const inputCls = 'w-full px-3 py-2 rounded-xl border border-glass-border bg-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-forest/40';
const labelCls = 'block text-xs font-medium text-ink-secondary mb-1';

// ── Add / edit holding form ──────────────────────────────────────────────────────
function HoldingForm({ accounts, editing, onDone, onClose }: {
  accounts: string[]; editing?: PortfolioHolding; onDone: () => void; onClose: () => void;
}) {
  const [ticker, setTicker] = useState(editing?.ticker ?? '');
  const [quantity, setQuantity] = useState(editing?.quantity?.toString() ?? '');
  const [avgCost, setAvgCost] = useState(editing?.avgCost?.toString() ?? '');
  const [currency, setCurrency] = useState<Currency>(editing?.currency ?? 'USD');
  const [account, setAccount] = useState(editing?.account ?? accounts[0] ?? 'RRSP');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ticker || !quantity || !avgCost) { setErr('Ticker, quantity, and average cost are required.'); return; }
    setSaving(true); setErr('');
    try {
      if (editing) {
        await portfolioApi.updateHolding(editing.id, { quantity: Number(quantity), avgCost: Number(avgCost), currency, account });
      } else {
        await portfolioApi.addHolding({ ticker: ticker.toUpperCase(), quantity: Number(quantity), avgCost: Number(avgCost), currency, account });
      }
      onDone();
    } catch { setErr('Failed to save. Please try again.'); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className={labelCls}>Ticker</label>
        <input className={`${inputCls} font-mono uppercase`} value={ticker} disabled={!!editing}
          onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder="AAPL" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Quantity</label>
          <input type="number" step="any" className={inputCls} value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="10" />
        </div>
        <div>
          <label className={labelCls}>Average cost</label>
          <input type="number" step="any" className={inputCls} value={avgCost} onChange={(e) => setAvgCost(e.target.value)} placeholder="185.50" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Currency</label>
          <div className="flex rounded-xl overflow-hidden border border-glass-border">
            {(['USD', 'CAD'] as const).map((c) => (
              <button key={c} type="button" onClick={() => setCurrency(c)}
                className={`flex-1 py-2 text-sm font-medium transition-all ${currency === c ? 'bg-forest text-white' : 'text-ink-secondary hover:bg-white/20'}`}>{c}</button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelCls}>Account</label>
          <select className={inputCls} value={account} onChange={(e) => setAccount(e.target.value)}>
            {accounts.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>
      {err && <p className="text-brick text-sm">{err}</p>}
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-forest text-white text-sm font-medium disabled:opacity-50 hover:bg-forest/90 transition-all">
          {saving ? 'Saving…' : editing ? 'Save changes' : 'Add holding'}
        </button>
        <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-glass-border text-sm font-medium hover:bg-white/20 transition-all">Cancel</button>
      </div>
    </form>
  );
}

// ── Log activity (transaction) form ──────────────────────────────────────────────
function ActivityForm({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const [type, setType] = useState<'buy' | 'sell' | 'dividend' | 'deposit' | 'withdrawal'>('buy');
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const needsTicker = type === 'buy' || type === 'sell' || type === 'dividend';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount) { setErr('Amount is required.'); return; }
    setSaving(true); setErr('');
    try {
      await portfolioApi.addTransaction({
        type, amount: Number(amount), currency, date,
        ticker: needsTicker && ticker ? ticker.toUpperCase() : undefined,
        quantity: quantity ? Number(quantity) : undefined,
        price: price ? Number(price) : undefined,
      });
      onDone();
    } catch { setErr('Failed to save. Please try again.'); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className={labelCls}>Type</label>
        <div className="grid grid-cols-5 gap-1">
          {(['buy', 'sell', 'dividend', 'deposit', 'withdrawal'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={`py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${type === t ? 'bg-forest text-white' : 'border border-glass-border text-ink-secondary hover:bg-white/20'}`}>{t}</button>
          ))}
        </div>
      </div>
      {needsTicker && (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Ticker</label>
            <input className={`${inputCls} font-mono uppercase`} value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder="AAPL" />
          </div>
          <div>
            <label className={labelCls}>Quantity</label>
            <input type="number" step="any" className={inputCls} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Price</label>
            <input type="number" step="any" className={inputCls} value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <label className={labelCls}>Amount</label>
          <input type="number" step="any" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500.00" />
        </div>
        <div>
          <label className={labelCls}>Currency</label>
          <select className={inputCls} value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
            <option value="USD">USD</option><option value="CAD">CAD</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Date</label>
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      {err && <p className="text-brick text-sm">{err}</p>}
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-forest text-white text-sm font-medium disabled:opacity-50 hover:bg-forest/90 transition-all">
          {saving ? 'Saving…' : 'Log activity'}
        </button>
        <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-glass-border text-sm font-medium hover:bg-white/20 transition-all">Cancel</button>
      </div>
    </form>
  );
}

// ── Cash editor ──────────────────────────────────────────────────────────────────
function CashForm({ cash, currency, onDone, onClose }: { cash: number; currency: Currency; onDone: () => void; onClose: () => void }) {
  const [val, setVal] = useState(cash.toString());
  const [cur, setCur] = useState<Currency>(currency);
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try { await portfolioApi.setCash(Number(val || 0), cur); onDone(); } finally { setSaving(false); }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className={labelCls}>Total cash available</label>
        <input type="number" step="any" className={inputCls} value={val} onChange={(e) => setVal(e.target.value)} autoFocus />
      </div>
      <div>
        <label className={labelCls}>Currency</label>
        <div className="flex rounded-xl overflow-hidden border border-glass-border w-fit">
          {(['USD', 'CAD'] as const).map((c) => (
            <button key={c} type="button" onClick={() => setCur(c)}
              className={`px-6 py-2 text-sm font-medium transition-all ${cur === c ? 'bg-forest text-white' : 'text-ink-secondary hover:bg-white/20'}`}>{c}</button>
          ))}
        </div>
      </div>
      <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-forest text-white text-sm font-medium disabled:opacity-50 hover:bg-forest/90 transition-all">
        {saving ? 'Saving…' : 'Save'}
      </button>
    </form>
  );
}

// ── Watchlist rail (reuses the app's watchlist) ──────────────────────────────────
function WatchlistRail() {
  const { tickers, snaps, add, remove } = useWatchlist();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [val, setVal] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!val.trim()) return;
    try { await add(val.trim().toUpperCase()); setVal(''); setAdding(false); } catch { /* ignore */ }
  }
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-ink flex items-center gap-1.5"><Star size={15} /> Watchlist</h3>
        <button onClick={() => setAdding((a) => !a)} className="text-ink-secondary hover:text-ink transition-all"><Plus size={16} /></button>
      </div>
      {adding && (
        <form onSubmit={submit} className="flex gap-2 mb-3">
          <input autoFocus className={`${inputCls} font-mono uppercase`} value={val} onChange={(e) => setVal(e.target.value.toUpperCase())} placeholder="Add ticker" />
          <button type="submit" className="px-3 rounded-xl bg-forest text-white text-sm">Add</button>
        </form>
      )}
      {tickers.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm font-medium text-ink mb-1">Want to keep an eye out on stocks?</p>
          <p className="text-xs text-ink-secondary mb-3">Track stocks and ETFs easily with your watchlist.</p>
          <button onClick={() => setAdding(true)} className="px-4 py-2 rounded-full border border-glass-border text-sm font-medium hover:bg-white/20 transition-all inline-flex items-center gap-1.5">
            <Search size={13} /> Find a stock
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          {tickers.map((t) => {
            const q = snaps[t]?.quote;
            const spark = snaps[t]?.spark ?? [];
            const up = (q?.changePct ?? 0) >= 0;
            return (
              <div key={t} className="group flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
                onClick={() => navigate(`/dashboard?ticker=${t}`)}>
                <span className="font-mono font-semibold text-sm flex-1">{t}</span>
                {spark.length > 1 && <Sparkline values={spark} width={44} height={18} />}
                {q?.price != null && <span className="text-sm text-ink-secondary">${q.price.toFixed(2)}</span>}
                {q?.changePct != null && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${up ? 'bg-forest/15 text-forest' : 'bg-brick/15 text-brick'}`}>
                    {up ? '+' : '−'}{Math.abs(q.changePct).toFixed(2)}%
                  </span>
                )}
                <button onClick={(e) => { e.stopPropagation(); remove(t); }} className="opacity-0 group-hover:opacity-100 text-ink-secondary hover:text-brick transition-all"><X size={13} /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── transaction label ────────────────────────────────────────────────────────────
function txLabel(t: PortfolioTransaction): string {
  switch (t.type) {
    case 'buy': return 'Market buy';
    case 'sell': return 'Market sell';
    case 'dividend': return 'Dividend';
    case 'deposit': return 'Deposit';
    case 'withdrawal': return 'Withdrawal';
  }
}
function groupByDate(txs: PortfolioTransaction[]): [string, PortfolioTransaction[]][] {
  const map = new Map<string, PortfolioTransaction[]>();
  for (const t of txs) {
    const key = new Date(t.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  return [...map.entries()];
}

// ── main page ────────────────────────────────────────────────────────────────────
type Modal =
  | { type: 'add-holding' }
  | { type: 'edit-holding'; holding: PortfolioHolding }
  | { type: 'activity' }
  | { type: 'cash' }
  | null;

export default function Portfolio() {
  const navigate = useNavigate();
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<string>('all');
  const [accountOpen, setAccountOpen] = useState(false);
  const [range, setRange] = useState<Range>('1M');
  const [modal, setModal] = useState<Modal>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await portfolioApi.get(account === 'all' ? undefined : account);
      setData(d);
    } finally { setLoading(false); }
  }, [account]);

  useEffect(() => { load(); }, [load]);

  const rangedHistory = useMemo(() => {
    if (!data?.history?.length) return [];
    const h = data.history;
    const take: Record<Range, number> = { '1W': 7, '1M': 22, '3M': 30, YTD: 30, '1Y': 30, ALL: 30 };
    return h.slice(-Math.min(take[range], h.length));
  }, [data, range]);

  const cur = data?.cashCurrency ?? 'USD';
  const s = data?.summary;
  const dayUp = (s?.todayChange ?? 0) >= 0;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
      {/* Account header */}
      <div className="flex items-center justify-between mb-6">
        <div className="relative">
          <button onClick={() => setAccountOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/20 transition-all">
            <div className="w-8 h-8 rounded-xl bg-forest/15 text-forest flex items-center justify-center"><Landmark size={16} /></div>
            <span className="font-semibold text-ink">{account === 'all' ? 'All accounts' : account}</span>
            <ChevronDown size={15} className="text-ink-secondary" />
          </button>
          <AnimatePresence>
            {accountOpen && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                className="absolute z-20 mt-1 w-52 card !p-1.5">
                {['all', ...(data?.accounts ?? [])].map((a) => (
                  <button key={a} onClick={() => { setAccount(a); setAccountOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${account === a ? 'bg-forest/15 text-forest font-medium' : 'text-ink-secondary hover:bg-white/20'}`}>
                    {a === 'all' ? 'All accounts' : a}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* ── Main column ── */}
        <div>
          {/* Hero value */}
          <div className="mb-1">
            <div className="flex items-baseline gap-2">
              <h1 className="text-4xl font-semibold text-ink tracking-tight">
                {loading ? '—' : `$${(s?.totalValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </h1>
              <span className="text-ink-secondary text-sm font-medium">{cur}</span>
            </div>
            {s && (
              <div className={`flex items-center gap-1 mt-1 text-sm font-medium ${pnlColor(s.todayChange)}`}>
                {dayUp ? <ArrowUpRight size={15} /> : <TrendingDown size={15} />}
                {dollars(s.todayChange)} <span className="text-ink-secondary font-normal">today</span>
              </div>
            )}
          </div>

          {/* Chart */}
          <div className="mt-4"><AreaChart values={rangedHistory} /></div>

          {/* Range tabs */}
          <div className="flex gap-1 mt-3 mb-6">
            {RANGES.map((r) => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${range === r ? 'bg-white/60 text-ink shadow-sm' : 'text-ink-secondary hover:text-ink'}`}>{r}</button>
            ))}
          </div>

          {/* Holdings table */}
          <div className="card !p-0 overflow-hidden mb-6">
            <div className="px-5 py-3 border-b border-glass-border flex items-center justify-between">
              <h3 className="font-semibold text-ink text-sm">Holdings</h3>
              <button onClick={() => setModal({ type: 'add-holding' })} className="text-forest text-xs font-medium inline-flex items-center gap-1 hover:opacity-80 transition-all">
                <Plus size={13} /> Add
              </button>
            </div>
            {loading ? (
              <div className="py-12 text-center text-ink-secondary text-sm">Loading…</div>
            ) : !data?.holdings.length ? (
              <div className="py-12 text-center">
                <p className="font-medium text-ink mb-1">No holdings yet</p>
                <p className="text-sm text-ink-secondary mb-4">Add your positions to track live value and returns.</p>
                <button onClick={() => setModal({ type: 'add-holding' })} className="px-4 py-2 rounded-xl bg-forest text-white text-sm font-medium hover:bg-forest/90 transition-all">Add a holding</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-ink-secondary text-xs border-b border-glass-border/50">
                      <th className="text-left font-medium px-5 py-2.5">Holdings</th>
                      <th className="text-left font-medium px-2 py-2.5">Cur.</th>
                      <th className="text-right font-medium px-2 py-2.5">Allocation</th>
                      <th className="text-right font-medium px-2 py-2.5">Quantity</th>
                      <th className="text-right font-medium px-2 py-2.5">Today</th>
                      <th className="text-right font-medium px-2 py-2.5">Total value</th>
                      <th className="text-right font-medium px-5 py-2.5">All-time</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.holdings.map((h) => (
                      <tr key={h.id} className="group border-b border-glass-border/40 last:border-0 hover:bg-white/10 transition-all cursor-pointer"
                        onClick={() => navigate(`/dashboard?ticker=${h.ticker}`)}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <Monogram ticker={h.ticker} color={h.color} size={32} />
                            <div>
                              <p className="font-semibold text-ink">{h.ticker}</p>
                              <p className="text-xs text-ink-secondary">{h.account}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-ink-secondary text-xs">{h.currency}</td>
                        <td className="px-2 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-ink">{h.allocation.toFixed(1)}%</span>
                            <span className="w-2 h-2 rounded-full" style={{ background: h.color }} />
                          </div>
                        </td>
                        <td className="px-2 py-3 text-right text-ink font-mono">{h.quantity}</td>
                        <td className="px-2 py-3"><ReturnCell amount={h.todayReturn} percent={h.changePct} /></td>
                        <td className="px-2 py-3 text-right text-ink font-medium">{h.marketValue != null ? `$${h.marketValue.toFixed(2)}` : '—'}</td>
                        <td className="px-5 py-3"><ReturnCell amount={h.allTimeReturn} percent={h.allTimeReturnPct} /></td>
                        <td className="pr-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={(e) => { e.stopPropagation(); setModal({ type: 'edit-holding', holding: h }); }} className="p-1 text-ink-secondary hover:text-ink"><PenLine size={13} /></button>
                            <button onClick={async (e) => { e.stopPropagation(); await portfolioApi.removeHolding(h.id); load(); }} className="p-1 text-ink-secondary hover:text-brick"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-ink">Recent activity</h3>
              <button onClick={() => setModal({ type: 'activity' })} className="text-forest text-xs font-medium inline-flex items-center gap-1 hover:opacity-80 transition-all">
                <Plus size={13} /> Log activity
              </button>
            </div>
            {!data?.transactions.length ? (
              <p className="text-sm text-ink-secondary text-center py-6">No activity logged yet.</p>
            ) : (
              <div className="space-y-5">
                {groupByDate(data.transactions).map(([date, items]) => (
                  <div key={date}>
                    <p className="text-xs text-ink-secondary font-medium mb-2">{date}</p>
                    <div className="space-y-1">
                      {items.map((t) => (
                        <div key={t.id} className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 transition-all">
                          <Monogram ticker={t.ticker ?? '$'} color={t.color} size={34} />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-ink text-sm">{t.ticker ?? txLabel(t)}</p>
                            <p className="text-xs text-ink-secondary">{txLabel(t)}{t.quantity ? ` · ${t.quantity} @ $${t.price ?? '—'}` : ''}</p>
                          </div>
                          <span className="text-sm font-medium text-ink">${t.amount.toFixed(2)} {t.currency}</span>
                          <button onClick={() => portfolioApi.removeTransaction(t.id).then(load)} className="opacity-0 group-hover:opacity-100 text-ink-secondary hover:text-brick transition-all"><X size={13} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right rail ── */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setModal({ type: 'add-holding' })} className="card !py-4 flex flex-col items-center gap-1.5 hover:bg-white/20 transition-all">
              <Plus size={18} className="text-forest" />
              <span className="text-sm font-medium text-ink">Add holding</span>
            </button>
            <button onClick={() => setModal({ type: 'activity' })} className="card !py-4 flex flex-col items-center gap-1.5 hover:bg-white/20 transition-all">
              <ArrowRight size={18} className="text-forest" />
              <span className="text-sm font-medium text-ink">Log activity</span>
            </button>
          </div>

          {/* Cash */}
          <button onClick={() => setModal({ type: 'cash' })} className="card w-full text-left hover:bg-white/10 transition-all">
            <p className="text-xs text-ink-secondary mb-1">Total cash available</p>
            <p className="text-2xl font-semibold text-ink">{money(data?.cash ?? 0, cur)}</p>
          </button>

          {/* Allocation */}
          {data?.holdings.length ? (
            <div className="card">
              <p className="font-semibold text-ink mb-3">Allocation</p>
              <div className="flex items-center gap-4">
                <Donut holdings={data.holdings} />
                <div className="flex-1 space-y-1.5">
                  {data.holdings.slice(0, 5).map((h) => (
                    <div key={h.id} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: h.color }} />
                      <span className="font-mono font-medium text-ink flex-1">{h.ticker}</span>
                      <span className="text-ink-secondary">{h.allocation.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <WatchlistRail />
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {modal?.type === 'add-holding' && (
          <Modal title="Add holding" onClose={() => setModal(null)}>
            <HoldingForm accounts={data?.accounts ?? ['RRSP', 'TFSA', 'Cash']} onDone={() => { setModal(null); load(); }} onClose={() => setModal(null)} />
          </Modal>
        )}
        {modal?.type === 'edit-holding' && (
          <Modal title={`Edit ${modal.holding.ticker}`} onClose={() => setModal(null)}>
            <HoldingForm accounts={data?.accounts ?? []} editing={modal.holding} onDone={() => { setModal(null); load(); }} onClose={() => setModal(null)} />
          </Modal>
        )}
        {modal?.type === 'activity' && (
          <Modal title="Log activity" onClose={() => setModal(null)}>
            <ActivityForm onDone={() => { setModal(null); load(); }} onClose={() => setModal(null)} />
          </Modal>
        )}
        {modal?.type === 'cash' && (
          <Modal title="Cash available" onClose={() => setModal(null)}>
            <CashForm cash={data?.cash ?? 0} currency={cur} onDone={() => { setModal(null); load(); }} onClose={() => setModal(null)} />
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
