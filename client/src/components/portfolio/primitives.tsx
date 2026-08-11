import type { PortfolioHolding } from '../../types';

/* ── formatters ─────────────────────────────────────────────────────────────── */

export function money(n: number | null | undefined, cur = 'CAD'): string {
  if (n == null) return '-';
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur}`;
}

export function dollars(n: number | null | undefined): string {
  if (n == null) return '-';
  const sign = n < 0 ? '−' : '+';
  return `${sign}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Compact form for headline figures - $74.8k rather than $74,811.13. */
export function compact(n: number | null | undefined): string {
  if (n == null) return '-';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export function pct(n: number | null | undefined): string {
  if (n == null) return '-';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

export function pnlColor(n: number | null | undefined): string {
  return n == null ? 'text-ink-secondary' : n > 0 ? 'text-forest' : n < 0 ? 'text-brick' : 'text-ink-secondary';
}

/* ── monogram avatar ────────────────────────────────────────────────────────── */

export function Monogram({ ticker, color, size = 36 }: { ticker: string; color: string; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold"
      style={{ width: size, height: size, background: color, fontSize: size * 0.34 }}
    >
      {ticker.slice(0, 2)}
    </div>
  );
}

/* ── return pill ────────────────────────────────────────────────────────────── */

export function ReturnCell({ amount, percent }: { amount: number | null; percent: number | null }) {
  if (amount == null) return <span className="text-ink-secondary text-sm">-</span>;
  const up = amount >= 0;
  return (
    <div className="flex items-center justify-end gap-2">
      <span className={`text-sm tabular-nums ${pnlColor(amount)}`}>{dollars(amount)}</span>
      {percent != null && (
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium tabular-nums ${
            up ? 'bg-forest/15 text-forest' : 'bg-brick/15 text-brick'
          }`}
        >
          {pct(percent)}
        </span>
      )}
    </div>
  );
}

/* ── area chart ─────────────────────────────────────────────────────────────── */

export function AreaChart({ values, height = 180, emptyLabel = 'Add holdings to see your value over time.' }: {
  values: number[];
  height?: number;
  emptyLabel?: string;
}) {
  const width = 720;
  if (values.length < 2) {
    return (
      <div className="flex items-center justify-center text-ink-secondary text-sm border-y border-glass-border/50" style={{ height }}>
        {emptyLabel}
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
  const gid = `pf-grad-${up ? 'up' : 'down'}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.26" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── allocation donut ───────────────────────────────────────────────────────── */

export function Donut({ slices, size = 108 }: { slices: Array<{ label: string; value: number; color: string }>; size?: number }) {
  const total = slices.reduce((s, x) => s + Math.max(0, x.value), 0);
  const r = size / 2 - 9;
  const c = 2 * Math.PI * r;
  let offset = 0;

  if (total <= 0) {
    return (
      <svg width={size} height={size} className="flex-shrink-0">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--hairline)" strokeWidth="14" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} className="flex-shrink-0 -rotate-90">
      {slices.map((s) => {
        const frac = Math.max(0, s.value) / total;
        const dash = frac * c;
        const el = (
          <circle
            key={s.label}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth="14"
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={-offset}
          />
        );
        offset += dash;
        return el;
      })}
    </svg>
  );
}

/* ── stat tile ──────────────────────────────────────────────────────────────── */

export function Stat({ label, value, sub, tone }: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'up' | 'down' | 'neutral';
}) {
  const color = tone === 'up' ? 'text-forest' : tone === 'down' ? 'text-brick' : 'text-ink';
  return (
    <div className="card !py-3.5">
      <p className="text-[11px] uppercase tracking-wide text-ink-tertiary mb-1">{label}</p>
      <p className={`text-lg font-semibold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-ink-tertiary mt-0.5">{sub}</p>}
    </div>
  );
}

/* ── shared derivations ─────────────────────────────────────────────────────── */

/** Largest single position as a share of the book - the simplest concentration read. */
export function concentration(holdings: PortfolioHolding[]): { top: number; top3: number } {
  const values = holdings.map((h) => h.marketValue ?? 0).sort((a, b) => b - a);
  const total = values.reduce((s, v) => s + v, 0);
  if (total <= 0) return { top: 0, top3: 0 };
  return {
    top: (values[0] / total) * 100,
    top3: (values.slice(0, 3).reduce((s, v) => s + v, 0) / total) * 100,
  };
}
