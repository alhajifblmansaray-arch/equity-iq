import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from '../lib/icons';
import { research, simulator as simApi } from '../lib/api';
import type { QuickScan, SimPortfolio, SimSnapshot, SimTrade } from '../types';
import { fmtPrice } from '../lib/helpers';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const STARTING = 10_000;

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string, short = false) {
  if (iso === 'Start') return 'Start';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', short
    ? { month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric', year: '2-digit' });
}

function briefingNote(scan: QuickScan): string {
  const { rsi, changePct } = scan;
  if (rsi !== null) {
    if (rsi >= 78) return `RSI ${rsi.toFixed(0)} — heavily overbought. Strong momentum but elevated reversal risk.`;
    if (rsi >= 68) return `RSI ${rsi.toFixed(0)} — running hot. Can keep climbing, but consider position size.`;
    if (rsi <= 22) return `RSI ${rsi.toFixed(0)} — deeply oversold. Potential bounce candidate, but confirm the thesis.`;
    if (rsi <= 32) return `RSI ${rsi.toFixed(0)} — oversold territory. Could be a value opportunity or a falling knife.`;
  }
  if (changePct !== null) {
    if (changePct >= 6) return `Up ${changePct.toFixed(1)}% today — strong day. Make sure you're not chasing the move.`;
    if (changePct <= -6) return `Down ${changePct.toFixed(1)}% today — sharp sell-off. Know your reason before buying the dip.`;
  }
  return 'Neutral session. Good conditions to evaluate without excess noise.';
}

function rsiColor(rsi: number): string {
  if (rsi >= 70) return 'var(--brick)';
  if (rsi >= 55) return 'var(--amber)';
  if (rsi <= 30) return '#6b7fd7';
  return 'var(--forest)';
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SimulatorPage() {
  const [portfolio, setPortfolio] = useState<SimPortfolio | null>(null);
  const [trades, setTrades] = useState<SimTrade[]>([]);
  const [snapshots, setSnapshots] = useState<SimSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'portfolio' | 'trade' | 'history'>('portfolio');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, t, s] = await Promise.all([simApi.get(), simApi.trades(), simApi.snapshots()]);
      setPortfolio(p);
      setTrades(t);
      setSnapshots(s);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function handleReset() {
    if (!confirm('Reset your portfolio back to $10,000? This cannot be undone.')) return;
    await simApi.reset();
    await loadAll();
  }

  const pnlUp = (portfolio?.totalPnl ?? 0) >= 0;

  // Derived stats from trades
  const closedTrades = trades.filter((t) => t.action === 'sell' && t.pnl !== null);
  const winCount = closedTrades.filter((t) => (t.pnl ?? 0) > 0).length;
  const winRate = closedTrades.length > 0 ? Math.round((winCount / closedTrades.length) * 100) : null;
  const bestTrade = closedTrades.reduce<SimTrade | null>((best, t) =>
    best === null || (t.pnlPct ?? -Infinity) > (best.pnlPct ?? -Infinity) ? t : best, null);

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-10 py-10">
      <header className="mb-6 animate-fadeUp">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={14} className="text-forest" />
          <span className="eyebrow">Paper trading</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-serif text-4xl md:text-5xl tracking-tight2">Simulator</h1>
            <p className="text-ink-secondary mt-1 text-[15px]">
              Trade real stocks with <strong>$10,000 fake money</strong>. Zero risk, real lessons.
            </p>
          </div>
          <button onClick={handleReset} className="btn-ghost text-sm flex-shrink-0">
            <RotateCcw size={13} /> Reset
          </button>
        </div>
      </header>

      {/* Portfolio banner */}
      {portfolio && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="card mb-5"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div>
              <div className="eyebrow mb-1">Portfolio value</div>
              <div className="font-serif text-3xl tracking-tight1 tabular-nums">
                ${fmtPrice(portfolio.totalValue)}
              </div>
            </div>
            <div>
              <div className="eyebrow mb-1">Cash available</div>
              <div className="font-serif text-2xl tracking-tight1 tabular-nums text-ink-secondary">
                ${fmtPrice(portfolio.cash)}
              </div>
            </div>
            <div>
              <div className="eyebrow mb-1">Total return</div>
              <div className={`font-serif text-2xl tracking-tight1 tabular-nums flex items-center gap-1 ${pnlUp ? 'text-forest' : 'text-brick'}`}>
                {pnlUp ? <ArrowUp size={16} weight="bold" /> : <ArrowDown size={16} weight="bold" />}
                {pnlUp ? '+' : ''}{portfolio.totalPnlPct.toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="eyebrow mb-1">Win rate</div>
              <div className="font-serif text-2xl tracking-tight1 tabular-nums text-ink-secondary">
                {winRate !== null ? `${winRate}%` : '—'}
                {winRate !== null && (
                  <span className="text-[11px] font-sans text-ink-tertiary ml-1.5 font-normal">
                    ({winCount}/{closedTrades.length})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Best trade callout */}
          {bestTrade && (
            <div className="flex items-center gap-2 py-2.5 px-3 rounded-xl mb-3 text-[12px]"
              style={{ background: 'color-mix(in srgb, var(--forest) 8%, var(--cream-tint))' }}>
              <span className="text-forest font-semibold">Best trade:</span>
              <span className="text-ink-secondary">{bestTrade.ticker} — </span>
              <span className="text-forest font-medium tabular-nums">+{bestTrade.pnlPct?.toFixed(1)}% (+${fmtPrice(bestTrade.pnl ?? 0)})</span>
            </div>
          )}

          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--hairline)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, Math.max(2, 50 + portfolio.totalPnlPct / 2))}%`,
                background: pnlUp ? 'var(--forest)' : 'var(--brick)',
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-ink-tertiary mt-1">
            <span>$0</span>
            <span>Started $10,000</span>
            <span>$20,000</span>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div
        className="flex gap-0.5 mb-5 rounded-2xl p-1.5 overflow-x-auto no-scrollbar"
        style={{
          background: 'var(--glass-sidebar-sheen), var(--glass-sidebar-bg)',
          backdropFilter: 'blur(28px)',
          border: '1px solid var(--glass-border)',
        }}
      >
        {(['portfolio', 'trade', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-[13px] font-semibold capitalize transition flex-shrink-0 ${
              tab === t ? 'text-ink' : 'text-ink-secondary hover:text-ink'
            }`}
            style={tab === t ? {
              background: 'var(--panel-bg)',
              boxShadow: 'var(--panel-shadow)',
              border: '1px solid var(--panel-border)',
            } : undefined}
          >
            {t === 'portfolio' ? 'Holdings' : t === 'trade' ? 'Buy / Sell' : 'Trade history'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card flex items-center gap-3 text-ink-secondary text-sm">
          <Loader2 size={16} className="animate-spin text-forest" />
          Loading portfolio…
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: EASE }}
          >
            {tab === 'portfolio' && (
              <PortfolioTab portfolio={portfolio} snapshots={snapshots} onRefresh={loadAll} />
            )}
            {tab === 'trade' && (
              <TradeTab onDone={loadAll} cash={portfolio?.cash ?? 0} />
            )}
            {tab === 'history' && <HistoryTab trades={trades} />}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

