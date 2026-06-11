import { useMemo, useState } from 'react';
import { Minus, Plus, Sparkles, TrendingDown, TrendingUp } from '../lib/icons';
import type { ResearchReport } from '../types';
import { fmtPct, fmtPrice } from '../lib/helpers';

interface Props {
  data: ResearchReport;
}

const YEAR_OPTIONS = [1, 3, 5];
const AMOUNT_PRESETS = [100, 500, 1000, 5000, 10000];

export default function WhatIfCard({ data }: Props) {
  const bars = data.priceHistory || [];
  const [amount, setAmount] = useState(1000);
  const [years, setYears] = useState(1);

  const result = useMemo(() => {
    if (!bars.length) return null;
    const targetBars = years * 252;
    if (bars.length < 5) return null;
    const slice = bars.slice(-targetBars);
    const first = slice[0];
    const last = slice[slice.length - 1];
    const shares = amount / first.close;
    const finalValue = shares * last.close;
    const gain = finalValue - amount;
    const totalPct = (gain / amount) * 100;
    const actualYears = (slice.length - 1) / 252;
    const cagr = actualYears > 0 ? (Math.pow(finalValue / amount, 1 / actualYears) - 1) * 100 : 0;
    return { first, last, shares, finalValue, gain, totalPct, cagr, actualYears };
  }, [bars, amount, years]);

  if (!bars.length) return null;
  const up = (result?.gain ?? 0) >= 0;

  const bump = (delta: number) => setAmount((a) => Math.max(10, a + delta));

  return (
    <div className="card animate-fadeUp animate-delay-5">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={13} className="text-amber" />
        <span className="eyebrow">What if</span>
      </div>
      <h3 className="section-title mb-6">A hypothetical</h3>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="space-y-5">
          <div>
            <div className="eyebrow mb-3">I had invested</div>
            <div
              className="flex items-stretch rounded-2xl overflow-hidden"
              style={{ background: 'var(--cream-tint)' }}
            >
              <button
                type="button"
                onClick={() => bump(-100)}
                className="px-3 hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] text-ink-secondary hover:text-ink transition flex items-center justify-center"
                aria-label="Decrease"
              >
                <Minus size={16} />
              </button>
              <div className="flex-1 flex items-baseline justify-center py-3 px-2 gap-1">
                <span className="text-ink-tertiary text-xl font-serif">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 0))}
                  min="1"
                  step="100"
                  className="font-serif text-3xl md:text-4xl tracking-tight2 bg-transparent w-full text-center focus:outline-none tabular-nums"
                  style={{ color: 'var(--ink)' }}
                />
              </div>
              <button
                type="button"
                onClick={() => bump(100)}
                className="px-3 hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] text-ink-secondary hover:text-ink transition flex items-center justify-center"
                aria-label="Increase"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {AMOUNT_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(p)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${
                    amount === p
                      ? 'border-ink bg-ink text-cream'
                      : 'border-hairline bg-transparent text-ink-secondary hover:bg-cream-tint hover:text-ink'
                  }`}
                >
                  ${p.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="eyebrow mb-3">…this many years ago</div>
            <div className="inline-flex items-center bg-cream-tint rounded-full p-1">
              {YEAR_OPTIONS.map((y) => (
                <button
                  key={y}
                  onClick={() => setYears(y)}
                  className={`text-xs font-medium px-3.5 py-1.5 rounded-full transition ${
                    years === y ? 'bg-white text-ink shadow-pill' : 'text-ink-secondary'
                  }`}
                >
                  {y}Y
                </button>
              ))}
            </div>
            <p className="text-xs text-ink-tertiary mt-2.5">
              {result
                ? `Window: ${result.actualYears.toFixed(1)} years (${result.first.date} → ${result.last.date})`
                : 'Not enough history for this window.'}
            </p>
          </div>
        </div>

        {/* Outputs */}
        <div className="rounded-3xl p-5 md:p-6" style={{ background: 'var(--cream-tint)' }}>
          {result ? (
            <>
              <div className="eyebrow mb-2">Today it'd be worth</div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-ink-tertiary text-2xl font-serif">$</span>
                <span className="font-serif text-4xl md:text-5xl tracking-tight2 tabular-nums">
                  {fmtPrice(result.finalValue)}
                </span>
              </div>
              <div className={`mt-2 flex items-center gap-2 text-sm font-medium ${up ? 'text-forest' : 'text-brick'}`}>
                {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                <span className="tabular-nums">
                  {up ? '+' : ''}${fmtPrice(result.gain)}
                </span>
                <span className="tabular-nums">({fmtPct(result.totalPct)})</span>
              </div>
              <div className="hairline-divider my-4" />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="eyebrow mb-1">CAGR</div>
                  <div className="font-medium tabular-nums">{fmtPct(result.cagr)}</div>
                </div>
                <div>
                  <div className="eyebrow mb-1">Shares</div>
                  <div className="font-medium tabular-nums">{result.shares.toFixed(2)}</div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-ink-secondary italic text-sm">Not enough price history for this window.</p>
          )}
        </div>
      </div>

      <p className="text-[11px] text-ink-tertiary mt-5">
        Backtest only. Doesn't include dividends, taxes, or fees. Past returns aren't promises.
      </p>
    </div>
  );
}
