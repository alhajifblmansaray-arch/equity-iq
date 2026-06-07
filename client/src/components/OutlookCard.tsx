import { AlertCircle, ArrowDownRight, ArrowRight, ArrowUpRight, Globe2, Loader2, Sparkles, Telescope } from 'lucide-react';
import { research } from '../lib/api';
import { useAiJob } from '../contexts/AiJobsContext';
import type { Confidence, Direction, Outlook, Prediction, ResearchReport } from '../types';
import { fmtCompact, fmtPct } from '../lib/helpers';

interface Props {
  data: ResearchReport;
}

const RANK_LABEL: Record<Outlook['positioning']['rank'], string> = {
  leader: 'Industry leader',
  established: 'Established player',
  challenger: 'Challenger',
  niche: 'Niche specialist',
  early: 'Early-stage',
};

export default function OutlookCard({ data }: Props) {
  const { status, data: outlook, error, run } = useAiJob<Outlook>('outlook', data.ticker);
  const loading = status === 'loading';

  function generate() {
    run(() => research.outlook(data.ticker).then((r) => r.outlook));
  }

  return (
    <div
      className="rounded-3xl p-7 animate-fadeUp animate-delay-8"
      style={{ background: 'color-mix(in srgb, var(--dusty) 7%, var(--surface))' }}
    >
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Telescope size={13} className="text-dusty" />
            <span className="eyebrow text-dusty">Outlook</span>
          </div>
          <h3 className="section-title">Forward view</h3>
          <p className="text-ink-secondary text-[14px] mt-2 max-w-2xl leading-relaxed">
            AI-modeled view of the industry, positioning, catalysts, sentiment, and price bias across
            day / week / month / year horizons. Grounded in the report — won't invent dates or
            customers it doesn't have.
          </p>
        </div>
        {!outlook && (
          <button onClick={generate} disabled={loading} className="btn-primary text-sm disabled:opacity-60 flex-shrink-0">
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin mr-1.5" /> Modeling…
              </>
            ) : (
              <>
                <Sparkles size={14} className="mr-1.5" /> Run outlook
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <div
          className="flex items-start gap-2 text-brick text-sm rounded-2xl px-4 py-3 mb-3"
          style={{ background: 'color-mix(in srgb, var(--brick) 10%, transparent)' }}
        >
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span className="whitespace-pre-wrap">{error}</span>
        </div>
      )}

      {!outlook && !loading && !error && (
        <div
          className="rounded-2xl p-5 text-sm leading-relaxed"
          style={{ background: 'color-mix(in srgb, var(--dusty) 5%, transparent)', color: 'var(--ink-secondary)' }}
        >
          <p>
            Click <strong>Run outlook</strong> to get a forward-looking analysis: how big the industry is, where this
            company sits in it, what catalysts are around the corner, the sentiment picture, and a probabilistic
            price bias for 4 horizons — each grounded in the data we have on this stock.
          </p>
        </div>
      )}

      {outlook && (
        <div className="space-y-5">
          {/* Industry + positioning */}
          <div className="grid md:grid-cols-2 gap-4">
            <IndustryTile industry={outlook.industry} />
            <PositioningTile positioning={outlook.positioning} />
          </div>

          {/* Predictions across horizons */}
          <PredictionsRow predictions={outlook.predictions} />

          {/* Sentiment quartet */}
          <SentimentBar sentiment={outlook.sentiment} />

          {/* Catalysts */}
          <CatalystsList catalysts={outlook.catalysts} />

          {/* Summary */}
          <div
            className="rounded-2xl p-5 leading-relaxed text-[15px]"
            style={{ background: 'color-mix(in srgb, var(--dusty) 8%, var(--surface))' }}
          >
            <div className="eyebrow text-dusty mb-2">In one breath</div>
            <p>{outlook.summary}</p>
          </div>

          <div className="flex items-center justify-between text-[11px] text-ink-tertiary pt-1">
            <span>Modeled view, not investment advice.</span>
            <button onClick={generate} disabled={loading} className="hover:text-ink transition disabled:opacity-50">
              {loading ? 'Regenerating…' : 'Regenerate'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- subcomponents ----------------

function IndustryTile({ industry }: { industry: Outlook['industry'] }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--surface)' }}>
      <div className="flex items-center gap-1.5 mb-2">
        <Globe2 size={12} className="text-dusty" />
        <span className="eyebrow">Industry</span>
      </div>
      <div className="font-serif text-xl tracking-tight1 mb-1">{industry.name}</div>
      {industry.tamUsd != null && (
        <div className="text-[14px] mb-1">
          <span className="font-serif text-3xl tracking-tight2 tabular-nums">
            ${fmtCompact(industry.tamUsd)}
          </span>{' '}
          <span className="text-ink-secondary text-[13px]">TAM</span>
          {industry.horizonYears && (
            <span className="text-ink-tertiary text-[12px]"> by {new Date().getFullYear() + industry.horizonYears}</span>
          )}
          {industry.growthPctAnnual != null && (
            <div className="text-[12px] text-forest mt-0.5">
              +{industry.growthPctAnnual.toFixed(1)}% / yr expected
            </div>
          )}
        </div>
      )}
      {industry.subAreas?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {industry.subAreas.slice(0, 4).map((s) => (
            <span
              key={s}
              className="text-[11px] px-2 py-0.5 rounded-full"
              style={{ background: 'color-mix(in srgb, var(--dusty) 12%, transparent)', color: 'var(--dusty)' }}
            >
              {s}
            </span>
          ))}
        </div>
      )}
      <p className="text-[13px] text-ink-secondary leading-relaxed mt-3">{industry.summary}</p>
    </div>
  );
}

function PositioningTile({ positioning }: { positioning: Outlook['positioning'] }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--surface)' }}>
      <span className="eyebrow">Positioning</span>
      <div className="mt-1 flex items-center gap-2">
        <span className={`pill pill-forest text-[11px] font-medium`}>{RANK_LABEL[positioning.rank]}</span>
      </div>
      <p className="text-[13px] text-ink-secondary mt-2 leading-relaxed">{positioning.rationale}</p>
      {positioning.moats?.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {positioning.moats.slice(0, 4).map((m, i) => (
            <li key={i} className="flex gap-2 text-[13px] leading-relaxed">
              <span className="text-forest flex-shrink-0">→</span>
              <span>{m}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PredictionsRow({ predictions }: { predictions: Outlook['predictions'] }) {
  const items: Array<[string, Prediction]> = [
    ['1d', predictions.day],
    ['1w', predictions.week],
    ['1mo', predictions.month],
    ['1y', predictions.year],
  ];
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--surface)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="eyebrow">Forward bias</span>
        <span className="text-[11px] text-ink-tertiary">model output</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map(([label, p]) => (
          <PredictionTile key={label} label={label} p={p} />
        ))}
      </div>
    </div>
  );
}

const CONFIDENCE_BARS: Record<Confidence, number> = { low: 1, moderate: 2, high: 3 };

function PredictionTile({ label, p }: { label: string; p: Prediction }) {
  const colorFor = (d: Direction) =>
    d === 'up' ? 'var(--forest)' : d === 'down' ? 'var(--brick)' : 'var(--ink-tertiary)';
  const arrowFor = (d: Direction) =>
    d === 'up' ? <ArrowUpRight size={14} /> : d === 'down' ? <ArrowDownRight size={14} /> : <ArrowRight size={14} />;
  const signed = p.direction === 'down' ? -Math.abs(p.magnitudePct) : p.direction === 'up' ? Math.abs(p.magnitudePct) : 0;
  return (
    <div
      className="rounded-2xl p-3"
      style={{ background: 'color-mix(in srgb, var(--cream-tint) 60%, var(--surface))' }}
      title={p.basis}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] uppercase tracking-eyebrow text-ink-tertiary font-medium">{label}</span>
        <span style={{ color: colorFor(p.direction) }} className="flex items-center">
          {arrowFor(p.direction)}
        </span>
      </div>
      <div
        className="font-serif text-2xl tracking-tight1 tabular-nums leading-tight"
        style={{ color: colorFor(p.direction) }}
      >
        {p.direction === 'flat' ? '~0%' : fmtPct(signed)}
      </div>
      <div className="flex items-center gap-1 mt-1.5">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className="w-4 h-1 rounded-full"
            style={{
              background: i <= CONFIDENCE_BARS[p.confidence] ? colorFor(p.direction) : 'var(--hairline)',
            }}
          />
        ))}
        <span className="text-[10px] uppercase tracking-eyebrow text-ink-tertiary ml-1">{p.confidence}</span>
      </div>
    </div>
  );
}

