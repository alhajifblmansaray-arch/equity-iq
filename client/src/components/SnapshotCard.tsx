import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Bell, TrendingDown, TrendingUp } from 'lucide-react';
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

  // Determine "fresh enough" — Finnhub only streams during market hours.
  const isLive = useMemo(() => {
    if (!tick || !lastUpdate) return false;
    return Date.now() - lastUpdate < 60_000;
  }, [tick, lastUpdate]);

  // Effective price: live tick if available, else snapshot price.
  const livePrice = tick?.price;
  const effectivePrice = livePrice ?? s?.price ?? 0;
  const displayPrice = useAnimatedNumber(effectivePrice);

  // Effective change vs prev close — use live price if streaming, else snapshot's own change.
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
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="eyebrow">Snapshot</span>
            {isLive ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-eyebrow font-medium"
                style={{ background: 'color-mix(in srgb, var(--forest) 14%, transparent)', color: 'var(--forest)' }}
                title={`Last tick ${fmtRelative(new Date(lastUpdate!).toISOString())}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulseDot" />
                Live
              </span>
            ) : connected ? (
              <span className="text-[10px] uppercase tracking-eyebrow text-ink-tertiary" title="Connected — waiting for next trade. Market may be closed.">
                · waiting
              </span>
            ) : null}
          </div>
          <h2 className="font-serif text-5xl md:text-6xl tracking-tight2 leading-none">{data.ticker}</h2>
          {data.profile?.name && (
            <div className="text-ink-secondary text-sm mt-2">
              {data.profile.name}
              {data.profile.sector && <span className="text-ink-tertiary"> · {data.profile.sector}</span>}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <WatchlistButton ticker={data.ticker} />
            <Link
              to={`/live?ticker=${data.ticker}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-cream-tint px-3 py-1.5 text-xs font-medium text-ink-secondary hover:text-ink hover:bg-white transition"
              title="Open live chart"
            >
              <Activity size={13} strokeWidth={1.8} />
              Live
            </Link>
            <Link
              to={`/alerts?ticker=${data.ticker}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-cream-tint px-3 py-1.5 text-xs font-medium text-ink-secondary hover:text-ink hover:bg-white transition"
              title="Set a price alert"
            >
              <Bell size={13} strokeWidth={1.8} />
              Alert
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

      <div className="mt-6 flex items-baseline gap-2">
        <span className="text-ink-tertiary text-2xl md:text-3xl font-serif">$</span>
        <span className="font-serif text-6xl md:text-[72px] leading-none tracking-tight2 tabular-nums">
          {fmtPrice(displayPrice)}
        </span>
      </div>

      <div className={`mt-3 flex items-center gap-2 text-base font-medium ${up ? 'text-forest' : 'text-brick'}`}>
        {up ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
        <span className="tabular-nums">{up ? '+' : ''}{fmtPrice(effectiveChange.change)}</span>
        <span className="tabular-nums">({fmtPct(effectiveChange.changePct)})</span>
        <span className="text-ink-tertiary font-normal text-sm">
          {isLive ? 'live · vs prev close' : 'past day'}
        </span>
      </div>

      <div className="hairline-divider my-7" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
        <Metric label="Open" value={s.open ? `$${fmtPrice(s.open)}` : '—'} />
        <Metric label="High" value={s.high ? `$${fmtPrice(s.high)}` : '—'} />
        <Metric label="Low" value={s.low ? `$${fmtPrice(s.low)}` : '—'} />
        <Metric label="Volume" value={fmtCompact(s.volume)} />
        <Metric label="Prev close" value={s.prevClose ? `$${fmtPrice(s.prevClose)}` : '—'} />
        <Metric
          label="VWAP"
          value={s.vwap ? `$${fmtPrice(s.vwap)}` : s.marketCap ? `Mkt cap ${fmtCompact(s.marketCap)}` : '—'}
        />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="eyebrow mb-1">{label}</div>
      <div className="text-ink text-[17px] font-medium tracking-tight1 tabular-nums">{value}</div>
    </div>
  );
}
