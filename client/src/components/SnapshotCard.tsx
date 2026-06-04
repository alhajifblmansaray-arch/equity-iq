import { useEffect, useState } from 'react';
import { Activity, Bell, TrendingDown, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ResearchReport } from '../types';
import { fmtCompact, fmtDate, fmtPct, fmtPrice } from '../lib/helpers';
import WatchlistButton from './WatchlistButton';
import EarningsCountdown from './EarningsCountdown';

interface Props {
  data: ResearchReport;
}

function useAnimatedNumber(target: number, durationMs = 900): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setVal(from + (target - from) * ease(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return val;
}

export default function SnapshotCard({ data }: Props) {
  const s = data.snapshot;
  const displayPrice = useAnimatedNumber(s?.price ?? 0);
  if (!s) {
    return (
      <div className="card animate-fadeUp">
        <div className="eyebrow mb-2">Snapshot</div>
        <p className="text-ink-secondary italic">Data unavailable for this ticker.</p>
      </div>
    );
  }

  const up = (s.changePct ?? 0) >= 0;
  const derived = s.source === 'derived' || s.source === 'yahoo';

  return (
    <div className="card animate-fadeUp">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <div className="eyebrow mb-1">Snapshot</div>
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
            {derived && (
              <span className="pill pill-mute" title={`Source: ${s.source}`}>
                As of {fmtDate(s.asOf)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-baseline gap-2">
        <span className="text-ink-tertiary text-2xl md:text-3xl font-serif">$</span>
        <span className="font-serif text-6xl md:text-[72px] leading-none tracking-tight2">
          {fmtPrice(displayPrice)}
        </span>
      </div>

      <div className={`mt-3 flex items-center gap-2 text-base font-medium ${up ? 'text-forest' : 'text-brick'}`}>
        {up ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
        <span>{up ? '+' : ''}{fmtPrice(s.change)}</span>
        <span>({fmtPct(s.changePct)})</span>
        <span className="text-ink-tertiary font-normal text-sm">past day</span>
      </div>

      <div className="hairline-divider my-7" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
        <Metric label="Open" value={s.open ? `$${fmtPrice(s.open)}` : '—'} />
        <Metric label="High" value={s.high ? `$${fmtPrice(s.high)}` : '—'} />
        <Metric label="Low" value={s.low ? `$${fmtPrice(s.low)}` : '—'} />
        <Metric label="Volume" value={fmtCompact(s.volume)} />
        <Metric label="Prev close" value={s.prevClose ? `$${fmtPrice(s.prevClose)}` : '—'} />
        <Metric label="VWAP" value={s.vwap ? `$${fmtPrice(s.vwap)}` : (s.marketCap ? `Mkt cap ${fmtCompact(s.marketCap)}` : '—')} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="eyebrow mb-1">{label}</div>
      <div className="text-ink text-[17px] font-medium tracking-tight1">{value}</div>
    </div>
  );
}
