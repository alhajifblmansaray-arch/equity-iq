import { Link } from 'react-router-dom';
import { useWatchlist } from '../contexts/WatchlistContext';
import { fmtPct } from '../lib/helpers';

export default function SentimentHeatmap() {
  const { tickers, snaps } = useWatchlist();
  if (tickers.length === 0) return null;

  return (
    <div className="card animate-fadeUp">
      <div className="eyebrow mb-3">Sentiment heatmap</div>
      <div className="flex flex-wrap gap-2">
        {tickers.map((t) => {
          const q = snaps[t]?.quote;
          const pct = q?.changePct ?? 0;
          let bg = 'var(--cream-tint)';
          let fg = 'var(--ink-tertiary)';
          if (q) {
            const a = Math.min(1, Math.abs(pct) / 5);
            if (pct >= 0.1) {
              bg = `color-mix(in srgb, var(--forest) ${Math.max(15, a * 65)}%, var(--cream-tint))`;
              fg = a > 0.4 ? 'var(--cream)' : 'var(--forest)';
            } else if (pct <= -0.1) {
              bg = `color-mix(in srgb, var(--brick) ${Math.max(15, a * 65)}%, var(--cream-tint))`;
              fg = a > 0.4 ? 'var(--cream)' : 'var(--brick)';
            }
          }
          return (
            <Link
              key={t}
              to={`/dashboard?ticker=${t}`}
              title={q ? `${t} ${fmtPct(pct)} today` : t}
              className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl text-[11px] font-medium tabular-nums transition hover:scale-105"
              style={{ background: bg, color: fg }}
            >
              <span className="text-[12px] font-semibold tracking-tight1">{t}</span>
              <span className="text-[10px] mt-0.5 opacity-90">{q ? fmtPct(pct) : '-'}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
