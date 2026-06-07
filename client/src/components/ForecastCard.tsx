import { useEffect, useRef } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  GitBranch,
  Loader2,
  RotateCw,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { research } from '../lib/api';
import { useAiJob } from '../contexts/AiJobsContext';
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

const NOW_REFRESH_MS = 120_000; // auto-refresh the 1H forecast every 2 min

export default function ForecastCard({ data }: Props) {
  const ticker = data.ticker;

  // Two independent jobs: the live 1H (auto), and the longer horizons (on demand).
  const {
    status: nowStatus,
    data: nowData,
    error: nowError,
    refreshing: nowRefreshing,
    run: runNow,
  } = useAiJob<Forecast>('forecast-now', ticker);
  const {
    status: longStatus,
    data: longData,
    error: longError,
    run: runLong,
  } = useAiJob<Forecast>('forecast-long', ticker);

  const loadingNow = nowStatus === 'loading';
  const loadingLong = longStatus === 'loading';

  function generateNow(silent: boolean) {
    runNow(() => research.forecast(ticker, ['1H']).then((r) => r.forecast), { silent });
  }
  function generateLong() {
    runLong(() => research.forecast(ticker, ['1D', '3D', '1W']).then((r) => r.forecast));
  }

  // Auto-generate the 1H forecast as soon as the tab opens.
  useEffect(() => {
    if (nowStatus === 'idle') generateNow(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, nowStatus]);

  // Auto-refresh the 1H forecast on an interval (silently, keeping the last
  // value on screen). Skips while the market is closed.
  const sessionRef = useRef<string | undefined>(undefined);
  sessionRef.current = nowData?.market_session;
  useEffect(() => {
    const id = setInterval(() => {
      if (sessionRef.current === 'closed') return;
      runNow(() => research.forecast(ticker, ['1H']).then((r) => r.forecast), { silent: true });
    }, NOW_REFRESH_MS);
    return () => clearInterval(id);
  }, [ticker, runNow]);

  const nowForecast = nowData?.forecasts?.find((f) => f.horizon === '1H');
  const longForecasts = (longData?.forecasts || []).filter((f) => f.horizon !== '1H');

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
            The next-hour view updates on its own. Generate the day, 3-day, and week views when you
            want them — each weights the inputs that actually drive that timeframe. The model
            calibrates against its own track record for this ticker as more outcomes come in.
          </p>
        </div>
      </div>

      {/* ---- Live 1H section ---- */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
              style={{ background: 'color-mix(in srgb, var(--forest) 12%, transparent)', color: 'var(--forest)' }}>
              <Activity size={12} />
              Live · next hour
            </span>
            {nowData && (
              <span className="pill pill-mute text-[11px]">
                {SESSION_LABEL[nowData.market_session] || nowData.market_session}
              </span>
            )}
          </div>
          <span className="text-[11px] text-ink-tertiary flex items-center gap-1.5">
            {nowRefreshing || loadingNow ? (
              <>
                <Loader2 size={11} className="animate-spin" /> updating…
              </>
            ) : nowData ? (
              <>Auto-updates · {new Date(nowData.as_of).toLocaleTimeString()}</>
            ) : null}
          </span>
        </div>

        {!nowForecast && loadingNow && (
          <div className="flex items-center gap-3 text-ink-secondary text-sm rounded-2xl px-5 py-6" style={{ background: 'var(--surface)' }}>
            <Loader2 size={16} className="animate-spin text-forest flex-shrink-0" />
            Reading the tape and modeling the next hour…
          </div>
        )}
        {!nowForecast && !loadingNow && nowError && (
          <div className="flex items-start gap-2 text-brick text-sm rounded-2xl px-4 py-3"
            style={{ background: 'color-mix(in srgb, var(--brick) 10%, transparent)' }}>
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span className="whitespace-pre-wrap flex-1">{nowError}</span>
            <button onClick={() => generateNow(false)} className="text-brick underline hover:no-underline flex-shrink-0">Retry</button>
          </div>
        )}
        {nowForecast && nowData && (
          <HorizonTile f={nowForecast} current={nowData.current_price} />
        )}
      </div>

      {/* ---- On-demand longer horizons ---- */}
      <div className="hairline-divider mb-5" />
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <div className="eyebrow mb-0.5">Longer horizons</div>
          <p className="text-ink-secondary text-[13px]">Day, 3-day, and week — generated on request.</p>
        </div>
        {longData ? (
          <button onClick={generateLong} disabled={loadingLong} className="btn-ghost text-sm disabled:opacity-50 flex-shrink-0">
            {loadingLong ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <RotateCw size={14} className="mr-1.5" />}
            Refresh
          </button>
        ) : (
          <button onClick={generateLong} disabled={loadingLong} className="btn-primary text-sm disabled:opacity-60 flex-shrink-0">
            {loadingLong ? (
              <>
                <Loader2 size={14} className="animate-spin mr-1.5" /> Modeling…
              </>
            ) : (
              <>
                <Sparkles size={14} className="mr-1.5" /> Generate 1D · 3D · 1W
              </>
            )}
          </button>
        )}
      </div>

      {longError && !longData && (
        <div className="flex items-start gap-2 text-brick text-sm rounded-2xl px-4 py-3 mb-3"
          style={{ background: 'color-mix(in srgb, var(--brick) 10%, transparent)' }}>
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span className="whitespace-pre-wrap flex-1">{longError}</span>
          <button onClick={generateLong} className="text-brick underline hover:no-underline flex-shrink-0">Retry</button>
        </div>
      )}

      {longData && longForecasts.length > 0 && (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-3 gap-4">
            {longForecasts.map((f) => (
              <HorizonTile key={f.horizon} f={f} current={longData.current_price} />
            ))}
          </div>

          {longData.overall_thesis && (
            <div className="rounded-2xl p-5 leading-relaxed text-[15px]"
              style={{ background: 'color-mix(in srgb, var(--forest) 7%, var(--surface))' }}>
              <div className="eyebrow text-forest mb-2">Overall thesis</div>
              <p>{longData.overall_thesis}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {longData.conflicting_signals?.length > 0 && (
              <ListTile icon={<GitBranch size={12} className="text-amber" />} title="Conflicting signals" items={longData.conflicting_signals} tone="amber" />
            )}
            {longData.data_gaps?.length > 0 && (
              <ListTile icon={<AlertTriangle size={12} className="text-ink-tertiary" />} title="Data gaps" items={longData.data_gaps} tone="mute" />
            )}
          </div>
        </div>
      )}

      <p className="text-[11px] text-ink-tertiary mt-5 leading-relaxed">
        Model output, not investment advice. Short-horizon moves are near-random — confidence is kept
        honest and improves as the model accumulates a graded track record.
      </p>
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

      <div className="mt-4">
        <div className="relative h-1.5 rounded-full" style={{ background: 'var(--cream-tint)' }}>
          <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
            style={{ left: `calc(${pct(base)}% - 5px)`, background: color }} title={`Base $${fmtPrice(base)}`} />
          <div className="absolute -top-1 w-0.5 h-3.5" style={{ left: `${pct(current)}%`, background: 'var(--ink)' }} title={`Current $${fmtPrice(current)}`} />
        </div>
        <div className="flex items-center justify-between text-[11px] tabular-nums text-ink-tertiary mt-1.5">
          <span>${fmtPrice(low)}</span>
          <span className="text-ink-secondary font-medium">base ${fmtPrice(base)}</span>
          <span>${fmtPrice(high)}</span>
        </div>
      </div>

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
