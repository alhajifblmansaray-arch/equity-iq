import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Bell, NotebookPen, TrendingDown, TrendingUp } from '../lib/icons';
import { Link } from 'react-router-dom';
import type { ResearchReport } from '../types';
import { fmtCompact, fmtDate, fmtPct, fmtPrice, fmtRelative } from '../lib/helpers';
import WatchlistButton from './WatchlistButton';
import EarningsCountdown from './EarningsCountdown';
import { useLivePrice } from '../hooks/useLivePrice';

interface Props {
  data: ResearchReport;
}

function useAnimatedNumber(target: number, durationMs = 600): number {
  const [val, setVal] = useState(target);
  const fromRef = useRef(target);
  const firstRef = useRef(true);
  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      fromRef.current = 0;
    }
    let raf = 0;
    const start = performance.now();
    const from = fromRef.current;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setVal(from + (target - from) * ease(t));
      if (t < 1) raf = requestAnimationFrame(step);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return val;
}

export default function SnapshotCard({ data }: Props) {
  const s = data.snapshot;
  const { tick, connected, lastUpdate } = useLivePrice(data.ticker);

  const isLive = useMemo(() => {
    if (!tick || !lastUpdate) return false;
    return Date.now() - lastUpdate < 60_000;
  }, [tick, lastUpdate]);

  const livePrice = tick?.price;
  const effectivePrice = livePrice ?? s?.price ?? 0;
  const displayPrice = useAnimatedNumber(effectivePrice);

  const effectiveChange = useMemo(() => {
    if (livePrice != null && s?.prevClose != null) {
      const ch = livePrice - s.prevClose;
      const pct = (ch / s.prevClose) * 100;
      return { change: ch, changePct: pct };
    }
    return { change: s?.change ?? 0, changePct: s?.changePct ?? 0 };
  }, [livePrice, s]);

  if (!s) {
    return (
      <div className="card animate-fadeUp">
        <div className="eyebrow mb-2">Snapshot</div>
        <p className="text-ink-secondary italic">Data unavailable for this ticker.</p>
      </div>
    );
  }

  const up = effectiveChange.changePct >= 0;
  const derived = s.source === 'derived' || s.source === 'yahoo';

  return (
    <div className="card animate-fadeUp">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="eyebrow">Snapshot</span>
            {isLive ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase"
                style={{
                  background: 'rgba(46,93,67,0.12)',
                  color: 'var(--forest)',
                  border: '1px solid rgba(46,93,67,0.22)',
                  letterSpacing: '0.08em',
                }}
                title={`Last tick ${fmtRelative(new Date(lastUpdate!).toISOString())}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulseDot" />
                Live
              </span>
            ) : connected ? (
              <span className="text-[10px] uppercase tracking-eyebrow text-ink-tertiary">
                · waiting
              </span>
            ) : null}
          </div>
          <h2 className="font-serif text-5xl md:text-6xl leading-none" style={{ letterSpacing: '-0.028em' }}>
            {data.ticker}
          </h2>
          {data.profile?.name && (
            <div className="text-ink-secondary text-sm mt-2 font-medium">
              {data.profile.name}
              {data.profile.sector && (
                <span className="text-ink-tertiary font-normal"> · {data.profile.sector}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <WatchlistButton ticker={data.ticker} />
            <Link
              to={`/live?ticker=${data.ticker}`}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-ink-secondary transition"
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--panel-border)',
                boxShadow: 'var(--panel-shadow)',
              }}
              title="Open live chart"
            >
              <Activity size={13} />
              Live
            </Link>
            <Link
              to={`/alerts?ticker=${data.ticker}`}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-ink-secondary transition"
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--panel-border)',
                boxShadow: 'var(--panel-shadow)',
              }}
              title="Set a price alert"
            >
              <Bell size={13} />
              Alert
            </Link>
            <Link
              to={`/journal?ticker=${data.ticker}`}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-ink-secondary transition"
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--panel-border)',
                boxShadow: 'var(--panel-shadow)',
              }}
              title="Log this trade in your journal"
            >
              <NotebookPen size={13} />
              Log trade
            </Link>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <EarningsCountdown data={data} />
            {derived && !isLive && (
              <span className="pill pill-mute" title={`Source: ${s.source}`}>
                As of {fmtDate(s.asOf)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="mt-5 flex items-baseline gap-1.5">
        <span className="text-ink-tertiary text-2xl md:text-3xl font-serif" style={{ letterSpacing: '-0.02em' }}>$</span>
        <span
          className="font-serif text-6xl md:text-[76px] leading-none tabular-nums"
          style={{ letterSpacing: '-0.028em' }}
        >
          {fmtPrice(displayPrice)}
        </span>
      </div>

      <div className={`mt-3 flex items-center gap-2 text-[15px] font-semibold ${up ? 'text-forest' : 'text-brick'}`}>
        {up ? <TrendingUp size={17} /> : <TrendingDown size={17} />}
        <span className="tabular-nums">{up ? '+' : ''}{fmtPrice(effectiveChange.change)}</span>
        <span className="tabular-nums">({fmtPct(effectiveChange.changePct)})</span>
        <span className="text-ink-tertiary font-normal text-sm">
          {isLive ? 'live · vs prev close' : 'past day'}
        </span>
      </div>

      <div className="hairline-divider my-6" />

      {/* Metrics as tiles */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        <MetricTile label="Open"       value={s.open      ? `$${fmtPrice(s.open)}`      : '-'} />
        <MetricTile label="High"       value={s.high      ? `$${fmtPrice(s.high)}`      : '-'} accent="forest" />
        <MetricTile label="Low"        value={s.low       ? `$${fmtPrice(s.low)}`       : '-'} accent="brick" />
        <MetricTile label="Volume"     value={fmtCompact(s.volume)} />
        <MetricTile label="Prev close" value={s.prevClose ? `$${fmtPrice(s.prevClose)}` : '-'} />
        <MetricTile
          label="VWAP"
          value={s.vwap ? `$${fmtPrice(s.vwap)}` : s.marketCap ? fmtCompact(s.marketCap) : '-'}
          sub={s.marketCap && !s.vwap ? 'Mkt cap' : undefined}
        />
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: 'forest' | 'brick';
}) {
  const accentColor = accent === 'forest' ? 'var(--forest)' : accent === 'brick' ? 'var(--brick)' : undefined;
  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--panel-border)',
      }}
    >
      <div className="eyebrow mb-1">{label}</div>
      {sub && <div className="text-[10px] text-ink-tertiary -mt-0.5 mb-0.5">{sub}</div>}
      <div
        className="text-[15px] font-semibold tabular-nums"
        style={{ color: accentColor ?? 'var(--ink)', letterSpacing: '-0.015em' }}
      >
        {value}
      </div>
    </div>
  );
}
