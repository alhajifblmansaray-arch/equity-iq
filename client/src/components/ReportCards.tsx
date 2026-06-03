import type { ResearchReport } from '../types';
import { computeVerdict, generateBullBear, generateRisks } from '../lib/helpers';

interface Props {
  data: ResearchReport;
}

export function RisksCard({ data }: Props) {
  const risks = generateRisks(data);
  return (
    <div className="card animate-fadeUp animate-delay-5">
      <div className="eyebrow mb-1">Risks to watch</div>
      <h3 className="section-title mb-5">What could go wrong</h3>
      <ol className="space-y-0">
        {risks.map((r, i, arr) => (
          <li key={r.label} className={`flex gap-5 py-4 ${i < arr.length - 1 ? 'border-b border-hairline' : ''}`}>
            <span className="text-ink-tertiary text-sm font-medium tabular-nums w-6 flex-shrink-0">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div>
              <div className="font-medium text-[15px] tracking-tight1">{r.label}</div>
              <div className="text-sm text-ink-secondary leading-relaxed mt-0.5">{r.detail}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function BullBearCard({ data }: Props) {
  const { bull, bear } = generateBullBear(data);
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div
        className="rounded-3xl p-7 animate-fadeUp animate-delay-6"
        style={{ background: 'rgba(46,93,67,0.08)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-forest" />
          <span className="eyebrow text-forest">Bull case</span>
        </div>
        <ul className="space-y-3">
          {bull.map((b, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
              <span className="text-forest font-medium flex-shrink-0">→</span>
              <span className="text-ink">{b}</span>
            </li>
          ))}
        </ul>
      </div>
      <div
        className="rounded-3xl p-7 animate-fadeUp animate-delay-7"
        style={{ background: 'rgba(192,78,64,0.08)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-brick" />
          <span className="eyebrow text-brick">Bear case</span>
        </div>
        <ul className="space-y-3">
          {bear.map((b, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
              <span className="text-brick font-medium flex-shrink-0">→</span>
              <span className="text-ink">{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function VerdictCard({ data }: Props) {
  const v = computeVerdict(data);
  const R = 60;
  const C = 2 * Math.PI * R;
  const offset = C - (v.score / 100) * C;
  const ringColor =
    v.color === 'forest' ? 'var(--forest)' : v.color === 'amber' ? 'var(--amber)' : 'var(--brick)';

  return (
    <div className="card animate-fadeUp animate-delay-8">
      <div className="eyebrow mb-1">Verdict</div>
      <h3 className="section-title mb-6">EquityIQ score</h3>

      <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
        <div className="relative flex-shrink-0">
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r={R} stroke="var(--hairline)" strokeWidth="10" fill="none" />
            <circle
              cx="70"
              cy="70"
              r={R}
              stroke={ringColor}
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={offset}
              transform="rotate(-90 70 70)"
              style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-serif text-5xl tracking-tight2 leading-none">{v.score}</div>
            <div className="text-xs text-ink-tertiary mt-1">/ 100</div>
          </div>
        </div>

        <div className="flex-1 text-center md:text-left">
          <span className={`pill ${v.pillClass} text-sm px-3 py-1.5`}>{v.verdict}</span>
          <p className="text-ink-secondary mt-3 leading-relaxed">{v.rationale}</p>
        </div>
      </div>

      <div className="hairline-divider my-6" />
      <div className="eyebrow mb-3">Scoring factors</div>
      <div className="space-y-0">
        {v.factors.map((f, i, arr) => (
          <div
            key={f.label + i}
            className={`flex items-center justify-between py-2.5 ${i < arr.length - 1 ? 'border-b border-hairline' : ''}`}
          >
            <span className="text-[14px] text-ink">{f.label}</span>
            <span
              className={`text-sm font-medium tabular-nums ${
                f.impact > 0 ? 'text-forest' : f.impact < 0 ? 'text-brick' : 'text-ink-tertiary'
              }`}
            >
              {f.impact > 0 ? '+' : ''}{f.impact}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-ink-tertiary mt-5 leading-relaxed">
        For research and educational purposes only. Not investment advice.
        Scores are derived from technical and fundamental signals and may not reflect future performance.
      </p>
    </div>
  );
}
