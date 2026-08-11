import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
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
  Trophy,
  X,
} from '../lib/icons';
import { api, research, simulator as simApi } from '../lib/api';
import type {
  CoachAdvice,
  EarningsEvent,
  LeaderboardTrade,
  NormalizedBar,
  QuickScan,
  SimLimitOrder,
  SimPortfolio,
  SimSnapshot,
  SimTrade,
} from '../types';
import { fmtPrice } from '../lib/helpers';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const STARTING = 10_000;

const SECTOR_COLORS: Record<string, string> = {
  Technology: '#6B7FD7',
  Financials: '#2E5D43',
  Healthcare: '#5AAF7A',
  'Consumer Discretionary': '#B8853A',
  'Consumer Staples': '#8FAF5A',
  'Communication Services': '#4A90D9',
  Energy: '#C04E40',
  Utilities: '#8B6BAB',
  Industrials: '#5A8FAF',
  'Real Estate': '#AF7A5A',
  Materials: '#7AAF8F',
  ETF: '#3D6E8E',
  Other: '#999',
};

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
    if (rsi >= 78) return `RSI ${rsi.toFixed(0)} - heavily overbought. Strong momentum but elevated reversal risk.`;
    if (rsi >= 68) return `RSI ${rsi.toFixed(0)} - running hot. Can keep climbing, but consider position size.`;
    if (rsi <= 22) return `RSI ${rsi.toFixed(0)} - deeply oversold. Potential bounce candidate, but confirm the thesis.`;
    if (rsi <= 32) return `RSI ${rsi.toFixed(0)} - oversold territory. Could be a value opportunity or a falling knife.`;
  }
  if (changePct !== null) {
    if (changePct >= 6) return `Up ${changePct.toFixed(1)}% today - strong day. Make sure you're not chasing the move.`;
    if (changePct <= -6) return `Down ${changePct.toFixed(1)}% today - sharp sell-off. Know your reason before buying the dip.`;
  }
  return 'Neutral session. Good conditions to evaluate without excess noise.';
}

function rsiColor(rsi: number): string {
  if (rsi >= 70) return 'var(--brick)';
  if (rsi >= 55) return 'var(--amber)';
  if (rsi <= 30) return '#6b7fd7';
  return 'var(--forest)';
}

function actionLabel(action: string): { label: string; color: string; bg: string } {
  switch (action) {
    case 'buy':   return { label: 'BUY',   color: 'var(--forest)', bg: 'color-mix(in srgb, var(--forest) 15%, var(--cream-tint))' };
    case 'sell':  return { label: 'SELL',  color: 'var(--brick)',  bg: 'color-mix(in srgb, var(--brick) 15%, var(--cream-tint))' };
    case 'short': return { label: 'SHORT', color: 'var(--brick)',  bg: 'color-mix(in srgb, var(--brick) 15%, var(--cream-tint))' };
    case 'cover': return { label: 'COVER', color: 'var(--dusty)',  bg: 'color-mix(in srgb, var(--dusty) 15%, var(--cream-tint))' };
    default:      return { label: action.toUpperCase(), color: 'var(--ink)', bg: 'var(--cream-tint)' };
  }
}

// ─── Page ────────────────────────────────────────────────────────────────────

type Tab = 'portfolio' | 'trade' | 'history' | 'coach' | 'leaderboard';