// ─── Portfolio tab ────────────────────────────────────────────────────────────

function PortfolioTab({
  portfolio,
  snapshots,
  onRefresh,
}: {
  portfolio: SimPortfolio | null;
  snapshots: SimSnapshot[];
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4">
      <EquityChart snapshots={snapshots} />
      <HoldingsTab portfolio={portfolio} onRefresh={onRefresh} />
    </div>
  );
}

// ─── Equity curve chart ───────────────────────────────────────────────────────

type Range = '1W' | '1M' | 'ALL';

function EquityChart({ snapshots }: { snapshots: SimSnapshot[] }) {
  const [range, setRange] = useState<Range>('ALL');

  const chartData = useMemo(() => {
    const now = Date.now();
    const cutoff = range === '1W' ? now - 7 * 86_400_000
      : range === '1M' ? now - 30 * 86_400_000
      : 0;

    const filtered = snapshots.filter((s) => new Date(s.date).getTime() >= cutoff);

    const pts = filtered.map((s) => ({
      date: s.date,
      label: fmtDate(s.date, true),
      value: s.totalValue,
      pct: ((s.totalValue - STARTING) / STARTING) * 100,
    }));

    // Always prepend the $10k start point unless the first snap is already ≤ $10k and far back
    if (pts.length === 0 || pts[0].value !== STARTING) {
      pts.unshift({ date: 'Start', label: 'Start', value: STARTING, pct: 0 });
    }
    return pts;
  }, [snapshots, range]);

  const latest = chartData[chartData.length - 1];
  const isUp = (latest?.pct ?? 0) >= 0;
  const lineColor = isUp ? 'var(--forest)' : 'var(--brick)';
  const gradId = isUp ? 'sim-grad-up' : 'sim-grad-down';

  const yMin = useMemo(() => {
    const vals = chartData.map((d) => d.value);
    return Math.min(...vals, STARTING) * 0.97;
  }, [chartData]);

  const yMax = useMemo(() => {
    const vals = chartData.map((d) => d.value);
    return Math.max(...vals, STARTING) * 1.03;
  }, [chartData]);

  if (chartData.length < 2) {
    return (
      <div className="card text-center py-10">
        <div className="text-3xl mb-3">📈</div>
        <h3 className="font-serif text-xl mb-1">Your equity curve starts here</h3>
        <p className="text-ink-secondary text-sm">Make a few trades and come back — you'll see your portfolio's story plotted over time.</p>
      </div>
    );
  }

  return (
    <div className="card">
      {/* Chart header */}
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="eyebrow mb-1">Portfolio equity curve</div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-3xl tracking-tight1 tabular-nums">
              ${fmtPrice(latest.value)}
            </span>
            <span className={`text-sm font-medium tabular-nums ${isUp ? 'text-forest' : 'text-brick'}`}>
              {isUp ? '+' : ''}{latest.pct.toFixed(2)}%
              <span className="text-ink-tertiary font-normal ml-1">vs $10k start</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-full" style={{ background: 'var(--cream-tint)' }}>
          {(['1W', '1M', 'ALL'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-3 py-1 rounded-full text-[11px] font-semibold transition"
              style={range === r ? { background: 'var(--panel-bg)', color: 'var(--ink)', boxShadow: 'var(--panel-shadow)' } : { color: 'var(--ink-tertiary)' }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="sim-grad-up" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--forest)" stopOpacity={0.18} />
                <stop offset="95%" stopColor="var(--forest)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="sim-grad-down" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--brick)" stopOpacity={0.18} />
                <stop offset="95%" stopColor="var(--brick)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'var(--ink-tertiary)' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 10, fill: 'var(--ink-tertiary)' }}
              axisLine={false}
              tickLine={false}
              width={64}
              tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
            />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine
              y={STARTING}
              stroke="var(--hairline)"
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={lineColor}
              strokeWidth={2}
              fill={`url(#${gradId})`}
              dot={false}
              activeDot={{ r: 4, fill: lineColor, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-hairline">
        <Stat
          label="Dollar P&L"
          value={`${isUp ? '+' : '-'}$${fmtPrice(Math.abs(latest.value - STARTING))}`}
          color={isUp ? 'var(--forest)' : 'var(--brick)'}
        />
        <Stat
          label="Peak value"
          value={`$${fmtPrice(Math.max(...chartData.map((d) => d.value)))}`}
        />
        <Stat
          label="Days tracked"
          value={String(chartData.filter((d) => d.date !== 'Start').length)}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="eyebrow mb-1">{label}</div>
      <div className="font-serif text-xl tracking-tight1 tabular-nums" style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { value, pct, date } = payload[0].payload;
  const up = pct >= 0;
  return (
    <div
      className="rounded-2xl shadow-cardHover px-3 py-2.5 text-[12px]"
      style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--panel-border)',
        minWidth: 140,
      }}
    >
      <div className="text-ink-tertiary mb-1">{date === 'Start' ? 'Starting balance' : fmtDate(date)}</div>
      <div className="font-serif text-lg tabular-nums">${fmtPrice(value)}</div>
      <div className={`font-medium tabular-nums ${up ? 'text-forest' : 'text-brick'}`}>
        {up ? '+' : ''}{pct.toFixed(2)}%
      </div>
    </div>
  );
}

// ─── Holdings tab ─────────────────────────────────────────────────────────────

function HoldingsTab({ portfolio, onRefresh }: { portfolio: SimPortfolio | null; onRefresh: () => void }) {
  if (!portfolio || portfolio.holdings.length === 0) {
    return (
      <div className="card text-center py-10">
        <TrendingUp size={28} className="mx-auto mb-3 text-ink-tertiary" weight="thin" />
        <h3 className="font-serif text-2xl mb-2">No positions yet</h3>
        <p className="text-ink-secondary text-sm mb-4">
          Go to "Buy / Sell" to make your first trade. You have ${fmtPrice(portfolio?.cash ?? 10_000)} ready to invest.
        </p>
        <Link to="/dashboard" className="btn-forest inline-flex mx-auto">
          Browse stocks <ChevronRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="eyebrow">Positions ({portfolio.holdings.length})</div>
        <button onClick={onRefresh} className="btn-ghost text-xs">
          <RefreshCw size={12} /> Refresh prices
        </button>
      </div>
      {portfolio.holdings.map((h, i) => {
        const up = (h.pnl ?? 0) >= 0;
        const allocationPct = portfolio.totalValue > 0
          ? ((h.marketValue ?? h.costBasis) / portfolio.totalValue) * 100
          : 0;
        return (
          <motion.div
            key={h.ticker}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE, delay: i * 0.05 }}
            className="card"
          >
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <Link
                  to={`/dashboard?ticker=${h.ticker}`}
                  className="font-serif text-2xl tracking-tight1 hover:text-forest transition"
                >
                  {h.ticker}
                </Link>
                <div className="text-sm text-ink-secondary mt-0.5">
                  {h.shares} shares · avg ${fmtPrice(h.avgCost)}
                </div>
                {/* Allocation bar */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--hairline)', maxWidth: 80 }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${allocationPct}%`, background: 'var(--forest)' }}
                    />
                  </div>
                  <span className="text-[10px] text-ink-tertiary tabular-nums">{allocationPct.toFixed(0)}% of portfolio</span>
                </div>
              </div>
              <div className="text-right">
                {h.currentPrice != null ? (
                  <>
                    <div className="font-serif text-xl tabular-nums">${fmtPrice(h.currentPrice)}</div>
                    <div className={`text-sm font-medium flex items-center justify-end gap-1 mt-0.5 ${up ? 'text-forest' : 'text-brick'}`}>
                      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {up ? '+' : ''}{h.pnlPct?.toFixed(2)}%
                    </div>
                    <div className={`text-[11px] tabular-nums ${up ? 'text-forest' : 'text-brick'}`}>
                      {up ? '+' : '-'}${fmtPrice(Math.abs(h.pnl ?? 0))}
                    </div>
                  </>
                ) : (
                  <span className="text-ink-tertiary text-sm">—</span>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Trade tab ────────────────────────────────────────────────────────────────

function TradeTab({ onDone, cash }: { onDone: () => void; cash: number }) {
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [inputMode, setInputMode] = useState<'shares' | 'dollars'>('shares');
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');
  const [dollars, setDollars] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Pre-trade briefing
  const [scan, setScan] = useState<QuickScan | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch quick scan when ticker changes
  useEffect(() => {
    setScan(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (ticker.length < 1) return;
    debounceRef.current = setTimeout(async () => {
      setScanLoading(true);
      try {
        const q = await research.quick(ticker);
        setScan(q);
      } catch {
        setScan(null);
      } finally {
        setScanLoading(false);
      }
    }, 700);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [ticker]);

  // Compute shares from dollar input
  const computedShares = useMemo(() => {
    if (inputMode !== 'dollars' || !scan?.price || !dollars) return null;
    const d = Number(dollars);
    if (!isFinite(d) || d <= 0) return null;
    return Math.floor(d / scan.price);
  }, [inputMode, scan, dollars]);

  // Cost preview
  const costPreview = useMemo(() => {
    const s = inputMode === 'dollars' ? computedShares : Number(shares);
    if (!s || !scan?.price || s <= 0) return null;
    const total = s * scan.price;
    return { shares: s, total, remaining: cash - total };
  }, [inputMode, computedShares, shares, scan, cash]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setSuccess(null);

    const finalShares = inputMode === 'dollars' ? computedShares : Number(shares);
    if (!ticker) { setErr('Enter a ticker symbol.'); return; }
    if (!finalShares || !Number.isFinite(finalShares) || finalShares <= 0) {
      setErr(inputMode === 'dollars' ? 'Enter a dollar amount that covers at least 1 share.' : 'Shares must be a positive whole number.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'buy') {
        const r = await simApi.buy(ticker.toUpperCase(), finalShares);
        setSuccess(`Bought ${r.shares} shares of ${r.ticker} at $${fmtPrice(r.price)}. Cash remaining: $${fmtPrice(r.cashRemaining)}.`);
      } else {
        const r = await simApi.sell(ticker.toUpperCase(), finalShares);
        const pnl = r.pnl ?? 0;
        setSuccess(`Sold ${r.shares} shares of ${r.ticker} at $${fmtPrice(r.price)}. P&L: ${pnl >= 0 ? '+' : ''}$${fmtPrice(Math.abs(pnl))} (${r.pnlPct?.toFixed(2)}%).`);
      }
      setShares('');
      setDollars('');
      onDone();
    } catch (e: any) {
      setErr(e?.response?.data?.error || 'Trade failed.');
    } finally {
      setBusy(false);
    }
  }

  const priceUp = (scan?.changePct ?? 0) >= 0;

  return (
    <div className="card">
      <div className="eyebrow mb-1">Execute a trade</div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="section-title">Buy or sell stock</h3>
        <span className="text-[13px] text-ink-secondary">
          <strong className="text-ink">${fmtPrice(cash)}</strong> available
        </span>
      </div>

      {/* Buy / Sell toggle */}
      <div className="inline-flex items-center bg-cream-tint rounded-full p-1 mb-5">
        {(['buy', 'sell'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setErr(null); setSuccess(null); }}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition capitalize ${
              mode === m ? 'bg-white text-ink shadow-pill' : 'text-ink-secondary'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4">
        {/* Ticker */}
        <div>
          <div className="eyebrow mb-1.5">Ticker symbol</div>
          <div className="relative">
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="AAPL"
              maxLength={10}
              className="w-full px-4 py-3 rounded-2xl bg-cream-tint border border-transparent focus:border-ink-tertiary focus:bg-white transition text-[15px] uppercase tracking-tight1 font-medium pr-10"
            />
            {scanLoading && (
              <Loader2 size={14} className="animate-spin text-ink-tertiary absolute right-3 top-1/2 -translate-y-1/2" />
            )}
          </div>
        </div>

        {/* Pre-trade briefing */}
        <AnimatePresence>
          {scan?.price != null && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="overflow-hidden"
            >
              <div
                className="rounded-2xl p-4"
                style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
              >
                {/* Price row */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-serif text-2xl tabular-nums">${fmtPrice(scan.price)}</span>
                    <span className={`ml-2 text-sm font-medium tabular-nums ${priceUp ? 'text-forest' : 'text-brick'}`}>
                      {priceUp ? '+' : ''}{scan.changePct?.toFixed(2)}% today
                    </span>
                  </div>
                  {scan.sma200 != null && scan.price != null && (
                    <span className="text-[11px] text-ink-tertiary">
                      {scan.price > scan.sma200 ? '↑ Above 200-day MA' : '↓ Below 200-day MA'}
                    </span>
                  )}
                </div>

                {/* RSI gauge */}
                {scan.rsi != null && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-ink-tertiary">RSI</span>
                      <span className="font-medium tabular-nums" style={{ color: rsiColor(scan.rsi) }}>
                        {scan.rsi.toFixed(1)}
                        <span className="text-ink-tertiary font-normal ml-1">
                          {scan.rsi >= 70 ? '· overbought' : scan.rsi <= 30 ? '· oversold' : '· neutral'}
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--hairline)' }}>
                      {/* Zones */}
                      <div className="relative h-full rounded-full overflow-hidden">
                        <div className="absolute inset-0 flex">
                          <div style={{ width: '30%', background: 'color-mix(in srgb, #6b7fd7 25%, transparent)' }} />
                          <div style={{ width: '40%', background: 'color-mix(in srgb, var(--forest) 20%, transparent)' }} />
                          <div style={{ width: '30%', background: 'color-mix(in srgb, var(--brick) 25%, transparent)' }} />
                        </div>
                        {/* Needle */}
                        <div
                          className="absolute top-0 h-full w-0.5 rounded-full"
                          style={{
                            left: `${scan.rsi}%`,
                            background: rsiColor(scan.rsi),
                            transform: 'translateX(-50%)',
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between text-[9px] text-ink-tertiary mt-0.5">
                      <span>Oversold (30)</span>
                      <span>Neutral</span>
                      <span>Overbought (70)</span>
                    </div>
                  </div>
                )}

                {/* MACD signal */}
                {scan.macd != null && (
                  <div className="flex items-center gap-1.5 text-[11px] mb-3">
                    <span className="text-ink-tertiary">MACD:</span>
                    <span className={`font-medium ${scan.macd.histogram >= 0 ? 'text-forest' : 'text-brick'}`}>
                      {scan.macd.histogram >= 0 ? 'Bullish' : 'Bearish'} ({scan.macd.histogram.toFixed(2)})
                    </span>
                  </div>
                )}

                {/* One-liner note */}
                <div
                  className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-[12px] leading-relaxed"
                  style={{ background: 'color-mix(in srgb, var(--forest) 7%, var(--cream-tint))' }}
                >
                  <Sparkles size={12} className="text-amber mt-0.5 flex-shrink-0" weight="duotone" />
                  <span className="text-ink-secondary">{briefingNote(scan)}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Shares / Amount input */}
        <div>
          {/* Input mode toggle */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="eyebrow">
              {inputMode === 'shares' ? 'Number of shares' : 'Dollar amount'}
            </div>
            {mode === 'buy' && (
              <button
                type="button"
                onClick={() => { setInputMode((m) => m === 'shares' ? 'dollars' : 'shares'); setShares(''); setDollars(''); }}
                className="text-[11px] text-forest hover:underline"
              >
                {inputMode === 'shares' ? 'Switch to $ amount' : 'Switch to shares'}
              </button>
            )}
          </div>

          {inputMode === 'shares' ? (
            <input
              type="number"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              placeholder="10"
              min="1"
              step="1"
              className="w-full px-4 py-3 rounded-2xl bg-cream-tint border border-transparent focus:border-ink-tertiary focus:bg-white transition text-[15px] tabular-nums"
            />
          ) : (
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-tertiary font-medium">$</span>
              <input
                type="number"
                value={dollars}
                onChange={(e) => setDollars(e.target.value)}
                placeholder="1000"
                min="1"
                step="1"
                className="w-full pl-8 pr-4 py-3 rounded-2xl bg-cream-tint border border-transparent focus:border-ink-tertiary focus:bg-white transition text-[15px] tabular-nums"
              />
            </div>
          )}
        </div>

        {/* Cost preview */}
        <AnimatePresence>
          {costPreview && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="overflow-hidden"
            >
              <div
                className="rounded-2xl px-4 py-3 text-[13px]"
                style={{
                  background: costPreview.remaining >= 0
                    ? 'color-mix(in srgb, var(--forest) 8%, var(--cream-tint))'
                    : 'color-mix(in srgb, var(--brick) 8%, var(--cream-tint))',
                }}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span>
                    <strong>{costPreview.shares}</strong> share{costPreview.shares !== 1 ? 's' : ''} ·{' '}
                    costs <strong>${fmtPrice(costPreview.total)}</strong>
                  </span>
                  <span className={costPreview.remaining >= 0 ? 'text-forest' : 'text-brick'}>
                    {costPreview.remaining >= 0
                      ? `$${fmtPrice(costPreview.remaining)} left`
                      : `$${fmtPrice(Math.abs(costPreview.remaining))} short`}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {err && (
          <div className="flex gap-2 text-brick text-sm">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" weight="fill" />
            <span>{err}</span>
          </div>
        )}
        {success && (
          <div className="flex gap-2 text-forest text-sm"
            style={{ background: 'color-mix(in srgb, var(--forest) 10%, transparent)', borderRadius: '1rem', padding: '12px 16px' }}>
            <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5" weight="fill" />
            <span>{success}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={busy || (costPreview !== null && costPreview.remaining < 0 && mode === 'buy')}
          className={`${mode === 'buy' ? 'btn-forest' : 'btn-primary'} disabled:opacity-50 w-full justify-center`}
        >
          {busy
            ? <><Loader2 size={14} className="animate-spin" /> Executing…</>
            : mode === 'buy'
              ? <><Plus size={14} /> Buy {ticker || 'shares'}</>
              : <><ArrowDown size={14} /> Sell {ticker || 'shares'}</>
          }
        </button>
      </form>

      <div className="mt-5 pt-4 border-t border-hairline text-[12px] text-ink-tertiary space-y-1">
        <p>• All prices are real-time. Trades execute at current market price.</p>
        <p>• No real money is ever used — this is paper trading only.</p>
        <p>• Whole shares only. Dollar-amount mode rounds down to the nearest share.</p>
      </div>
    </div>
  );
}

// ─── History tab ──────────────────────────────────────────────────────────────

function HistoryTab({ trades }: { trades: SimTrade[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (trades.length === 0) {
    return (
      <div className="card text-center py-10">
        <TrendingUp size={28} className="mx-auto mb-3 text-ink-tertiary" weight="thin" />
        <p className="text-ink-secondary text-sm">No trades yet. Make your first trade to see history here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {trades.map((t, i) => {
        const isBuy = t.action === 'buy';
        const pnlUp = (t.pnl ?? 0) >= 0;
        const isOpen = expanded === t._id;

        return (
          <motion.div
            key={t._id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE, delay: i * 0.03 }}
            className="card"
          >
            <button
              className="w-full flex items-center gap-3 text-left"
              onClick={() => setExpanded(isOpen ? null : t._id)}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                style={{
                  background: isBuy
                    ? 'color-mix(in srgb, var(--forest) 15%, var(--cream-tint))'
                    : 'color-mix(in srgb, var(--brick) 15%, var(--cream-tint))',
                  color: isBuy ? 'var(--forest)' : 'var(--brick)',
                }}
              >
                {isBuy ? 'B' : 'S'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{t.ticker}</span>
                  <span className="text-[12px] text-ink-tertiary">{t.shares} shares @ ${fmtPrice(t.price)}</span>
                </div>
                <div className="text-[11px] text-ink-tertiary">
                  {new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {!isBuy && t.pnl != null && (
                <div className={`text-sm font-medium tabular-nums flex items-center gap-1 ${pnlUp ? 'text-forest' : 'text-brick'}`}>
                  {pnlUp ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                  {pnlUp ? '+' : ''}{t.pnlPct?.toFixed(1)}%
                </div>
              )}
              <ChevronDown
                size={14}
                className="text-ink-tertiary flex-shrink-0 transition-transform"
                style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
              />
            </button>

            <AnimatePresence>
              {isOpen && t.aiDebrief && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className="overflow-hidden"
                >
                  <div
                    className="mt-3 rounded-2xl p-4 text-[13px] leading-relaxed text-ink-secondary"
                    style={{ background: 'color-mix(in srgb, var(--forest) 7%, var(--panel-bg))' }}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <Sparkles size={11} className="text-amber" weight="duotone" />
                      <span className="eyebrow text-forest">Trade debrief</span>
                    </div>
                    {t.aiDebrief}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
