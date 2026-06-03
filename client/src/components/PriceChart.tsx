import { useMemo, useState } from 'react';
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ResearchReport } from '../types';
import { fmtDate, fmtPct, fmtPrice } from '../lib/helpers';

type Range = '1M' | '3M';

interface Props {
  data: ResearchReport;
}

export default function PriceChart({ data }: Props) {
  const [range, setRange] = useState<Range>('3M');
  const bars = data.priceHistory || [];

  const slice = useMemo(() => {
    if (!bars.length) return [];
    const n = range === '1M' ? 22 : 66;
    return bars.slice(-n);
  }, [bars, range]);

  if (!slice.length) {
    return (
      <div className="card animate-fadeUp animate-delay-1">
        <div className="eyebrow mb-2">Price action</div>
        <p className="text-ink-secondary italic">No price history available.</p>
      </div>
    );
  }

  const first = slice[0].close;
  const last = slice[slice.length - 1].close;
  const ret = ((last - first) / first) * 100;
  const up = ret >= 0;
  const color = up ? 'var(--forest)' : 'var(--brick)';

  const low = Math.min(...slice.map((b) => b.low));
  const high = Math.max(...slice.map((b) => b.high));
  const vol = data.technicals.volatility != null ? `${(data.technicals.volatility * 100).toFixed(1)}%` : '—';

  const sma50 = data.technicals.sma50;
  const sma200 = data.technicals.sma200;

  return (
    <div className="card animate-fadeUp animate-delay-1">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="eyebrow mb-1">Price action</div>
          <h3 className="section-title">{range} chart</h3>
          <div className={`mt-1 text-sm font-medium ${up ? 'text-forest' : 'text-brick'}`}>
            {up ? '+' : ''}{fmtPrice(last - first)} ({fmtPct(ret)}) over period
          </div>
        </div>
        <div className="inline-flex items-center bg-cream-tint rounded-full p-1">
          {(['1M', '3M'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
                range === r ? 'bg-white text-ink shadow-pill' : 'text-ink-secondary'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="h-72 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={slice} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.18} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'var(--ink-tertiary)' }}
              interval="preserveStartEnd"
              tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis
              orientation="right"
              tick={{ fontSize: 11, fill: 'var(--ink-tertiary)' }}
              tickFormatter={(v) => `$${Math.round(v)}`}
              domain={['dataMin - 2', 'dataMax + 2']}
              width={50}
            />
            <Tooltip
              cursor={{ stroke: 'var(--ink-tertiary)', strokeDasharray: '2 4' }}
              contentStyle={{
                background: 'white',
                border: 'none',
                borderRadius: 14,
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                fontSize: 12,
              }}
              labelFormatter={(d) => fmtDate(String(d))}
              formatter={(v: any) => [`$${fmtPrice(Number(v))}`, 'Close']}
            />
            {range === '3M' && sma50 != null && (
              <ReferenceLine y={sma50} stroke="var(--dusty)" strokeDasharray="4 4" strokeWidth={1} label={{ value: 'SMA50', position: 'right', fontSize: 10, fill: 'var(--dusty)' }} />
            )}
            {range === '3M' && sma200 != null && (
              <ReferenceLine y={sma200} stroke="var(--amber)" strokeDasharray="4 4" strokeWidth={1} label={{ value: 'SMA200', position: 'right', fontSize: 10, fill: 'var(--amber)' }} />
            )}
            <Area
              type="monotone"
              dataKey="close"
              stroke={color}
              strokeWidth={2}
              fill="url(#priceGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="hairline-divider mt-2 mb-5" />
      <div className="grid grid-cols-3 gap-4 text-sm">
        <Stat label="Range low" value={`$${fmtPrice(low)}`} />
        <Stat label="Range high" value={`$${fmtPrice(high)}`} />
        <Stat label="Volatility" value={vol} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="eyebrow mb-1">{label}</div>
      <div className="text-ink font-medium tracking-tight1">{value}</div>
    </div>
  );
}