export default function SimulatorPage() {
  const [portfolio, setPortfolio] = useState<SimPortfolio | null>(null);
  const [trades, setTrades] = useState<SimTrade[]>([]);
  const [snapshots, setSnapshots] = useState<SimSnapshot[]>([]);
  const [limitOrders, setLimitOrders] = useState<SimLimitOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('portfolio');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, t, s, l] = await Promise.all([
        simApi.get(),
        simApi.trades(),
        simApi.snapshots(),
        simApi.limits(),
      ]);
      setPortfolio(p);
      setTrades(t);
      setSnapshots(s);
      setLimitOrders(l);
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
  const closedTrades = trades.filter((t) => ['sell', 'cover'].includes(t.action) && t.pnl !== null);
  const winCount = closedTrades.filter((t) => (t.pnl ?? 0) > 0).length;
  const winRate = closedTrades.length > 0 ? Math.round((winCount / closedTrades.length) * 100) : null;
  const bestTrade = closedTrades.reduce<SimTrade | null>((best, t) =>
    best === null || (t.pnlPct ?? -Infinity) > (best.pnlPct ?? -Infinity) ? t : best, null);

  const TABS: Array<{ id: Tab; label: string }> = [
    { id: 'portfolio', label: 'Holdings' },
    { id: 'trade', label: 'Trade' },
    { id: 'history', label: 'History' },
    { id: 'coach', label: 'Coach' },
    { id: 'leaderboard', label: 'Leaderboard' },
  ];

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
                {winRate !== null ? `${winRate}%` : '-'}
                {winRate !== null && (
                  <span className="text-[11px] font-sans text-ink-tertiary ml-1.5 font-normal">
                    ({winCount}/{closedTrades.length})
                  </span>
                )}
              </div>
            </div>
          </div>

          {bestTrade && (
            <div className="flex items-center gap-2 py-2.5 px-3 rounded-xl mb-3 text-[12px]"
              style={{ background: 'color-mix(in srgb, var(--forest) 8%, var(--cream-tint))' }}>
              <span className="text-forest font-semibold">Best trade:</span>
              <span className="text-ink-secondary">{bestTrade.ticker} - </span>
              <span className="text-forest font-medium tabular-nums">
                +{bestTrade.pnlPct?.toFixed(1)}% (+${fmtPrice(bestTrade.pnl ?? 0)})
              </span>
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
            <span>$0</span><span>Started $10,000</span><span>$20,000</span>
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
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition flex-shrink-0 ${
              tab === t.id ? 'text-ink' : 'text-ink-secondary hover:text-ink'
            }`}
            style={tab === t.id ? {
              background: 'var(--panel-bg)',
              boxShadow: 'var(--panel-shadow)',
              border: '1px solid var(--panel-border)',
            } : undefined}
          >
            {t.id === 'leaderboard' && <Trophy size={12} className="inline mr-1.5" />}
            {t.label}
            {t.id === 'trade' && limitOrders.length > 0 && (
              <span className="ml-1.5 text-[10px] font-bold text-amber">{limitOrders.length}</span>
            )}
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
              <PortfolioTab portfolio={portfolio} snapshots={snapshots} onRefresh={loadAll} trades={trades} />
            )}
            {tab === 'trade' && (
              <TradeTab
                onDone={loadAll}
                cash={portfolio?.cash ?? 0}
                portfolio={portfolio}
                limitOrders={limitOrders}
                onCancelLimit={async (id) => { await simApi.cancelLimit(id); await loadAll(); }}
              />
            )}
            {tab === 'history' && <HistoryTab trades={trades} />}
            {tab === 'coach' && <CoachTab portfolio={portfolio} />}
            {tab === 'leaderboard' && <LeaderboardTab />}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

// ─── Portfolio tab ────────────────────────────────────────────────────────────

function PortfolioTab({
  portfolio, snapshots, onRefresh, trades,
}: {
  portfolio: SimPortfolio | null;
  snapshots: SimSnapshot[];
  onRefresh: () => void;
  trades: SimTrade[];
}) {
  return (
    <div className="space-y-4">
      <EquityChart snapshots={snapshots} />
      <RiskMetrics snapshots={snapshots} />
      {portfolio && portfolio.holdings.length > 0 && (
        <>
          <EarningsWarnings portfolio={portfolio} />
          <SectorAllocation portfolio={portfolio} />
        </>
      )}
      <HoldingsTab portfolio={portfolio} onRefresh={onRefresh} />
    </div>
  );
}

// ─── Earnings warnings ────────────────────────────────────────────────────────

function EarningsWarnings({ portfolio }: { portfolio: SimPortfolio }) {
  const [warnings, setWarnings] = useState<EarningsEvent[]>([]);

  useEffect(() => {
    const heldTickers = new Set(portfolio.holdings.map((h) => h.ticker));
    if (heldTickers.size === 0) return;

    api.get<{ events: EarningsEvent[] }>('/calendar/earnings', { params: { days: 7 } })
      .then((r) => {
        const hits = r.data.events.filter((e) => heldTickers.has(e.symbol));
        setWarnings(hits);
      })
      .catch(() => {});
  }, [portfolio.holdings.map((h) => h.ticker).join(',')]);

  if (warnings.length === 0) return null;

  const today = new Date(); today.setHours(0, 0, 0, 0);

  return (
    <div className="card" style={{ borderColor: 'color-mix(in srgb, var(--amber) 40%, var(--panel-border))' }}>
      <div className="flex items-start gap-3">
        <div className="text-xl flex-shrink-0 mt-0.5">⚠️</div>
        <div className="flex-1 min-w-0">
          <div className="eyebrow text-amber mb-2">Earnings risk in your portfolio</div>
          <div className="space-y-2">
            {warnings.map((e) => {
              const earningsDate = new Date(e.date + 'T00:00:00');
              const diffDays = Math.round((earningsDate.getTime() - today.getTime()) / 86_400_000);
              const when = diffDays === 0 ? 'today' : diffDays === 1 ? 'tomorrow' : `in ${diffDays} days`;
              const timing = e.hour === 'bmo' ? '🌅 before open' : e.hour === 'amc' ? '🌆 after close' : '';

              return (
                <div key={e.symbol + e.date} className="flex items-center gap-3 text-[13px]">
                  <Link
                    to={`/dashboard?ticker=${e.symbol}`}
                    className="font-serif text-lg tracking-tight1 hover:text-forest transition flex-shrink-0"
                  >
                    {e.symbol}
                  </Link>
                  <div className="text-ink-secondary flex-1 min-w-0">
                    Reports <strong className="text-ink">{when}</strong>
                    {timing && <span className="text-ink-tertiary"> · {timing}</span>}
                    {e.estimate != null && (
                      <span className="text-ink-tertiary"> · EPS est. ${e.estimate.toFixed(2)}</span>
                    )}
                  </div>
                  <Link to="/calendar" className="text-[11px] text-dusty hover:underline flex-shrink-0">
                    View calendar
                  </Link>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-ink-tertiary mt-3">
            Earnings can cause large price swings. Consider whether your position size accounts for this risk.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Equity curve chart ───────────────────────────────────────────────────────

type Range = '1W' | '1M' | 'ALL';

function EquityChart({ snapshots }: { snapshots: SimSnapshot[] }) {
  const [range, setRange] = useState<Range>('ALL');
  const [spyBars, setSpyBars] = useState<NormalizedBar[]>([]);
  const [showSpy, setShowSpy] = useState(true);

  useEffect(() => {
    research.intraday('SPY', '1day', 365)
      .then((r) => setSpyBars(r.bars))
      .catch(() => {});
  }, []);

  const { chartData, spyNorm } = useMemo(() => {
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

    if (pts.length === 0 || pts[0].value !== STARTING) {
      pts.unshift({ date: 'Start', label: 'Start', value: STARTING, pct: 0 });
    }

    // Normalize SPY to $10k from portfolio start date
    let spyNorm: Array<{ date: string; spyValue: number }> = [];
    if (spyBars.length > 0) {
      const firstRealDate = pts.find((p) => p.date !== 'Start')?.date;
      if (firstRealDate) {
        const spyBase = spyBars.find((b) => b.date >= firstRealDate);
        if (spyBase) {
          spyNorm = spyBars
            .filter((b) => b.date >= firstRealDate)
            .map((b) => ({ date: b.date, spyValue: STARTING * (b.close / spyBase.close) }));
        }
      }
    }

    // Merge spy values into chart pts by date
    const spyMap = new Map(spyNorm.map((s) => [s.date, s.spyValue]));
    const merged = pts.map((p) => ({ ...p, spyValue: spyMap.get(p.date) ?? null }));
    // Fill in SPY gaps with nearest value
    let lastSpy: number | null = null;
    const filled = merged.map((p) => {
      if (p.spyValue !== null) { lastSpy = p.spyValue; return p; }
      if (lastSpy !== null) return { ...p, spyValue: lastSpy };
      return p;
    });

    return { chartData: filled, spyNorm };
  }, [snapshots, range, spyBars]);

  const latest = chartData[chartData.length - 1];
  const isUp = (latest?.pct ?? 0) >= 0;
  const lineColor = isUp ? 'var(--forest)' : 'var(--brick)';
  const gradId = isUp ? 'sim-grad-up' : 'sim-grad-down';

  const yDomain = useMemo(() => {
    const vals = chartData.map((d) => d.value);
    const spyVals = showSpy ? chartData.map((d) => d.spyValue ?? STARTING) : [];
    const all = [...vals, ...spyVals];
    return [Math.min(...all) * 0.97, Math.max(...all) * 1.03];
  }, [chartData, showSpy]);

  // Calculate SPY return for display
  const spyLatest = chartData[chartData.length - 1]?.spyValue;
  const spyPct = spyLatest != null ? ((spyLatest - STARTING) / STARTING) * 100 : null;

  if (chartData.length < 2) {
    return (
      <div className="card text-center py-10">
        <div className="text-3xl mb-3">📈</div>
        <h3 className="font-serif text-xl mb-1">Your equity curve starts here</h3>
        <p className="text-ink-secondary text-sm">Make a few trades and come back - you'll see your portfolio's story plotted over time.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="eyebrow mb-1">Portfolio equity curve</div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-3xl tracking-tight1 tabular-nums">${fmtPrice(latest.value)}</span>
              <span className={`text-sm font-medium tabular-nums ${isUp ? 'text-forest' : 'text-brick'}`}>
                {isUp ? '+' : ''}{latest.pct.toFixed(2)}%
                <span className="text-ink-tertiary font-normal ml-1">you</span>
              </span>
            </div>
            {spyPct != null && showSpy && (
              <div className="flex items-baseline gap-1">
                <span className="text-[13px] tabular-nums text-ink-tertiary">
                  {spyPct >= 0 ? '+' : ''}{spyPct.toFixed(2)}%
                </span>
                <span className="text-[11px] text-ink-tertiary">SPY</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {spyBars.length > 0 && (
            <button
              onClick={() => setShowSpy((v) => !v)}
              className="text-[11px] px-2 py-1 rounded-full transition"
              style={showSpy
                ? { background: 'color-mix(in srgb, var(--dusty) 15%, var(--cream-tint))', color: 'var(--dusty)' }
                : { background: 'var(--cream-tint)', color: 'var(--ink-tertiary)' }}
            >
              SPY {showSpy ? '✓' : ''}
            </button>
          )}
          <div className="flex items-center gap-1 p-1 rounded-full" style={{ background: 'var(--cream-tint)' }}>
            {(['1W', '1M', 'ALL'] as Range[]).map((r) => (
              <button key={r} onClick={() => setRange(r)}
                className="px-3 py-1 rounded-full text-[11px] font-semibold transition"
                style={range === r
                  ? { background: 'var(--panel-bg)', color: 'var(--ink)', boxShadow: 'var(--panel-shadow)' }
                  : { color: 'var(--ink-tertiary)' }}>
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

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
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--ink-tertiary)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis domain={yDomain} tick={{ fontSize: 10, fill: 'var(--ink-tertiary)' }} axisLine={false} tickLine={false} width={64} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
            <Tooltip content={<ChartTooltip spyVisible={showSpy} />} />
            <ReferenceLine y={STARTING} stroke="var(--hairline)" strokeDasharray="4 4" strokeWidth={1.5} />
            {showSpy && spyBars.length > 0 && (
              <Area type="monotone" dataKey="spyValue" stroke="var(--dusty)" strokeWidth={1.5} strokeDasharray="5 3" fill="none" dot={false} activeDot={false} />
            )}
            <Area type="monotone" dataKey="value" stroke={lineColor} strokeWidth={2} fill={`url(#${gradId})`} dot={false} activeDot={{ r: 4, fill: lineColor, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-hairline">
        <Stat label="Dollar P&L" value={`${isUp ? '+' : '-'}$${fmtPrice(Math.abs(latest.value - STARTING))}`} color={isUp ? 'var(--forest)' : 'var(--brick)'} />
        <Stat label="Peak value" value={`$${fmtPrice(Math.max(...chartData.map((d) => d.value)))}`} />
        <Stat label="Days tracked" value={String(chartData.filter((d) => d.date !== 'Start').length)} />
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="eyebrow mb-1">{label}</div>
      <div className="font-serif text-xl tracking-tight1 tabular-nums" style={color ? { color } : undefined}>{value}</div>
    </div>
  );
}

function ChartTooltip({ active, payload, spyVisible }: any) {
  if (!active || !payload?.length) return null;
  const { value, pct, date, spyValue } = payload[0].payload;
  const up = pct >= 0;
  const spyPct = spyValue != null ? ((spyValue - STARTING) / STARTING) * 100 : null;
  return (
    <div className="rounded-2xl shadow-cardHover px-3 py-2.5 text-[12px]"
      style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', minWidth: 150 }}>
      <div className="text-ink-tertiary mb-1">{date === 'Start' ? 'Starting balance' : fmtDate(date)}</div>
      <div className="font-serif text-lg tabular-nums">${fmtPrice(value)}</div>
      <div className={`font-medium tabular-nums ${up ? 'text-forest' : 'text-brick'}`}>{up ? '+' : ''}{pct.toFixed(2)}% <span className="text-ink-tertiary font-normal">you</span></div>
      {spyVisible && spyPct != null && (
        <div className="text-ink-tertiary tabular-nums mt-0.5">{spyPct >= 0 ? '+' : ''}{spyPct.toFixed(2)}% SPY</div>
      )}
    </div>
  );
}

// ─── Risk Metrics ────────────────────────────────────────────────────────────

function RiskMetrics({ snapshots }: { snapshots: SimSnapshot[] }) {
  const metrics = useMemo(() => {
    if (snapshots.length < 3) return null;

    // Daily returns
    const returns = snapshots.slice(1).map((s, i) =>
      (s.totalValue - snapshots[i].totalValue) / snapshots[i].totalValue
    );
    if (returns.length < 2) return null;

    // Max drawdown
    let peak = snapshots[0].totalValue;
    let maxDD = 0;
    for (const s of snapshots) {
      if (s.totalValue > peak) peak = s.totalValue;
      const dd = (peak - s.totalValue) / peak;
      if (dd > maxDD) maxDD = dd;
    }

    // Annualised volatility
    const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
    const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
    const annVol = Math.sqrt(variance) * Math.sqrt(252) * 100;

    // Sharpe (assume 5% risk-free rate annualised)
    const totalReturn = (snapshots[snapshots.length - 1].totalValue - STARTING) / STARTING;
    const annReturn = totalReturn * (252 / returns.length) * 100;
    const sharpe = annVol > 0 ? (annReturn - 5) / annVol : null;

    return { maxDD: maxDD * 100, annVol, sharpe };
  }, [snapshots]);

  if (!metrics) return null;

  const ddColor = metrics.maxDD < 5 ? 'var(--forest)' : metrics.maxDD < 15 ? 'var(--amber)' : 'var(--brick)';
  const sharpeColor = metrics.sharpe == null ? 'var(--ink-secondary)'
    : metrics.sharpe >= 1 ? 'var(--forest)'
    : metrics.sharpe >= 0 ? 'var(--amber)'
    : 'var(--brick)';

  return (
    <div className="card">
      <div className="eyebrow mb-3">Risk metrics</div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="text-[11px] text-ink-tertiary mb-1">Max drawdown</div>
          <div className="font-serif text-xl tabular-nums" style={{ color: ddColor }}>
            -{metrics.maxDD.toFixed(1)}%
          </div>
          <div className="text-[10px] text-ink-tertiary mt-0.5">Largest peak-to-trough drop</div>
        </div>
        <div>
          <div className="text-[11px] text-ink-tertiary mb-1">Volatility (ann.)</div>
          <div className="font-serif text-xl tabular-nums text-ink-secondary">
            {metrics.annVol.toFixed(1)}%
          </div>
          <div className="text-[10px] text-ink-tertiary mt-0.5">Daily returns × √252</div>
        </div>
        <div>
          <div className="text-[11px] text-ink-tertiary mb-1">Sharpe ratio</div>
          <div className="font-serif text-xl tabular-nums" style={{ color: sharpeColor }}>
            {metrics.sharpe != null ? metrics.sharpe.toFixed(2) : '-'}
          </div>
          <div className="text-[10px] text-ink-tertiary mt-0.5">{'≥1 = good risk/reward'}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Sector allocation ────────────────────────────────────────────────────────

function SectorAllocation({ portfolio }: { portfolio: SimPortfolio }) {
  const [sectors, setSectors] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    simApi.sectors().then(setSectors).catch(() => {});
  }, [portfolio.holdings.map((h) => h.ticker).join(',')]);

  const sectorData = useMemo(() => {
    if (!sectors) return [];
    const map: Record<string, number> = {};
    for (const h of portfolio.holdings) {
      const sector = sectors[h.ticker] || 'Other';
      const value = (h.marketValue ?? h.costBasis) * Math.sign(h.shares);
      if (value > 0) map[sector] = (map[sector] ?? 0) + value;
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [sectors, portfolio]);

  if (sectorData.length === 0) return null;

  const total = sectorData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="card">
      <div className="eyebrow mb-3">Sector allocation</div>
      <div className="flex gap-4 items-center">
        <div style={{ width: 100, height: 100, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={sectorData} dataKey="value" cx="50%" cy="50%" innerRadius={28} outerRadius={46} strokeWidth={0}>
                {sectorData.map((entry) => (
                  <Cell key={entry.name} fill={SECTOR_COLORS[entry.name] || '#999'} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1.5">
          {sectorData.map((d) => {
            const pct = total > 0 ? (d.value / total) * 100 : 0;
            return (
              <div key={d.name}>
                <div className="flex items-center justify-between text-[12px] mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: SECTOR_COLORS[d.name] || '#999' }} />
                    <span className="text-ink-secondary">{d.name}</span>
                  </div>
                  <span className="tabular-nums text-ink-tertiary">{pct.toFixed(0)}%</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--hairline)' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: SECTOR_COLORS[d.name] || '#999' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {sectorData.length === 1 && (
        <p className="text-[11px] text-amber mt-3">
          ⚠ All holdings are in one sector. Consider diversifying to reduce concentration risk.
        </p>
      )}
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
          Go to "Trade" to make your first trade. You have ${fmtPrice(portfolio?.cash ?? 10_000)} ready to invest.
        </p>
        <Link to="/dashboard" className="btn-forest inline-flex mx-auto">
          Browse stocks <ChevronRight size={14} />
        </Link>
      </div>
    );
  }

  const longs = portfolio.holdings.filter((h) => h.shares > 0);
  const shorts = portfolio.holdings.filter((h) => h.shares < 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="eyebrow">Positions ({portfolio.holdings.length})</div>
        <button onClick={onRefresh} className="btn-ghost text-xs"><RefreshCw size={12} /> Refresh prices</button>
      </div>
      {[...longs, ...shorts].map((h, i) => {
        const up = (h.pnl ?? 0) >= 0;
        const absShares = Math.abs(h.shares);
        const allocationPct = portfolio.totalValue > 0
          ? ((h.marketValue ?? h.costBasis) / Math.abs(portfolio.totalValue)) * 100
          : 0;
        return (
          <motion.div
            key={h.ticker + (h.isShort ? '-short' : '')}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE, delay: i * 0.05 }}
            className="card"
          >
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link to={`/dashboard?ticker=${h.ticker}`} className="font-serif text-2xl tracking-tight1 hover:text-forest transition">
                    {h.ticker}
                  </Link>
                  {h.isShort && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'color-mix(in srgb, var(--brick) 15%, var(--cream-tint))', color: 'var(--brick)' }}>
                      SHORT
                    </span>
                  )}
                </div>
                <div className="text-sm text-ink-secondary mt-0.5">
                  {absShares} shares · {h.isShort ? 'shorted' : 'avg'} ${fmtPrice(h.avgCost)}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--hairline)', maxWidth: 80 }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(allocationPct, 100)}%`, background: h.isShort ? 'var(--brick)' : 'var(--forest)' }} />
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
                  <span className="text-ink-tertiary text-sm">-</span>
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

type TradeMode = 'buy' | 'sell' | 'short' | 'cover' | 'limit';

function TradeTab({
  onDone, cash, portfolio, limitOrders, onCancelLimit,
}: {
  onDone: () => void;
  cash: number;
  portfolio: SimPortfolio | null;
  limitOrders: SimLimitOrder[];
  onCancelLimit: (id: string) => void;
}) {
  const [mode, setMode] = useState<TradeMode>('buy');
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');
  const [dollars, setDollars] = useState('');
  const [inputMode, setInputMode] = useState<'shares' | 'dollars'>('shares');
  const [note, setNote] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [orderType, setOrderType] = useState<'limit' | 'stop'>('limit');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [scan, setScan] = useState<QuickScan | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setScan(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (ticker.length < 1) return;
    debounceRef.current = setTimeout(async () => {
      setScanLoading(true);
      try { setScan(await research.quick(ticker)); }
      catch { setScan(null); }
      finally { setScanLoading(false); }
    }, 700);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [ticker]);

  const computedShares = useMemo(() => {
    if (inputMode !== 'dollars' || !scan?.price || !dollars) return null;
    const d = Number(dollars);
    if (!isFinite(d) || d <= 0) return null;
    return Math.floor(d / scan.price);
  }, [inputMode, scan, dollars]);

  const finalShares = inputMode === 'dollars' ? computedShares : (shares ? Number(shares) : null);

  const costPreview = useMemo(() => {
    if (!finalShares || !scan?.price || finalShares <= 0) return null;
    const total = finalShares * scan.price;
    return { shares: finalShares, total, remaining: cash - total };
  }, [finalShares, scan, cash]);

  // Short max shares based on margin
  const shortMax = scan?.price ? Math.floor(cash / scan.price) : null;

  // Existing long holding for sell
  const longHolding = portfolio?.holdings.find((h) => h.ticker === ticker.toUpperCase() && h.shares > 0);
  const shortHolding = portfolio?.holdings.find((h) => h.ticker === ticker.toUpperCase() && h.shares < 0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setSuccess(null);
    if (!ticker) { setErr('Enter a ticker symbol.'); return; }
    setBusy(true);
    try {
      if (mode === 'limit') {
        const s = Number(shares);
        const lp = Number(limitPrice);
        if (!Number.isFinite(s) || s <= 0) { setErr('Shares must be a positive whole number.'); setBusy(false); return; }
        if (!Number.isFinite(lp) || lp <= 0) { setErr('Limit price must be a positive number.'); setBusy(false); return; }
        await simApi.createLimit({ ticker: ticker.toUpperCase(), action: 'buy', orderType, shares: s, limitPrice: lp, note: note || undefined });
        setSuccess(`Limit order set: ${orderType === 'stop' ? 'Stop-buy' : 'Limit buy'} ${s} ${ticker.toUpperCase()} @ $${lp.toFixed(2)}. Will execute automatically when triggered.`);
        setShares(''); setLimitPrice(''); setNote('');
        onDone();
        return;
      }

      if (!finalShares || finalShares <= 0) {
        setErr(inputMode === 'dollars' ? 'Enter a dollar amount that covers at least 1 share.' : 'Shares must be a positive whole number.');
        setBusy(false); return;
      }

      if (mode === 'buy') {
        const r = await simApi.buy(ticker.toUpperCase(), finalShares, note || undefined);
        setSuccess(`Bought ${r.shares} shares of ${r.ticker} at $${fmtPrice(r.price)}. Cash remaining: $${fmtPrice(r.cashRemaining)}.`);
      } else if (mode === 'sell') {
        const r = await simApi.sell(ticker.toUpperCase(), finalShares, note || undefined);
        const pnl = r.pnl ?? 0;
        setSuccess(`Sold ${r.shares} ${r.ticker} at $${fmtPrice(r.price)}. P&L: ${pnl >= 0 ? '+' : ''}$${fmtPrice(Math.abs(pnl))} (${r.pnlPct?.toFixed(2)}%).`);
      } else if (mode === 'short') {
        const r = await simApi.short(ticker.toUpperCase(), finalShares, note || undefined);
        setSuccess(`Shorted ${r.shares} ${r.ticker} at $${fmtPrice(r.price)}. Received $${fmtPrice(r.proceeds)}.`);
      } else if (mode === 'cover') {
        const r = await simApi.cover(ticker.toUpperCase(), finalShares, note || undefined);
        const pnl = r.pnl ?? 0;
        setSuccess(`Covered ${r.shares} ${r.ticker} at $${fmtPrice(r.price)}. P&L: ${pnl >= 0 ? '+' : ''}$${fmtPrice(Math.abs(pnl))} (${r.pnlPct?.toFixed(2)}%).`);
      }

      setShares(''); setDollars(''); setNote('');
      onDone();
    } catch (e: any) {
      setErr(e?.response?.data?.error || 'Trade failed.');
    } finally {
      setBusy(false);
    }
  }

  const priceUp = (scan?.changePct ?? 0) >= 0;
  const isMarketMode = mode !== 'limit';

  // Limit order sell form: needs ticker + limitPrice + shares + orderType
  const limitSellMode = mode === 'limit';

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="eyebrow mb-1">Execute a trade</div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="section-title">Buy, sell, or short stock</h3>
          <span className="text-[13px] text-ink-secondary">
            <strong className="text-ink">${fmtPrice(cash)}</strong> available
          </span>
        </div>

        {/* Mode selector */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {(['buy', 'sell', 'short', 'cover', 'limit'] as TradeMode[]).map((m) => {
            const colors: Record<TradeMode, { active: string; text: string }> = {
              buy:   { active: 'var(--forest)', text: 'var(--cream)' },
              sell:  { active: 'var(--brick)',  text: 'var(--cream)' },
              short: { active: '#8B3A3A',       text: 'var(--cream)' },
              cover: { active: 'var(--dusty)',  text: 'var(--cream)' },
              limit: { active: 'var(--amber)',  text: 'var(--cream)' },
            };
            const active = mode === m;
            return (
              <button key={m} type="button" onClick={() => { setMode(m); setErr(null); setSuccess(null); }}
                className="px-4 py-1.5 rounded-full text-[13px] font-semibold transition capitalize"
                style={active ? { background: colors[m].active, color: colors[m].text } : { background: 'var(--cream-tint)', color: 'var(--ink-secondary)' }}>
                {m}
              </button>
            );
          })}
        </div>

        {/* Mode hints */}
        {mode === 'short' && (
          <div className="rounded-xl px-3 py-2 mb-4 text-[12px] text-ink-secondary" style={{ background: 'color-mix(in srgb, var(--brick) 8%, var(--cream-tint))' }}>
            <strong className="text-brick">Short selling</strong> - borrow shares and sell them, hoping to buy back lower. You profit if the stock drops. Requires 100% margin (cash = short exposure). Max: {shortMax != null ? `${shortMax} shares` : 'loading…'}
          </div>
        )}
        {mode === 'cover' && (
          <div className="rounded-xl px-3 py-2 mb-4 text-[12px] text-ink-secondary" style={{ background: 'color-mix(in srgb, var(--dusty) 8%, var(--cream-tint))' }}>
            <strong className="text-dusty">Cover short</strong> - buy back the shares you borrowed to close your short position.
            {shortHolding && <span> You are short <strong>{Math.abs(shortHolding.shares)}</strong> shares.</span>}
          </div>
        )}
        {mode === 'limit' && (
          <div className="rounded-xl px-3 py-2 mb-4 text-[12px] text-ink-secondary" style={{ background: 'color-mix(in srgb, var(--amber) 8%, var(--cream-tint))' }}>
            <strong className="text-amber">Limit / stop orders</strong> - set a price trigger and the trade executes automatically (checked every 5 min).
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          {/* Ticker */}
          <div>
            <div className="eyebrow mb-1.5">Ticker symbol</div>
            <div className="relative">
              <input type="text" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="AAPL" maxLength={10}
                className="w-full px-4 py-3 rounded-2xl bg-cream-tint border border-transparent focus:border-ink-tertiary focus:bg-white transition text-[15px] uppercase tracking-tight1 font-medium pr-10" />
              {scanLoading && <Loader2 size={14} className="animate-spin text-ink-tertiary absolute right-3 top-1/2 -translate-y-1/2" />}
            </div>
          </div>

          {/* Pre-trade briefing */}
          <AnimatePresence>
            {scan?.price != null && (
              <motion.div initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -8, height: 0 }} transition={{ duration: 0.25, ease: EASE }} className="overflow-hidden">
                <div className="rounded-2xl p-4" style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}>
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
                  {scan.rsi != null && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-ink-tertiary">RSI</span>
                        <span className="font-medium tabular-nums" style={{ color: rsiColor(scan.rsi) }}>
                          {scan.rsi.toFixed(1)}<span className="text-ink-tertiary font-normal ml-1">{scan.rsi >= 70 ? '· overbought' : scan.rsi <= 30 ? '· oversold' : '· neutral'}</span>
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--hairline)' }}>
                        <div className="relative h-full rounded-full overflow-hidden">
                          <div className="absolute inset-0 flex">
                            <div style={{ width: '30%', background: 'color-mix(in srgb, #6b7fd7 25%, transparent)' }} />
                            <div style={{ width: '40%', background: 'color-mix(in srgb, var(--forest) 20%, transparent)' }} />
                            <div style={{ width: '30%', background: 'color-mix(in srgb, var(--brick) 25%, transparent)' }} />
                          </div>
                          <div className="absolute top-0 h-full w-0.5 rounded-full" style={{ left: `${scan.rsi}%`, background: rsiColor(scan.rsi), transform: 'translateX(-50%)' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  {scan.macd != null && (
                    <div className="flex items-center gap-1.5 text-[11px] mb-3">
                      <span className="text-ink-tertiary">MACD:</span>
                      <span className={`font-medium ${scan.macd.histogram >= 0 ? 'text-forest' : 'text-brick'}`}>
                        {scan.macd.histogram >= 0 ? 'Bullish' : 'Bearish'} ({scan.macd.histogram.toFixed(2)})
                      </span>
                    </div>
                  )}
                  <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-[12px] leading-relaxed" style={{ background: 'color-mix(in srgb, var(--forest) 7%, var(--cream-tint))' }}>
                    <Sparkles size={12} className="text-amber mt-0.5 flex-shrink-0" weight="duotone" />
                    <span className="text-ink-secondary">{briefingNote(scan)}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Limit order type selector */}
          {mode === 'limit' && (
            <div>
              <div className="eyebrow mb-1.5">Order type</div>
              <div className="flex gap-2 flex-wrap">
                {(['limit', 'stop'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setOrderType(t)}
                    className="flex-1 px-3 py-2.5 rounded-2xl text-[13px] font-medium transition text-center"
                    style={orderType === t ? { background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', boxShadow: 'var(--panel-shadow)' } : { background: 'var(--cream-tint)', color: 'var(--ink-secondary)' }}>
                    {t === 'limit' ? 'Limit buy' : 'Stop-buy (breakout)'}
                    <div className="text-[10px] text-ink-tertiary mt-0.5 font-normal">
                      {t === 'limit' ? 'Buy when price drops to target' : 'Buy when price rises to target'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Shares / dollars */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="eyebrow">{inputMode === 'shares' ? 'Number of shares' : 'Dollar amount'}</div>
              {(mode === 'buy' || mode === 'short') && (
                <button type="button" onClick={() => { setInputMode((m) => m === 'shares' ? 'dollars' : 'shares'); setShares(''); setDollars(''); }}
                  className="text-[11px] text-forest hover:underline">
                  {inputMode === 'shares' ? 'Switch to $ amount' : 'Switch to shares'}
                </button>
              )}
            </div>
            {inputMode === 'shares' ? (
              <input type="number" value={shares} onChange={(e) => setShares(e.target.value)}
                placeholder={mode === 'cover' && shortHolding ? String(Math.abs(shortHolding.shares)) : mode === 'sell' && longHolding ? String(longHolding.shares) : '10'}
                min="1" step="1"
                className="w-full px-4 py-3 rounded-2xl bg-cream-tint border border-transparent focus:border-ink-tertiary focus:bg-white transition text-[15px] tabular-nums" />
            ) : (
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-tertiary font-medium">$</span>
                <input type="number" value={dollars} onChange={(e) => setDollars(e.target.value)}
                  placeholder="1000" min="1"
                  className="w-full pl-8 pr-4 py-3 rounded-2xl bg-cream-tint border border-transparent focus:border-ink-tertiary focus:bg-white transition text-[15px] tabular-nums" />
              </div>
            )}
          </div>

          {/* Limit price (for limit mode) */}
          {mode === 'limit' && (
            <div>
              <div className="eyebrow mb-1.5">
                {orderType === 'limit' ? 'Target buy price (≤ this triggers)' : 'Breakout price (≥ this triggers)'}
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-tertiary font-medium">$</span>
                <input type="number" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)}
                  placeholder={scan?.price ? fmtPrice(scan.price * (orderType === 'limit' ? 0.95 : 1.05)) : '0.00'}
                  min="0.01" step="0.01"
                  className="w-full pl-8 pr-4 py-3 rounded-2xl bg-cream-tint border border-transparent focus:border-ink-tertiary focus:bg-white transition text-[15px] tabular-nums" />
              </div>
            </div>
          )}

          {/* Trade note */}
          <div>
            <div className="eyebrow mb-1.5">Trade thesis <span className="text-ink-tertiary normal-case tracking-normal font-normal">(optional)</span></div>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Why are you making this trade?"
              maxLength={280}
              className="w-full px-4 py-3 rounded-2xl bg-cream-tint border border-transparent focus:border-ink-tertiary focus:bg-white transition text-[14px]" />
          </div>

          {/* Cost preview */}
          {isMarketMode && mode !== 'cover' && (
            <AnimatePresence>
              {costPreview && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2, ease: EASE }} className="overflow-hidden">
                  <div className="rounded-2xl px-4 py-3 text-[13px]"
                    style={{ background: (mode === 'sell' || mode === 'short') ? 'color-mix(in srgb, var(--forest) 8%, var(--cream-tint))' : costPreview.remaining >= 0 ? 'color-mix(in srgb, var(--forest) 8%, var(--cream-tint))' : 'color-mix(in srgb, var(--brick) 8%, var(--cream-tint))' }}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span><strong>{costPreview.shares}</strong> share{costPreview.shares !== 1 ? 's' : ''} · ${fmtPrice(costPreview.total)}</span>
                      {mode === 'buy' && (
                        <span className={costPreview.remaining >= 0 ? 'text-forest' : 'text-brick'}>
                          {costPreview.remaining >= 0 ? `$${fmtPrice(costPreview.remaining)} left` : `$${fmtPrice(Math.abs(costPreview.remaining))} short`}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {err && <div className="flex gap-2 text-brick text-sm"><AlertCircle size={15} className="flex-shrink-0 mt-0.5" weight="fill" /><span>{err}</span></div>}
          {success && (
            <div className="flex gap-2 text-forest text-sm" style={{ background: 'color-mix(in srgb, var(--forest) 10%, transparent)', borderRadius: '1rem', padding: '12px 16px' }}>
              <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5" weight="fill" />
              <span>{success}</span>
            </div>
          )}

          <button type="submit" disabled={busy || (mode === 'buy' && costPreview !== null && costPreview.remaining < 0)}
            className="btn-primary disabled:opacity-50 w-full justify-center"
            style={mode === 'buy' ? { background: 'var(--forest)', color: 'var(--cream)' }
              : mode === 'sell' ? { background: 'var(--brick)', color: 'var(--cream)' }
              : mode === 'short' ? { background: '#8B3A3A', color: 'var(--cream)' }
              : mode === 'cover' ? { background: 'var(--dusty)', color: 'var(--cream)' }
              : { background: 'var(--amber)', color: 'var(--cream)' }}>
            {busy ? <><Loader2 size={14} className="animate-spin" /> Executing…</>
              : mode === 'buy' ? <><Plus size={14} /> Buy {ticker || 'shares'}</>
              : mode === 'sell' ? <><ArrowDown size={14} /> Sell {ticker || 'shares'}</>
              : mode === 'short' ? <>↓ Short {ticker || 'shares'}</>
              : mode === 'cover' ? <><ArrowUp size={14} /> Cover {ticker || 'shares'}</>
              : <><CheckCircle2 size={14} /> Set limit order</>
            }
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-hairline text-[12px] text-ink-tertiary space-y-1">
          <p>• All prices are real-time. Market orders execute at current price.</p>
          <p>• Limit orders are checked every 5 minutes and execute automatically.</p>
          <p>• Short selling requires 100% margin. Whole shares only.</p>
        </div>
      </div>

      {/* Pending limit orders */}
      {limitOrders.length > 0 && (
        <div className="card">
          <div className="eyebrow mb-3">Pending limit orders ({limitOrders.length})</div>
          <div className="space-y-2">
            {limitOrders.map((o) => (
              <div key={o._id} className="flex items-center gap-3 py-2 border-b border-hairline last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-[13px]">{o.ticker}</span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ background: 'color-mix(in srgb, var(--amber) 15%, var(--cream-tint))', color: 'var(--amber)' }}>
                      {o.orderType === 'stop' ? 'Stop-buy' : 'Limit buy'}
                    </span>
                  </div>
                  <div className="text-[12px] text-ink-secondary mt-0.5">
                    {o.shares} shares @ ${fmtPrice(o.limitPrice)}
                    {o.orderType === 'limit' ? ' (triggers when ≤)' : ' (triggers when ≥)'}
                  </div>
                  {o.note && <div className="text-[11px] text-ink-tertiary italic mt-0.5">"{o.note}"</div>}
                </div>
                <button onClick={() => onCancelLimit(o._id)} className="text-ink-tertiary hover:text-brick transition p-1.5 rounded-full">
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
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
        const { label, color, bg } = actionLabel(t.action);
        const pnlUp = (t.pnl ?? 0) >= 0;
        const isOpen = expanded === t._id;
        const hasDebrief = !!(t.aiDebrief || t.note);

        return (
          <motion.div key={t._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE, delay: i * 0.03 }} className="card">
            <button className="w-full flex items-center gap-3 text-left" onClick={() => setExpanded(isOpen ? null : t._id)}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold" style={{ background: bg, color }}>
                {label.slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{t.ticker}</span>
                  <span className="text-[12px] text-ink-tertiary">{t.shares} shares @ ${fmtPrice(t.price)}</span>
                  {t.note && <span className="text-[10px] text-ink-tertiary italic truncate max-w-[120px]">"{t.note}"</span>}
                </div>
                <div className="text-[11px] text-ink-tertiary">
                  {new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {['sell', 'cover'].includes(t.action) && t.pnl != null && (
                <div className={`text-sm font-medium tabular-nums flex items-center gap-1 ${pnlUp ? 'text-forest' : 'text-brick'}`}>
                  {pnlUp ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                  {pnlUp ? '+' : ''}{t.pnlPct?.toFixed(1)}%
                </div>
              )}
              {hasDebrief && (
                <ChevronDown size={14} className="text-ink-tertiary flex-shrink-0 transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
              )}
            </button>

            <AnimatePresence>
              {isOpen && hasDebrief && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: EASE }} className="overflow-hidden">
                  <div className="mt-3 rounded-2xl p-4 text-[13px] leading-relaxed text-ink-secondary space-y-2" style={{ background: 'color-mix(in srgb, var(--forest) 7%, var(--panel-bg))' }}>
                    {t.note && (
                      <div>
                        <div className="eyebrow text-amber mb-1 flex items-center gap-1">
                          <span>Your thesis</span>
                        </div>
                        <p className="italic">"{t.note}"</p>
                      </div>
                    )}
                    {t.aiDebrief && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Sparkles size={11} className="text-amber" weight="duotone" />
                          <span className="eyebrow text-forest">Trade debrief</span>
                        </div>
                        <p>{t.aiDebrief}</p>
                      </div>
                    )}
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

// ─── Coach tab ────────────────────────────────────────────────────────────────

function CoachTab({ portfolio }: { portfolio: SimPortfolio | null }) {
  const [advice, setAdvice] = useState<CoachAdvice | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setErr(null);
    try {
      setAdvice(await simApi.coach());
    } catch {
      setErr('Could not generate coaching - check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="eyebrow mb-1">AI portfolio coach</div>
        <h3 className="section-title mb-2">Personalised feedback</h3>
        <p className="text-sm text-ink-secondary mb-4">
          Your coach reads your holdings, P&L, and trade history to give you specific, educational feedback - what you're doing well and what to work on.
        </p>
        <button onClick={generate} disabled={loading}
          className="btn-forest disabled:opacity-50 w-full justify-center">
          {loading ? <><Loader2 size={14} className="animate-spin" /> Analysing your portfolio…</> : <><Sparkles size={14} /> {advice ? 'Regenerate' : 'Get coaching'}</>}
        </button>
        {err && <p className="text-sm text-brick mt-3">{err}</p>}
      </div>

      <AnimatePresence>
        {advice && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }} className="space-y-3">
            <CoachSection icon="💪" title="Strengths" items={advice.strengths} color="forest" />
            <CoachSection icon="🎯" title="Areas to improve" items={advice.improvements} color="amber" />
            <div className="card">
              <div className="eyebrow mb-2">Portfolio observation</div>
              <p className="text-[14px] text-ink-secondary leading-relaxed">{advice.observation}</p>
            </div>
            <div className="card" style={{ background: 'color-mix(in srgb, var(--forest) 8%, var(--panel-bg))', border: '1px solid color-mix(in srgb, var(--forest) 20%, var(--panel-border))' }}>
              <div className="flex items-start gap-3">
                <div className="text-2xl flex-shrink-0">⚡</div>
                <div>
                  <div className="eyebrow text-forest mb-1">Your action item</div>
                  <p className="text-[14px] text-ink leading-relaxed font-medium">{advice.action}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CoachSection({ icon, title, items, color }: { icon: string; title: string; items: string[]; color: string }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <div className="eyebrow">{title}</div>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] text-ink-secondary leading-relaxed">
            <span className="flex-shrink-0 mt-0.5" style={{ color: `var(--${color})` }}>•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Leaderboard tab ──────────────────────────────────────────────────────────

function LeaderboardTab() {
  const [trades, setTrades] = useState<LeaderboardTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    simApi.leaderboard(20)
      .then(setTrades)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const visible = showAll ? trades : trades.slice(0, 5);

  if (loading) {
    return (
      <div className="card flex items-center gap-3 text-ink-secondary text-sm">
        <Loader2 size={16} className="animate-spin text-forest" /> Loading leaderboard…
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="card text-center py-10">
        <Trophy size={28} className="mx-auto mb-3 text-ink-tertiary" />
        <h3 className="font-serif text-2xl mb-2">No trades yet</h3>
        <p className="text-ink-secondary text-sm">The leaderboard shows the best-returning closed trades across all users. Make your first trade to appear here!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="card">
        <div className="flex items-center gap-2 mb-1">
          <Trophy size={16} className="text-amber" />
          <div className="eyebrow">Best trades leaderboard</div>
        </div>
        <p className="text-[13px] text-ink-secondary">Top closed trades by return % across all users. Only sold positions count.</p>
      </div>

      <div className="space-y-2">
        {visible.map((t, i) => {
          const initials = t.userName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
          return (
            <motion.div
              key={t._id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE, delay: i * 0.04 }}
              className="card flex items-center gap-3"
            >
              <div className="w-7 text-center flex-shrink-0">
                {medal ? (
                  <span className="text-lg">{medal}</span>
                ) : (
                  <span className="text-[12px] font-bold text-ink-tertiary">#{i + 1}</span>
                )}
              </div>

              {t.userAvatarUrl ? (
                <img src={t.userAvatarUrl} alt={t.userName} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ background: 'var(--forest)', color: 'var(--cream)' }}>
                  {initials}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link to={`/dashboard?ticker=${t.ticker}`} className="font-medium hover:text-forest transition">
                    {t.ticker}
                  </Link>
                  <span className="text-[11px] text-ink-tertiary">{t.shares} shares @ ${fmtPrice(t.price)}</span>
                </div>
                <div className="text-[12px] text-ink-tertiary">
                  {t.userName} · {new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="font-serif text-xl tabular-nums text-forest">
                  +{t.pnlPct?.toFixed(1)}%
                </div>
                <div className="text-[11px] text-forest tabular-nums">+${fmtPrice(t.pnl ?? 0)}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {trades.length > 5 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="btn-ghost w-full justify-center text-[13px]"
        >
          {showAll ? 'Show top 5 only' : `Show all ${trades.length} trades`}
          <ChevronDown size={13} className="transition-transform" style={{ transform: showAll ? 'rotate(180deg)' : 'none' }} />
        </button>
      )}
    </div>
  );
}
