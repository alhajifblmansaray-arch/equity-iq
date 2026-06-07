import { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  GitBranch,
  Loader2,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { research } from '../lib/api';
import type {
  Forecast,
  ForecastConfidence,
  ForecastDirection,
  HorizonForecast,
  ResearchReport,
} from '../types';
import { fmtPrice } from '../lib/helpers';

interface Props {
  data: ResearchReport;
}

const HORIZON_LABEL: Record<HorizonForecast['horizon'], string> = {
  '1H': 'Next hour',
  '1D': 'Today / tomorrow',
  '3D': 'Next 3 days',
  '1W': 'Next week',
};

const SESSION_LABEL: Record<string, string> = {
  'pre-market': 'Pre-market',
  open: 'Market open',
  midday: 'Midday',
  'power-hour': 'Power hour',
  'after-hours': 'After hours',
  closed: 'Market closed',
};

export default function ForecastCard({ data }: Props) {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const r = await research.forecast(data.ticker);
      setForecast(r.forecast);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not generate forecast.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card animate-fadeUp">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={13} className="text-forest" />
            <span className="eyebrow text-forest">Forecast</span>
          </div>
          <h3 className="section-title">Multi-horizon outlook</h3>
          <p className="text-ink-secondary text-[14px] mt-2 max-w-2xl leading-relaxed">
            A probabilistic price view across four horizons — next hour, day, 3 days, and a week —
            each weighting the inputs that actually drive that timeframe (flow & momentum up close,
            fundamentals & macro further out). Honest about its edge and what data it's missing.
          </p>
        </div>
        {!forecast && (
          <button onClick={generate} disabled={loading} className="btn-primary text-sm disabled:opacity-60 flex-shrink-0">
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin mr-1.5" /> Forecasting…
              </>
            ) : (
              <>
                <Sparkles size={14} className="mr-1.5" /> Run forecast
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

      {!forecast && !loading && !error && (
        <div
          className="rounded-2xl p-5 text-sm leading-relaxed"
          style={{ background: 'color-mix(in srgb, var(--forest) 5%, transparent)', color: 'var(--ink-secondary)' }}
        >
          <p>
            Click <strong>Run forecast</strong> for a calibrated, multi-horizon price view. Short-horizon moves are
            close to a coin flip, so the model keeps its confidence honest and tells you which signals conflict and
            what data would sharpen the call.
          </p>
        </div>
      )}

      {forecast && (
        <div className="space-y-5">
          {/* Session context */}
          <div className="flex items-center gap-2 flex-wrap text-[12px]">
            <span className="pill pill-mute">
              {SESSION_LABEL[forecast.market_session] || forecast.market_session}
            </span>
            <span className="text-ink-tertiary">
              Current ${fmtPrice(forecast.current_price)} · as of {new Date(forecast.as_of).toLocaleString()}
            </span>
          </div>

          {/* Horizon grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            {forecast.forecasts.map((f) => (
              <HorizonTile key={f.horizon} f={f} current={forecast.current_price} />
            ))}
          </div>

          {/* Overall thesis */}
          <div
            className="rounded-2xl p-5 leading-relaxed text-[15px]"
            style={{ background: 'color-mix(in srgb, var(--forest) 7%, var(--surface))' }}
          >
            <div className="eyebrow text-forest mb-2">Overall thesis</div>
            <p>{forecast.overall_thesis}</p>
          </div>

          {/* Conflicting signals + data gaps */}
          <div className="grid md:grid-cols-2 gap-4">
            {forecast.conflicting_signals?.length > 0 && (
              <ListTile
                icon={<GitBranch size={12} className="text-amber" />}
                title="Conflicting signals"
                items={forecast.conflicting_signals}
                tone="amber"
              />
            )}
            {forecast.data_gaps?.length > 0 && (
              <ListTile
                icon={<AlertTriangle size={12} className="text-ink-tertiary" />}
                title="Data gaps"
                items={forecast.data_gaps}
                tone="mute"
              />
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-ink-tertiary pt-1">
            <span>Model output, not investment advice. Short-horizon moves are near-random — treat confidence accordingly.</span>
            <button onClick={generate} disabled={loading} className="hover:text-ink transition disabled:opacity-50 flex-shrink-0 ml-3">
              {loading ? 'Regenerating…' : 'Regenerate'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- subcomponents ----------------

function colorFor(d: ForecastDirection) {
  return d === 'up' ? 'var(--forest)' : d === 'down' ? 'var(--brick)' : 'var(--ink-tertiary)';
}
function arrowFor(d: ForecastDirection) {
  return d === 'up' ? <ArrowUpRight size={16} /> : d === 'down' ? <ArrowDownRight size={16} /> : <ArrowRight size={16} />;
}

const CONF_PILL: Record<ForecastConfidence, string> = {
  low: 'pill-mute',
  medium: 'pill-amber',
  high: 'pill-forest',
};

function HorizonTile({ f, current }: { f: HorizonForecast; current: number }) {
  const color = colorFor(f.direction);
  const probUp = Math.round((f.probability_up ?? 0.5) * 100);
  const signed = f.expected_move_pct ?? 0;

  // Position current price and base within the [low, high] range for the bar.
  const { low, base, high } = f.price_range || { low: current, base: current, high: current };
  const span = Math.max(high - low, 1e-6);
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - low) / span) * 100));

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--surface)' }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[11px] uppercase tracking-eyebrow text-ink-tertiary font-medium">{f.horizon}</div>
          <div className="text-[13px] text-ink-secondary">{HORIZON_LABEL[f.horizon]}</div>
        </div>
        <span className={`pill ${CONF_PILL[f.confidence]} text-[11px]`}>{f.confidence} conf.</span>
      </div>

      <div className="flex items-baseline gap-2">
        <span style={{ color }} className="flex items-center">
          {arrowFor(f.direction)}
        </span>
        <span className="font-serif text-3xl tracking-tight2 tabular-nums leading-none" style={{ color }}>
          {f.direction === 'flat' ? '~0%' : `${signed > 0 ? '+' : ''}${signed.toFixed(1)}%`}
        </span>
        <span className="text-[12px] text-ink-tertiary ml-1">expected</span>
      </div>

      {/* Probability of an up move */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] text-ink-tertiary mb-1">
          <span>{probUp}% chance up</span>
          <span>{100 - probUp}% down</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden flex" style={{ background: 'var(--hairline)' }}>
          <div style={{ width: `${probUp}%`, background: 'var(--forest)' }} />
          <div style={{ width: `${100 - probUp}%`, background: 'var(--brick)' }} />
        </div>
      </div>

      {/* Price range with current + base markers */}
      <div className="mt-4">
        <div className="relative h-1.5 rounded-full" style={{ background: 'var(--cream-tint)' }}>
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
            style={{ left: `calc(${pct(base)}% - 5px)`, background: color }}
            title={`Base $${fmtPrice(base)}`}
          />
          <div
            className="absolute -top-1 w-0.5 h-3.5"
            style={{ left: `${pct(current)}%`, background: 'var(--ink)' }}
            title={`Current $${fmtPrice(current)}`}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] tabular-nums text-ink-tertiary mt-1.5">
          <span>${fmtPrice(low)}</span>
          <span className="text-ink-secondary font-medium">base ${fmtPrice(base)}</span>
          <span>${fmtPrice(high)}</span>
        </div>
      </div>

      {/* Drivers */}
      {f.key_drivers?.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {f.key_drivers.slice(0, 3).map((d, i) => (
            <li key={i} className="flex gap-2 text-[12.5px] leading-snug text-ink-secondary">
              <span style={{ color }} className="flex-shrink-0">→</span>
              <span>{d}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Risks */}
      {f.key_risks?.length > 0 && (
        <div className="mt-2.5 pt-2.5 border-t border-hairline">
          {f.key_risks.slice(0, 2).map((r, i) => (
            <div key={i} className="flex gap-2 text-[12px] leading-snug text-ink-tertiary">
              <span className="flex-shrink-0">⚠</span>
              <span>{r}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ListTile({
  icon,
  title,
  items,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  tone: 'amber' | 'mute';
}) {
  const dot = tone === 'amber' ? 'var(--amber)' : 'var(--ink-tertiary)';
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--surface)' }}>
      <div className="flex items-center gap-1.5 mb-3">
        {icon}
        <span className="eyebrow">{title}</span>
      </div>
      <ul className="space-y-2">
        {items.slice(0, 6).map((it, i) => (
          <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-ink-secondary">
            <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: dot }} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
