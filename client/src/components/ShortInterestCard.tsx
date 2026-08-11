import type { ResearchReport } from '../types';
import { fmtCompact, fmtDate, fmtPct } from '../lib/helpers';

interface Props {
  data: ResearchReport;
}

export default function ShortInterestCard({ data }: Props) {
  const si = data.shortInterest;
  if (!si) return null;

  const pct = si.shortPercent;
  let tier = 'Low';
  let tierClass = 'pill-forest';
  let barColor = 'var(--forest)';
  if (pct != null) {
    if (pct > 20) {
      tier = 'High';
      tierClass = 'pill-brick';
      barColor = 'var(--brick)';
    } else if (pct > 10) {
      tier = 'Moderate';
      tierClass = 'pill-amber';
      barColor = 'var(--amber)';
    }
  }

  return (
    <div className="card animate-fadeUp animate-delay-3">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="eyebrow mb-1">Short interest</div>
          <h3 className="section-title">Positioning</h3>
        </div>
        {pct != null && <span className={`pill ${tierClass}`}>{tier}</span>}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div>
          <div className="eyebrow mb-2">% of float</div>
          <div className="font-serif text-3xl tracking-tight1 mb-2">
            {pct != null ? `${pct.toFixed(1)}%` : '-'}
          </div>
          {pct != null && (
            <div className="h-1.5 bg-cream-tint rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, pct * 3)}%`, background: barColor }}
              />
            </div>
          )}
        </div>
        <div>
          <div className="eyebrow mb-2">Shares short</div>
          <div className="font-serif text-3xl tracking-tight1">{fmtCompact(si.sharesShort)}</div>
        </div>
        <div>
          <div className="eyebrow mb-2">Days to cover</div>
          <div className="font-serif text-3xl tracking-tight1">
            {si.daysToCover != null ? si.daysToCover.toFixed(1) : '-'}
          </div>
        </div>
      </div>

      {si.reportedAt && (
        <div className="mt-5 text-xs text-ink-tertiary">
          Reported as of {fmtDate(si.reportedAt)}
        </div>
      )}
    </div>
  );
}
