import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, GitCompareArrows, X } from 'lucide-react';
import { research } from '../lib/api';
import type { ResearchReport } from '../types';
import { computeVerdict, fmtCompact, fmtPct, fmtPrice } from '../lib/helpers';
import SearchBar from '../components/SearchBar';

interface Slot {
  ticker: string;
  data: ResearchReport | null;
  loading: boolean;
  error: string | null;
}

const COLORS = ['var(--forest)', 'var(--dusty)', 'var(--amber)'];

export default function ComparePage() {
  const [params, setParams] = useSearchParams();
  const initialA = (params.get('a') || '').toUpperCase();
  const initialB = (params.get('b') || '').toUpperCase();
  const initialC = (params.get('c') || '').toUpperCase();
  const [slots, setSlots] = useState<Slot[]>(
    [initialA, initialB, initialC]
      .filter(Boolean)
      .map((t) => ({ ticker: t, data: null, loading: false, error: null }))
  );

  const loadOne = useCallback(async (ticker: string, idx: number) => {
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, loading: true, error: null } : s)));
    try {
      const data = await research.get(ticker);
      setSlots((prev) =>
        prev.map((s, i) => (i === idx ? { ticker, data, loading: false, error: null } : s))
      );
    } catch (err: any) {
      setSlots((prev) =>
        prev.map((s, i) =>
          i === idx
            ? { ticker, data: null, loading: false, error: err?.response?.data?.error || 'Failed to load.' }
            : s
        )
      );
    }
  }, []);

  // Initial load
  useEffect(() => {
    slots.forEach((s, i) => {
      if (s.ticker && !s.data && !s.loading && !s.error) loadOne(s.ticker, i);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setParam() {
    const next: Record<string, string> = {};
    if (slots[0]?.ticker) next.a = slots[0].ticker;
    if (slots[1]?.ticker) next.b = slots[1].ticker;
    if (slots[2]?.ticker) next.c = slots[2].ticker;
    setParams(next);
  }

  function addSlot(ticker: string) {
    const upper = ticker.toUpperCase();
    if (slots.find((s) => s.ticker === upper)) return;
    if (slots.length >= 3) return;
    const idx = slots.length;
    setSlots((prev) => [...prev, { ticker: upper, data: null, loading: false, error: null }]);
    setTimeout(() => loadOne(upper, idx), 0);
    setTimeout(setParam, 50);
  }

  function removeSlot(idx: number) {
    setSlots((prev) => prev.filter((_, i) => i !== idx));
    setTimeout(setParam, 50);
  }

  // Build the normalized overlay chart
  const chartData = useMemo(() => {
    const series = slots
      .map((s) => s.data?.priceHistory || [])
      .filter((h) => h && h.length);
    if (series.length < 1) return [];
    const minLen = Math.min(...series.map((s) => s.length));
    const trim = series.map((s) => s.slice(-minLen));
    const bases = trim.map((s) => s[0].close);
    const rows: any[] = [];
    for (let i = 0; i < minLen; i++) {
      const row: any = { date: trim[0][i].date };
      trim.forEach((s, idx) => {
        row[`series${idx}`] = (s[i].close / bases[idx]) * 100;
      });
      rows.push(row);
    }
    return rows;
  }, [slots]);

  const activeSlots = slots.filter((s) => s.data);

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-10 py-10">
      <header className="mb-8 animate-fadeUp">
        <div className="flex items-center gap-2 mb-2">
          <GitCompareArrows size={14} className="text-dusty" />
          <span className="eyebrow">Compare</span>
        </div>
        <h1 className="font-serif text-4xl md:text-5xl tracking-tight2">Two side by side</h1>
        <p className="text-ink-secondary mt-2 text-[15px]">
          Charts normalized to 100 at the start of the window. Add up to three tickers.
        </p>
      </header>

      <div className="mb-6 max-w-xl animate-fadeUp animate-delay-1">
        <SearchBar onSearch={addSlot} compact />
      </div>

      {slots.length === 0 ? (
        <div className="card text-center animate-fadeUp animate-delay-2">
          <GitCompareArrows size={28} className="mx-auto mb-3 text-ink-tertiary" />
          <h3 className="font-serif text-2xl tracking-tight1 mb-2">Add a ticker to compare</h3>
          <p className="text-ink-secondary text-sm">Search above. Then add another. Then watch them race.</p>
        </div>
      ) : (
        <>
          {/* Tickers row */}
          <div className="flex flex-wrap items-center gap-2 mb-6 animate-fadeUp animate-delay-2">
            {slots.map((s, i) => (
              <div
                key={s.ticker + i}
                className="inline-flex items-center gap-2 rounded-full bg-white shadow-card pl-3 pr-1.5 py-1"
              >
                <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="font-medium text-sm">{s.ticker}</span>
                {s.loading && <span className="text-xs text-ink-tertiary">…</span>}
                <button
                  onClick={() => removeSlot(i)}
                  className="p-1 rounded-full text-ink-tertiary hover:text-ink hover:bg-cream-tint transition"
                  aria-label={`Remove ${s.ticker}`}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="card mb-4 animate-fadeUp animate-delay-3">
              <div className="eyebrow mb-1">Normalized return</div>
              <h3 className="section-title mb-4">Performance</h3>
              <div className="h-80 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: 'var(--ink-tertiary)' }}
                      tickFormatter={(d) =>
                        new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      }
                      minTickGap={50}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      orientation="right"
                      tick={{ fontSize: 11, fill: 'var(--ink-tertiary)' }}
                      tickFormatter={(v) => `${Math.round(v)}`}
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
                      labelFormatter={(d) =>
                        new Date(String(d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      }
                      formatter={(v: any, _name: any, item: any) => {
                        const idx = Number(String(item.dataKey).replace('series', ''));
                        return [`${Number(v).toFixed(1)}`, activeSlots[idx]?.ticker || 'Series'];
                      }}
                    />
                    {activeSlots.map((_, i) => (
                      <Line
                        key={i}
                        type="monotone"
                        dataKey={`series${i}`}
                        stroke={COLORS[i % COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Metric comparison */}
          {activeSlots.length >= 2 && <CompareTable slots={activeSlots} />}
        </>
      )}
    </div>
  );
}

function CompareTable({ slots }: { slots: Slot[] }) {
  type Row = {
    label: string;
    values: (number | undefined)[];
    fmt: (v: number) => string;
    higherIsBetter: boolean;
  };
  const rows: Row[] = [
    {
      label: 'Price',
      values: slots.map((s) => s.data?.snapshot?.price),
      fmt: (v) => `$${fmtPrice(v)}`,
      higherIsBetter: false,
    },
    {
      label: '90d return',
      values: slots.map((s) => {
        const h = s.data?.priceHistory;
        if (!h || h.length < 2) return undefined;
        const slice = h.slice(-66);
        return ((slice[slice.length - 1].close - slice[0].close) / slice[0].close) * 100;
      }),
      fmt: (v) => fmtPct(v),
      higherIsBetter: true,
    },
    {
      label: 'P/E',
      values: slots.map((s) => s.data?.valuation?.peRatio),
      fmt: (v) => v.toFixed(2) + '×',
      higherIsBetter: false,
    },
    {
      label: 'Forward P/E',
      values: slots.map((s) => s.data?.valuation?.forwardPE),
      fmt: (v) => v.toFixed(2) + '×',
      higherIsBetter: false,
    },
    {
      label: 'EV/EBITDA',
      values: slots.map((s) => s.data?.valuation?.evToEbitda),
      fmt: (v) => v.toFixed(2) + '×',
      higherIsBetter: false,
    },
    {
      label: 'EPS',
      values: slots.map((s) => s.data?.valuation?.eps),
      fmt: (v) => '$' + v.toFixed(2),
      higherIsBetter: true,
    },
    {
      label: 'Profit margin',
      values: slots.map((s) =>
        s.data?.valuation?.profitMargin != null ? s.data.valuation.profitMargin * 100 : undefined
      ),
      fmt: (v) => fmtPct(v),
      higherIsBetter: true,
    },
    {
      label: 'RSI (14)',
      values: slots.map((s) => s.data?.technicals.rsi),
      fmt: (v) => v.toFixed(1),
      higherIsBetter: false,
    },
    {
      label: 'Market cap',
      values: slots.map((s) => s.data?.profile?.marketCap),
      fmt: (v) => fmtCompact(v * 1_000_000),
      higherIsBetter: true,
    },
    {
      label: 'EquityIQ score',
      values: slots.map((s) => (s.data ? computeVerdict(s.data).score : undefined)),
      fmt: (v) => `${v}/100`,
      higherIsBetter: true,
    },
  ];

  return (
    <div className="card animate-fadeUp animate-delay-4">
      <div className="eyebrow mb-1">Metrics</div>
      <h3 className="section-title mb-5">Head to head</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left text-[12px] uppercase tracking-eyebrow text-ink-tertiary font-medium pb-3"></th>
              {slots.map((s, i) => (
                <th key={s.ticker + i} className="text-right pb-3">
                  <div className="flex items-center justify-end gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="font-serif tracking-tight1 text-[15px]">{s.ticker}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const defined = r.values.map((v, i) => ({ v, i })).filter((x) => x.v != null);
              let winnerIdx: number | undefined;
              if (defined.length >= 2) {
                const sorted = [...defined].sort((a, b) =>
                  r.higherIsBetter ? (b.v as number) - (a.v as number) : (a.v as number) - (b.v as number)
                );
                winnerIdx = sorted[0].i;
              }
              return (
                <tr key={r.label} className="border-t border-hairline">
                  <td className="py-3 text-[13px] text-ink-secondary">{r.label}</td>
                  {r.values.map((v, i) => (
                    <td
                      key={i}
                      className={`py-3 text-right text-[14px] tabular-nums ${
                        winnerIdx === i ? 'font-semibold text-forest' : 'text-ink'
                      }`}
                    >
                      {v == null ? <span className="text-ink-tertiary">—</span> : r.fmt(v)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-ink-tertiary mt-4">Bold green = best on that row.</p>
    </div>
  );
}
