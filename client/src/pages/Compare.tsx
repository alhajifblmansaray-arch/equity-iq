import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Crown, GitCompareArrows, Loader2, X } from '../lib/icons';
import { research } from '../lib/api';
import type { NormalizedNews, ResearchReport } from '../types';
import { computeVerdict, fmtCompact, fmtPct, fmtPrice, fmtRelative } from '../lib/helpers';
import SearchBar from '../components/SearchBar';
import CompareRadar from '../components/CompareRadar';

interface Slot {
  ticker: string;
  data: ResearchReport | null;
  loading: boolean;
  error: string | null;
}

const COLORS = ['var(--forest)', 'var(--dusty)'];

export default function ComparePage() {
  const [params, setParams] = useSearchParams();
  const initialA = (params.get('a') || '').toUpperCase();
  const initialB = (params.get('b') || '').toUpperCase();
  const [slots, setSlots] = useState<Slot[]>(
    [initialA, initialB].filter(Boolean).map((t) => ({
      ticker: t,
      data: null,
      loading: false,
      error: null,
    }))
  );

  const loadOne = useCallback(async (ticker: string, idx: number) => {
    setSlots((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, loading: true, error: null } : s))
    );
    try {
      const data = await research.get(ticker);
      setSlots((prev) =>
        prev.map((s, i) => (i === idx ? { ticker, data, loading: false, error: null } : s))
      );
    } catch (err: any) {
      setSlots((prev) =>
        prev.map((s, i) =>
          i === idx
            ? { ticker, data: null, loading: false, error: err?.response?.data?.error || 'Failed.' }
            : s
        )
      );
    }
  }, []);

  // initial loads
  useEffect(() => {
    slots.forEach((s, i) => {
      if (s.ticker && !s.data && !s.loading && !s.error) loadOne(s.ticker, i);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function syncParams(next: Slot[]) {
    const p: Record<string, string> = {};
    if (next[0]?.ticker) p.a = next[0].ticker;
    if (next[1]?.ticker) p.b = next[1].ticker;
    setParams(p);
  }

  function addOrReplace(ticker: string) {
    const upper = ticker.toUpperCase();
    if (slots.find((s) => s.ticker === upper)) return;
    setSlots((prev) => {
      let next: Slot[];
      if (prev.length < 2) {
        next = [...prev, { ticker: upper, data: null, loading: false, error: null }];
      } else {
        // Replace slot B if both filled
        next = [prev[0], { ticker: upper, data: null, loading: false, error: null }];
      }
      syncParams(next);
      // load it
      setTimeout(() => loadOne(upper, next.length - 1), 0);
      return next;
    });
  }

  function removeSlot(idx: number) {
    setSlots((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      syncParams(next);
      return next;
    });
  }

  const a = slots[0];
  const b = slots[1];
  const bothReady = a?.data && b?.data;
  const anyLoading = slots.some((s) => s.loading);

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-10 py-10">
      <header className="mb-7 animate-fadeUp">
        <div className="flex items-center gap-2 mb-2">
          <GitCompareArrows size={14} className="text-dusty" />
          <span className="eyebrow">Compare</span>
        </div>
        <h1 className="font-serif text-4xl md:text-5xl tracking-tight2">Head to head</h1>
        <p className="text-ink-secondary mt-2 text-[15px] max-w-2xl">
          Drop two tickers - see their verdicts duel, watch them race normalized to 100, and find out
          who wins each fundamental.
        </p>
      </header>

      <div className="mb-6 max-w-xl animate-fadeUp animate-delay-1">
        <SearchBar onSearch={addOrReplace} compact />
      </div>

      {slots.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Slot chips */}
          <div className="flex flex-wrap items-center gap-2 mb-6 animate-fadeUp animate-delay-2">
            {slots.map((s, i) => (
              <div
                key={s.ticker + i}
                className="inline-flex items-center gap-2 rounded-full bg-white shadow-card pl-3 pr-1.5 py-1"
              >
                <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                <span className="font-medium text-sm">{s.ticker}</span>
                {s.loading && <Loader2 size={12} className="animate-spin text-ink-tertiary" />}
                <button
                  onClick={() => removeSlot(i)}
                  className="p-1 rounded-full text-ink-tertiary hover:text-ink hover:bg-cream-tint transition"
                  aria-label={`Remove ${s.ticker}`}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {slots.length < 2 && (
              <span className="text-sm text-ink-tertiary ml-1">
                Add one more ticker to see the head-to-head.
              </span>
            )}
          </div>

          {/* Errors */}
          {slots.some((s) => s.error) && (
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              {slots.map(
                (s, i) =>
                  s.error && (
                    <div
                      key={`err-${i}`}
                      className="rounded-2xl px-4 py-3 text-sm text-brick"
                      style={{ background: 'color-mix(in srgb, var(--brick) 10%, transparent)' }}
                    >
                      <strong>{s.ticker}:</strong> {s.error}
                    </div>
                  )
              )}
            </div>
          )}

          {bothReady ? (
            <Compared a={a!.data!} b={b!.data!} />
          ) : anyLoading ? (
            <SkeletonGrid />
          ) : (
            <SingleSlot data={a?.data || b?.data || null} />
          )}
        </>
      )}
    </div>
  );
}

// ----- Sections -----

function Compared({ a, b }: { a: ResearchReport; b: ResearchReport }) {
  const verdictA = useMemo(() => computeVerdict(a), [a]);
  const verdictB = useMemo(() => computeVerdict(b), [b]);
  const winnerVerdict = verdictA.score === verdictB.score ? null : verdictA.score > verdictB.score ? 0 : 1;

  // Build battle rows
  type Row = {
    label: string;
    valA?: number;
    valB?: number;
    fmt: (v: number) => string;
    higherIsBetter: boolean;
    /** Optional 0..1 normalized magnitude for the bars; defaults to scaling within the pair */
    explain?: string;
  };
  const rows: Row[] = [
    {
      label: 'Price',
      valA: a.snapshot?.price,
      valB: b.snapshot?.price,
      fmt: (v) => `$${fmtPrice(v)}`,
      higherIsBetter: false,
      explain: 'Last close - not a quality signal on its own.',
    },
    {
      label: '90d return',
      valA: ret(a, 66),
      valB: ret(b, 66),
      fmt: (v) => fmtPct(v),
      higherIsBetter: true,
    },
    {
      label: '1y return',
      valA: ret(a, 252),
      valB: ret(b, 252),
      fmt: (v) => fmtPct(v),
      higherIsBetter: true,
    },
    {
      label: 'P/E',
      valA: a.valuation?.peRatio,
      valB: b.valuation?.peRatio,
      fmt: (v) => v.toFixed(2) + '×',
      higherIsBetter: false,
    },
    {
      label: 'EV/EBITDA',
      valA: a.valuation?.evToEbitda,
      valB: b.valuation?.evToEbitda,
      fmt: (v) => v.toFixed(2) + '×',
      higherIsBetter: false,
    },
    {
      label: 'PEG',
      valA: a.valuation?.pegRatio,
      valB: b.valuation?.pegRatio,
      fmt: (v) => v.toFixed(2),
      higherIsBetter: false,
    },
    {
      label: 'Profit margin',
      valA: a.valuation?.profitMargin != null ? a.valuation.profitMargin * 100 : undefined,
      valB: b.valuation?.profitMargin != null ? b.valuation.profitMargin * 100 : undefined,
      fmt: (v) => fmtPct(v),
      higherIsBetter: true,
    },
    {
      label: 'Return on equity',
      valA: a.valuation?.returnOnEquity != null ? a.valuation.returnOnEquity * 100 : undefined,
      valB: b.valuation?.returnOnEquity != null ? b.valuation.returnOnEquity * 100 : undefined,
      fmt: (v) => fmtPct(v),
      higherIsBetter: true,
    },
    {
      label: 'Dividend yield',
      valA: a.valuation?.dividendYield != null ? a.valuation.dividendYield * 100 : undefined,
      valB: b.valuation?.dividendYield != null ? b.valuation.dividendYield * 100 : undefined,
      fmt: (v) => fmtPct(v),
      higherIsBetter: true,
    },
    {
      label: 'Beta',
      valA: a.valuation?.beta,
      valB: b.valuation?.beta,
      fmt: (v) => v.toFixed(2),
      higherIsBetter: false,
      explain: 'Closer to 1 means it moves with the market. >1 is more volatile.',
    },
    {
      label: 'RSI (14)',
      valA: a.technicals.rsi,
      valB: b.technicals.rsi,
      fmt: (v) => v.toFixed(1),
      higherIsBetter: false,
      explain: 'Higher = more overbought. Tied on this row when both 30–70.',
    },
    {
      label: 'Volatility',
      valA: a.technicals.volatility != null ? a.technicals.volatility * 100 : undefined,
      valB: b.technicals.volatility != null ? b.technicals.volatility * 100 : undefined,
      fmt: (v) => v.toFixed(1) + '%',
      higherIsBetter: false,
    },
    {
      label: 'Market cap',
      valA: a.profile?.marketCap,
      valB: b.profile?.marketCap,
      fmt: (v) => fmtCompact(v * 1_000_000),
      higherIsBetter: true,
    },
  ];

  let winsA = 0;
  let winsB = 0;
  rows.forEach((r) => {
    if (r.valA == null || r.valB == null) return;
    if (Math.abs(r.valA - r.valB) < 0.0001) return;
    const aWins = r.higherIsBetter ? r.valA > r.valB : r.valA < r.valB;
    if (aWins) winsA++;
    else winsB++;
  });
  const ties = rows.filter((r) => r.valA != null && r.valB != null).length - winsA - winsB;
  const winnerWins = winsA === winsB ? null : winsA > winsB ? 0 : 1;

  // Chart data
  const chartData = useMemo(() => {
    const ha = a.priceHistory || [];
    const hb = b.priceHistory || [];
    if (!ha.length || !hb.length) return [];
    const minLen = Math.min(ha.length, hb.length, 252);
    const sa = ha.slice(-minLen);
    const sb = hb.slice(-minLen);
    const baseA = sa[0].close;
    const baseB = sb[0].close;
    const rows: any[] = [];
    for (let i = 0; i < minLen; i++) {
      rows.push({
        date: sa[i].date,
        a: (sa[i].close / baseA) * 100,
        b: (sb[i].close / baseB) * 100,
      });
    }
    return rows;
  }, [a, b]);

  // Radar axes - 5 dimensions on 0..1 scales
  const axes = useMemo(() => buildRadarAxes(a, b), [a, b]);

  return (
    <>
      {/* Verdict duel */}
      <div className="card mb-4 animate-fadeUp animate-delay-3">
        <div className="grid sm:grid-cols-3 gap-6 items-center">
          <VerdictTile data={a} verdict={verdictA} color={COLORS[0]} winner={winnerVerdict === 0} />
          <div className="text-center">
            <div className="eyebrow mb-2">Verdict duel</div>
            {winnerVerdict != null ? (
              <div>
                <div className="font-serif text-4xl md:text-5xl tracking-tight2">
                  {winnerVerdict === 0 ? a.ticker : b.ticker}
                </div>
                <div className="text-ink-secondary text-sm mt-1">
                  leads by {Math.abs(verdictA.score - verdictB.score)} pts
                </div>
              </div>
            ) : (
              <div>
                <div className="font-serif text-4xl tracking-tight2">Tied</div>
                <div className="text-ink-secondary text-sm mt-1">scores match</div>
              </div>
            )}
          </div>
          <VerdictTile data={b} verdict={verdictB} color={COLORS[1]} winner={winnerVerdict === 1} />
        </div>
      </div>

      {/* Win counter banner */}
      <div className="card mb-4 animate-fadeUp animate-delay-4">
        <div className="eyebrow mb-3">Score across categories</div>
        <div className="flex items-center gap-4 mb-3">
          <span className="font-medium tabular-nums" style={{ color: COLORS[0] }}>
            {a.ticker} {winsA}
          </span>
          <div className="flex-1 h-3 rounded-full overflow-hidden flex" style={{ background: 'var(--cream-tint)' }}>
            <div
              className="transition-all"
              style={{
                background: COLORS[0],
                width: `${winsA + winsB > 0 ? (winsA / (winsA + winsB)) * 100 : 50}%`,
              }}
            />
            <div
              className="transition-all"
              style={{
                background: COLORS[1],
                width: `${winsA + winsB > 0 ? (winsB / (winsA + winsB)) * 100 : 50}%`,
              }}
            />
          </div>
          <span className="font-medium tabular-nums" style={{ color: COLORS[1] }}>
            {winsB} {b.ticker}
          </span>
        </div>
        <p className="text-xs text-ink-tertiary">
          {winnerWins != null ? (
            <>
              <strong className="text-ink">{winnerWins === 0 ? a.ticker : b.ticker}</strong> leads{' '}
              {Math.max(winsA, winsB)} of {winsA + winsB} measured categories
              {ties > 0 && ` (${ties} tied or missing)`}.
            </>
          ) : (
            <>It's a wash: {winsA}–{winsB}. Differences are noise on these metrics.</>
          )}
        </p>
      </div>

      {/* Normalized chart */}
      {chartData.length > 0 && (
        <div className="card mb-4 animate-fadeUp animate-delay-5">
          <div className="eyebrow mb-1">Performance</div>
          <h3 className="section-title mb-4">{chartData.length}-day race · normalized to 100</h3>
          <div className="h-80 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS[0]} stopOpacity={0.16} />
                    <stop offset="100%" stopColor={COLORS[0]} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="bGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS[1]} stopOpacity={0.16} />
                    <stop offset="100%" stopColor={COLORS[1]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: 'var(--ink-tertiary)' }}
                  tickFormatter={(d) =>
                    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  }
                  minTickGap={40}
                  interval="preserveStartEnd"
                />
                <YAxis
                  orientation="right"
                  tick={{ fontSize: 11, fill: 'var(--ink-tertiary)' }}
                  tickFormatter={(v) => Math.round(v).toString()}
                  domain={['dataMin - 2', 'dataMax + 2']}
                  width={50}
                />
                <Tooltip
                  cursor={{ stroke: 'var(--ink-tertiary)', strokeDasharray: '2 4' }}
                  contentStyle={{
                    background: 'var(--surface)',
                    border: 'none',
                    borderRadius: 14,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                    fontSize: 12,
                    color: 'var(--ink)',
                  }}
                  formatter={(v: any, _name: any, item: any) => [
                    Number(v).toFixed(1),
                    item.dataKey === 'a' ? a.ticker : b.ticker,
                  ]}
                  labelFormatter={(d) =>
                    new Date(String(d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  }
                />
                <Area type="monotone" dataKey="a" stroke={COLORS[0]} fill="url(#aGrad)" />
                <Area type="monotone" dataKey="b" stroke={COLORS[1]} fill="url(#bGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Radar */}
      <div className="card mb-4 animate-fadeUp animate-delay-6">
        <div className="grid md:grid-cols-[1fr_1fr] gap-6 items-center">
          <div>
            <div className="eyebrow mb-1">Profile shape</div>
            <h3 className="section-title mb-3">Strengths at a glance</h3>
            <p className="text-ink-secondary text-[14px] leading-relaxed">
              Each axis is normalized 0–1. Bigger area means the company scores better on more dimensions.
            </p>
            <ul className="mt-4 space-y-2 text-[13px]">
              {axes.map((ax) => {
                const aV = ax.values[0];
                const bV = ax.values[1];
                const winsThisA = aV > bV;
                const winsThisB = bV > aV;
                return (
                  <li key={ax.label} className="flex items-center justify-between gap-3">
                    <span className="text-ink-secondary">{ax.label}</span>
                    <span className="flex items-center gap-2 text-[12px]">
                      <span style={{ color: winsThisA ? COLORS[0] : 'var(--ink-tertiary)' }}>
                        {(aV * 100).toFixed(0)}
                      </span>
                      <span className="text-ink-tertiary">vs</span>
                      <span style={{ color: winsThisB ? COLORS[1] : 'var(--ink-tertiary)' }}>
                        {(bV * 100).toFixed(0)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          <CompareRadar
            axes={axes}
            labels={[a.ticker, b.ticker]}
            colors={[COLORS[0], COLORS[1]]}
            size={300}
          />
        </div>
      </div>

      {/* Battle bars */}
      <div className="card mb-4 animate-fadeUp animate-delay-7">
        <div className="eyebrow mb-1">Battle</div>
        <h3 className="section-title mb-5">Category by category</h3>
        <div className="space-y-3">
          {rows.map((r) => (
            <BattleRow
              key={r.label}
              row={r}
              tickerA={a.ticker}
              tickerB={b.ticker}
            />
          ))}
        </div>
        <p className="text-[11px] text-ink-tertiary mt-5">
          Bars show how close the two are - fully extended means one side is 2× or more of the other.
        </p>
      </div>

      {/* News head-to-head */}
      <div className="grid md:grid-cols-2 gap-4 animate-fadeUp animate-delay-8">
        <NewsColumn data={a} color={COLORS[0]} />
        <NewsColumn data={b} color={COLORS[1]} />
      </div>
    </>
  );
}

// ----- Sub components -----

function VerdictTile({
  data,
  verdict,
  color,
  winner,
}: {
  data: ResearchReport;
  verdict: ReturnType<typeof computeVerdict>;
  color: string;
  winner: boolean;
}) {
  const R = 52;
  const C = 2 * Math.PI * R;
  const offset = C - (verdict.score / 100) * C;
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={R} stroke="var(--hairline)" strokeWidth="8" fill="none" />
          <circle
            cx="60"
            cy="60"
            r={R}
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={offset}
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-serif text-4xl tracking-tight2 leading-none">{verdict.score}</div>
          <div className="text-[10px] text-ink-tertiary mt-0.5">/ 100</div>
        </div>
        {winner && (
          <div
            className="absolute -top-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium shadow-card"
            style={{ background: color, color: 'var(--cream)' }}
          >
            <Crown size={10} />
            Lead
          </div>
        )}
      </div>
      <div className="mt-3">
        <div className="font-serif text-2xl tracking-tight1">{data.ticker}</div>
        <span className={`pill ${verdict.pillClass} mt-1.5 text-[10px]`}>{verdict.verdict}</span>
      </div>
    </div>
  );
}

function BattleRow({
  row,
  tickerA,
  tickerB,
}: {
  row: {
    label: string;
    valA?: number;
    valB?: number;
    fmt: (v: number) => string;
    higherIsBetter: boolean;
    explain?: string;
  };
  tickerA: string;
  tickerB: string;
}) {
  const both = row.valA != null && row.valB != null;
  let winner: 0 | 1 | null = null;
  if (both) {
    if (Math.abs(row.valA! - row.valB!) < 0.0001) winner = null;
    else if (row.higherIsBetter) winner = row.valA! > row.valB! ? 0 : 1;
    else winner = row.valA! < row.valB! ? 0 : 1;
  }

  // Normalize magnitudes so both bars fit within 0..1 of half-width
  const maxAbs = Math.max(Math.abs(row.valA ?? 0), Math.abs(row.valB ?? 0)) || 1;
  const fillA = row.valA != null ? Math.min(1, Math.abs(row.valA) / maxAbs) : 0;
  const fillB = row.valB != null ? Math.min(1, Math.abs(row.valB) / maxAbs) : 0;

  const colorA = winner === 0 ? 'var(--forest)' : 'var(--ink-tertiary)';
  const colorB = winner === 1 ? 'var(--dusty)' : 'var(--ink-tertiary)';

  return (
    <div title={row.explain || undefined}>
      <div className="flex items-baseline justify-between mb-1.5 px-1">
        <span
          className="text-[13px] tabular-nums font-medium"
          style={{ color: colorA }}
        >
          {row.valA != null ? row.fmt(row.valA) : '-'}
        </span>
        <span className="text-[11px] uppercase tracking-eyebrow text-ink-tertiary">{row.label}</span>
        <span
          className="text-[13px] tabular-nums font-medium"
          style={{ color: colorB }}
        >
          {row.valB != null ? row.fmt(row.valB) : '-'}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {/* Left half (A) - fills right-to-left */}
        <div className="flex-1 h-2 rounded-full overflow-hidden relative" style={{ background: 'var(--cream-tint)' }}>
          <div
            className="absolute right-0 top-0 h-full rounded-full transition-all"
            style={{
              width: `${fillA * 100}%`,
              background: winner === 0 ? 'var(--forest)' : 'color-mix(in srgb, var(--ink-tertiary) 60%, transparent)',
            }}
          />
        </div>
        <span className="w-1 h-3 rounded-full" style={{ background: 'var(--hairline)' }} />
        {/* Right half (B) - fills left-to-right */}
        <div className="flex-1 h-2 rounded-full overflow-hidden relative" style={{ background: 'var(--cream-tint)' }}>
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all"
            style={{
              width: `${fillB * 100}%`,
              background: winner === 1 ? 'var(--dusty)' : 'color-mix(in srgb, var(--ink-tertiary) 60%, transparent)',
            }}
          />
        </div>
      </div>
      <div className="flex justify-between px-1 mt-1">
        <span className="text-[9px] uppercase tracking-eyebrow text-ink-tertiary">{tickerA}</span>
        <span className="text-[9px] uppercase tracking-eyebrow text-ink-tertiary">{tickerB}</span>
      </div>
    </div>
  );
}

function NewsColumn({ data, color }: { data: ResearchReport; color: string }) {
  const news: NormalizedNews[] = data.news.slice(0, 4);
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="eyebrow">{data.ticker} news</span>
      </div>
      {news.length === 0 ? (
        <p className="text-ink-secondary text-sm italic">No recent headlines.</p>
      ) : (
        <ul className="space-y-3">
          {news.map((n) => (
            <li key={n.id}>
              <a
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <div className="text-[11px] text-ink-tertiary mb-0.5">
                  {n.publisher} · {fmtRelative(n.publishedAt)}
                </div>
                <div className="text-[14px] font-medium leading-snug group-hover:text-forest transition">
                  {n.title}
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SingleSlot({ data }: { data: ResearchReport | null }) {
  if (!data) return null;
  return (
    <div className="card text-center animate-fadeUp">
      <h3 className="font-serif text-2xl tracking-tight1 mb-2">{data.ticker} loaded</h3>
      <p className="text-ink-secondary text-sm">Search another ticker above to start the comparison.</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card text-center animate-fadeUp animate-delay-1">
      <GitCompareArrows size={28} className="mx-auto mb-3 text-ink-tertiary" />
      <h3 className="font-serif text-2xl tracking-tight1 mb-2">Pick two tickers</h3>
      <p className="text-ink-secondary text-sm">
        Search above - add the first one, then the second. Then watch them go.
      </p>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="space-y-3">
      <div className="card">
        <div className="skel h-6 w-1/3 mb-4" />
        <div className="skel h-32 w-full" />
      </div>
      <div className="card">
        <div className="skel h-6 w-1/3 mb-4" />
        <div className="skel h-64 w-full" />
      </div>
    </div>
  );
}

// ----- Helpers -----

function ret(r: ResearchReport, bars: number): number | undefined {
  const h = r.priceHistory;
  if (!h || h.length < 2) return undefined;
  const slice = h.slice(-bars);
  if (slice.length < 2) return undefined;
  return ((slice[slice.length - 1].close - slice[0].close) / slice[0].close) * 100;
}

// 5 axes on 0..1 scale. Higher = "better" in each row.
function buildRadarAxes(a: ResearchReport, b: ResearchReport) {
  function norm(label: string, valA: number | undefined, valB: number | undefined, higherIsBetter: boolean) {
    const max = Math.max(Math.abs(valA ?? 0), Math.abs(valB ?? 0)) || 1;
    const toScore = (v: number | undefined) => {
      if (v == null) return 0.1;
      const ratio = Math.min(1, Math.abs(v) / max);
      return higherIsBetter ? ratio : 1 - ratio;
    };
    return { label, values: [toScore(valA), toScore(valB)] };
  }

  return [
    norm('Momentum', ret(a, 66), ret(b, 66), true),
    norm('Value', a.valuation?.peRatio, b.valuation?.peRatio, false),
    norm('Quality', a.valuation?.profitMargin ?? 0, b.valuation?.profitMargin ?? 0, true),
    norm(
      'Stability',
      a.technicals.volatility != null ? a.technicals.volatility * 100 : undefined,
      b.technicals.volatility != null ? b.technicals.volatility * 100 : undefined,
      false
    ),
    norm('Size', a.profile?.marketCap, b.profile?.marketCap, true),
  ];
}
