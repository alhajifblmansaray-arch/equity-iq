import { useMemo, useState } from 'react';
import { Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import type { ResearchReport } from '../types';
import { fmtPct, fmtPrice } from '../lib/helpers';

interface Props {
  data: ResearchReport;
}

const YEAR_OPTIONS = [1, 3, 5];

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

  return (
    <div className="card animate-fadeUp animate-delay-5">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={13} className="text-amber" />
        <span className="eyebrow">What if</span>
      </div>
      <h3 className="section-title mb-5">A hypothetical</h3>

      <div className="grid sm:grid-cols-2 gap-5">
        {/* Inputs */}
        <div className="space-y-4">
          <div>
            <div className="eyebrow mb-2">Amount</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-ink-tertiary text-2xl font-serif">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 0))}
                min="1"
                step="100"
                className="font-serif text-4xl md:text-5xl tracking-tight2 bg-transparent w-full focus:outline-none"
              />
            </div>
          </div>
          <div>
            <div className="eyebrow mb-2">Years ago</div>
            <div className="inline-flex items-center bg-cream-tint rounded-full p-1">
              {YEAR_OPTIONS.map((y) => (
                <button
                  key={y}
                  onClick={() => setYears(y)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
                    years === y ? 'bg-white text-ink shadow-pill' : 'text-ink-secondary'
                  }`}
                >
                  {y}Y
                </button>
              ))}
            </div>
            <p className="text-xs text-ink-tertiary mt-2">
              {result
                ? `Window: ${result.actualYears.toFixed(1)} years (${result.first.date} → ${result.last.date})`
                : 'Not enough history.'}
            </p>
          </div>
        </div>

        {/* Outputs */}
        <div className="rounded-3xl p-5" style={{ background: 'var(--cream-tint)' }}>
          {result ? (
            <>
              <div className="eyebrow mb-2">Today it'd be worth</div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-ink-tertiary text-2xl font-serif">$</span>
                <span className="font-serif text-4xl md:text-5xl tracking-tight2">
                  {fmtPrice(result.finalValue)}
                </span>
              </div>
              <div className={`mt-2 flex items-center gap-2 text-sm font-medium ${up ? 'text-forest' : 'text-brick'}`}>
                {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                <span>{up ? '+' : ''}${fmtPrice(result.gain)}</span>
                <span>({fmtPct(result.totalPct)})</span>
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