function SentimentBar({ sentiment }: { sentiment: Outlook['sentiment'] }) {
  const items: Array<[string, number | null | undefined]> = [
    ['News', sentiment.news],
    ['Technicals', sentiment.technical],
    ['Institutional', sentiment.institutional ?? null],
    ['Social', sentiment.social ?? null],
  ];
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--surface)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="eyebrow">Sentiment</span>
        <span className="text-[11px] text-ink-tertiary">1 bear · 5 bull</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {items.map(([label, val]) => (
          <SentimentDots key={label} label={label} value={val} />
        ))}
      </div>
      <p className="text-[12px] text-ink-tertiary leading-relaxed mt-3">{sentiment.note}</p>
    </div>
  );
}

function SentimentDots({ label, value }: { label: string; value: number | null | undefined }) {
  const v = value == null ? null : Math.max(1, Math.min(5, Math.round(value)));
  const color =
    v == null
      ? 'var(--ink-tertiary)'
      : v <= 2
      ? 'var(--brick)'
      : v === 3
      ? 'var(--amber)'
      : 'var(--forest)';
  return (
    <div>
      <div className="text-[12px] text-ink-secondary mb-1.5">{label}</div>
      {v == null ? (
        <div className="text-[12px] text-ink-tertiary italic">not graded</div>
      ) : (
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: i <= v ? color : 'var(--hairline)' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CatalystsList({ catalysts }: { catalysts: Outlook['catalysts'] }) {
  if (!catalysts || catalysts.length === 0) return null;
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--surface)' }}>
      <span className="eyebrow">Catalysts ahead</span>
      <ul className="mt-3 space-y-3">
        {catalysts.slice(0, 6).map((c, i) => {
          const dot =
            c.direction === 'bullish'
              ? 'var(--forest)'
              : c.direction === 'bearish'
              ? 'var(--brick)'
              : 'var(--ink-tertiary)';
          const impactWidth = c.impact === 'high' ? '100%' : c.impact === 'medium' ? '60%' : '30%';
          return (
            <li key={i} className="flex gap-3">
              <span
                className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                style={{ background: dot, boxShadow: `0 0 0 4px color-mix(in srgb, ${dot} 14%, transparent)` }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium text-[14px] tracking-tight1">{c.label}</span>
                  <span className="text-[11px] text-ink-tertiary uppercase tracking-eyebrow">{c.when}</span>
                </div>
                <p className="text-[13px] text-ink-secondary leading-relaxed mt-0.5">{c.note}</p>
                <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: 'var(--cream-tint)' }}>
                  <div className="h-full" style={{ width: impactWidth, background: dot }} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
