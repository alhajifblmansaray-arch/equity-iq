import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ForecastAccuracy } from '../types';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  GitBranch,
  Loader2,
  RotateCw,
  Sparkles,
  TrendingUp,
} from '../lib/icons';
import { Scale, Target } from '../lib/icons';
import { research } from '../lib/api';
import { useAiJob } from '../contexts/AiJobsContext';
import type {
  EdgeVsOptions,
  Forecast,
  ForecastConfidence,
  ForecastDirection,
  ForecastHorizon,
  HorizonForecast,
  ResearchReport,
  TradeAction,
  TradeRecommendation,
} from '../types';
import { fmtPrice } from '../lib/helpers';

interface Props {
  data: ResearchReport;
}

const HORIZONS: ForecastHorizon[] = ['1H', '1D', '3D', '1W'];

const TAB_LABEL: Record<ForecastHorizon, string> = {
  '1H': '1 hour',
  '1D': '1 day',
  '3D': '3 days',
  '1W': '1 week',
};

const HORIZON_LABEL: Record<ForecastHorizon, string> = {
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

const NOW_REFRESH_MS = 120_000;

/* ─── Accuracy badge (lazy fetch) ────────────────────────────────────────── */

function AccuracyBadge({ ticker }: { ticker: string }) {
  const [acc, setAcc] = useState<ForecastAccuracy | null>(null);

  useEffect(() => {
    research.forecastAccuracy(ticker).then(setAcc).catch(() => {});
  }, [ticker]);

  if (!acc || !acc.accuracy?.length) return null;

  const total = acc.accuracy.reduce((s, h) => s + h.n, 0);
  if (total === 0) return null;
  const avgRate =
    acc.accuracy.reduce((s, h) => s + h.directionHitRate * h.n, 0) / total;
  const pct = Math.round(avgRate * 100);
  const color = pct >= 60 ? 'var(--forest)' : pct >= 45 ? 'var(--amber)' : 'var(--brick)';

  return (
    <span
      className="pill text-[11px]"
      style={{
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        color,
        border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
      }}
      title={`Direction accuracy across ${total} graded forecasts`}
    >
      {pct}% accuracy · {total} graded
    </span>
  );
}

export default function ForecastCard({ data }: Props) {
  const ticker = data.ticker;
  const [sel, setSel] = useState<ForecastHorizon>('1H');

  const j1H = useAiJob<Forecast>('forecast-1H', ticker);
  const j1D = useAiJob<Forecast>('forecast-1D', ticker);
  const j3D = useAiJob<Forecast>('forecast-3D', ticker);
  const j1W = useAiJob<Forecast>('forecast-1W', ticker);
  const jobs: Record<ForecastHorizon, ReturnType<typeof useAiJob<Forecast>>> = {
    '1H': j1H, '1D': j1D, '3D': j3D, '1W': j1W,
  };

  function generate(h: ForecastHorizon, silent = false) {
    jobs[h].run(() => research.forecast(ticker, [h]).then((r) => r.forecast), silent ? { silent: true } : undefined);
  }
  function generateAll() {
    HORIZONS.forEach((h) => { if (jobs[h].status === 'idle') generate(h); });
  }

  useEffect(() => { setSel('1H'); }, [ticker]);

  useEffect(() => {
    if (j1H.status === 'idle') generate('1H');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, j1H.status]);

  useEffect(() => {
    if (sel !== '1H' && jobs[sel].status === 'idle') generate(sel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, ticker, jobs[sel].status]);

  const sessionRef = useRef<string | undefined>(undefined);
  sessionRef.current = j1H.data?.market_session;
  const run1H = j1H.run;
  useEffect(() => {
    const id = setInterval(() => {
      if (sessionRef.current === 'closed') return;
      run1H(() => research.forecast(ticker, ['1H']).then((r) => r.forecast), { silent: true });
    }, NOW_REFRESH_MS);
    return () => clearInterval(id);
  }, [ticker, run1H]);

  const allStarted = HORIZONS.every((h) => jobs[h].status !== 'idle');
  const anyDone = HORIZONS.some((h) => jobs[h].status === 'done');

  return (
    <div className="card animate-fadeUp">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={13} className="text-forest" />
            <span className="eyebrow text-forest">Forecast</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="section-title">Pick a horizon</h3>
            <AccuracyBadge ticker={ticker} />
          </div>
          <p className="text-ink-secondary text-[14px] mt-2 max-w-2xl leading-relaxed">
            The 1-hour view is live and auto-refreshes. Tap any other horizon to model it — each
            weighs inputs specific to that timeframe. Confidence is calibrated against the model's
            own track record for this ticker.
          </p>
        </div>
        {!allStarted && (
          <button onClick={generateAll} className="btn-ghost text-sm flex-shrink-0">
            <Sparkles size={14} /> Generate all
          </button>
        )}
      </div>

      {/* All-horizons at a glance — appears once any forecast loads */}
      {anyDone && <HorizonsGlance jobs={jobs} onSelect={setSel} selected={sel} />}

      {/* Horizon sub-tabs */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto no-scrollbar mt-5">
        {HORIZONS.map((h) => {
          const job = jobs[h];
          const isSel = sel === h;
          return (
            <button
              key={h}
              onClick={() => setSel(h)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium transition flex-shrink-0 border ${
                isSel ? 'text-ink' : 'text-ink-secondary hover:text-ink'
              }`}
              style={
                isSel
                  ? {
                      background: 'var(--panel-bg)',
                      borderColor: 'var(--panel-border)',
                      boxShadow: 'var(--panel-shadow)',
                    }
                  : { borderColor: 'transparent' }
              }
            >
              {h === '1H' && <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulseDot" />}
              {TAB_LABEL[h]}
              {job.status === 'loading' && <Loader2 size={11} className="animate-spin text-forest" />}
              {job.status === 'done' && !isSel && (
                <span className="w-1.5 h-1.5 rounded-full bg-forest" title="Ready" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected horizon panel — animated on tab switch */}
      <AnimatePresence mode="wait">
        <motion.div
          key={sel}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          <HorizonPanel
            horizon={sel}
            job={jobs[sel]}
            onRetry={() => generate(sel)}
            onRefresh={() => generate(sel, sel === '1H')}
          />
        </motion.div>
      </AnimatePresence>

      <p className="text-[11px] text-ink-tertiary mt-5 leading-relaxed">
        Model output, not investment advice. Short-horizon moves are near-random — confidence is
        kept honest and improves as the model accumulates a graded track record.
      </p>
    </div>
  );
}

/* ─── Horizons at a glance ──────────────────────────────────────────────── */

function HorizonsGlance({
  jobs,
  onSelect,
  selected,
}: {
  jobs: Record<ForecastHorizon, ReturnType<typeof useAiJob<Forecast>>>;
  onSelect: (h: ForecastHorizon) => void;
  selected: ForecastHorizon;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--panel-border)',
        boxShadow: 'var(--panel-shadow)',
      }}
    >
      <div className="eyebrow mb-3">All horizons</div>
      <div className="grid grid-cols-4 gap-2">
        {HORIZONS.map((h) => {
          const job = jobs[h];
          const fc = job.data;
          const single = fc?.forecasts?.find((f) => f.horizon === h);
          const isSelected = selected === h;
          const color = single ? colorFor(single.direction) : 'var(--ink-tertiary)';
          const signed = single?.expected_move_pct ?? 0;
          const probUp = single ? Math.round((single.probability_up ?? 0.5) * 100) : 50;

          return (
            <button
              key={h}
              onClick={() => onSelect(h)}
              className="rounded-xl p-3 text-left transition"
              style={{
                background: isSelected
                  ? `color-mix(in srgb, ${color} 8%, var(--cream-tint))`
                  : 'transparent',
                border: `1px solid ${isSelected ? color : 'transparent'}`,
                opacity: job.status === 'idle' ? 0.5 : 1,
              }}
            >
              <div className="flex items-center gap-1 mb-1.5">
                {h === '1H' && (
                  <span className="w-1 h-1 rounded-full bg-forest animate-pulseDot" />
                )}
                <span className="eyebrow text-[10px]">{TAB_LABEL[h]}</span>
                {job.status === 'loading' && (
                  <Loader2 size={9} className="animate-spin text-forest ml-auto" />
                )}
              </div>

              {single ? (
                <>
                  <div
                    className="font-serif text-xl tabular-nums leading-none font-medium"
                    style={{ color, letterSpacing: '-0.02em' }}
                  >
                    {single.direction === 'flat'
                      ? '~0%'
                      : `${signed > 0 ? '+' : ''}${signed.toFixed(1)}%`}
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--hairline)' }}>
                      <div style={{ width: `${probUp}%`, background: 'var(--forest)', height: '100%' }} />
                    </div>
                    <span className="text-[10px] text-ink-tertiary tabular-nums">{probUp}%↑</span>
                  </div>
                  <div className="mt-1">
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                      style={{
                        background: `color-mix(in srgb, ${color} 12%, transparent)`,
                        color,
                      }}
                    >
                      {single.confidence}
                    </span>
                  </div>
                </>
              ) : job.status === 'loading' ? (
                <div className="mt-2 space-y-1.5">
                  <div className="h-4 rounded skel" />
                  <div className="h-2.5 w-3/4 rounded skel" />
                </div>
              ) : (
                <div className="text-[11px] text-ink-tertiary mt-1.5">Tap to model</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Selected-horizon panel ─────────────────────────────────────────────── */

function HorizonPanel({
  horizon,
  job,
  onRetry,
  onRefresh,
}: {
  horizon: ForecastHorizon;
  job: ReturnType<typeof useAiJob<Forecast>>;
  onRetry: () => void;
  onRefresh: () => void;
}) {
  const [showReasoning, setShowReasoning] = useState(false);
  const fc = job.data;
  const single = fc?.forecasts?.find((f) => f.horizon === horizon);
  const isLive = horizon === '1H';

  if (!single && job.status === 'loading') {
    return (
      <div
        className="flex items-center gap-3 text-ink-secondary text-sm rounded-2xl px-5 py-6"
        style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
      >
        <Loader2 size={16} className="animate-spin text-forest flex-shrink-0" />
        {isLive
          ? 'Reading the tape and modeling the next hour…'
          : `Modeling the ${HORIZON_LABEL[horizon].toLowerCase()} view…`}
      </div>
    );
  }

  if (!single && job.error) {
    return (
      <div
        className="flex items-start gap-2 text-brick text-sm rounded-2xl px-4 py-3"
        style={{ background: 'color-mix(in srgb, var(--brick) 10%, transparent)' }}
      >
        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
        <span className="whitespace-pre-wrap flex-1">{job.error}</span>
        <button onClick={onRetry} className="text-brick underline hover:no-underline flex-shrink-0">
          Retry
        </button>
      </div>
    );
  }

  if (!single || !fc) {
    return (
      <div
        className="rounded-2xl px-5 py-6 text-sm text-ink-secondary"
        style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
      >
        Tap <strong>{TAB_LABEL[horizon]}</strong> to model this horizon.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Meta row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-[12px]">
          <span className="pill pill-mute">{SESSION_LABEL[fc.market_session] || fc.market_session}</span>
          <span className="text-ink-tertiary">Current ${fmtPrice(fc.current_price)}</span>
        </div>
        <div className="text-[11px] text-ink-tertiary flex items-center gap-1.5">
          {job.refreshing || job.status === 'loading' ? (
            <><Loader2 size={11} className="animate-spin" /> updating…</>
          ) : isLive ? (
            <>Auto-updates · {new Date(fc.as_of).toLocaleTimeString()}</>
          ) : (
            <button onClick={onRefresh} className="inline-flex items-center gap-1 hover:text-ink transition">
              <RotateCw size={11} /> Refresh
            </button>
          )}
        </div>
      </div>

      {/* Verdict strip */}
      <VerdictStrip f={single} />

      {/* Main detail panel — confidence gauge + data */}
      <HorizonDetail f={single} current={fc.current_price} />

      {/* Reasoning toggle */}
      <div>
        <button
          onClick={() => setShowReasoning((s) => !s)}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary hover:text-ink transition"
        >
          {showReasoning ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          {showReasoning ? 'Hide reasoning' : 'Show reasoning'}
        </button>

        <AnimatePresence>
          {showReasoning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="space-y-4 mt-4">
                {fc.overall_thesis && (
                  <div
                    className="rounded-2xl p-5 leading-relaxed text-[15px]"
                    style={{ background: 'color-mix(in srgb, var(--forest) 7%, var(--panel-bg))' }}
                  >
                    <div className="eyebrow text-forest mb-2">Read</div>
                    <p>{fc.overall_thesis}</p>
                  </div>
                )}

                {single.key_drivers?.length > 0 && (
                  <ListTile
                    icon={<TrendingUp size={12} className="text-forest" />}
                    title="What's driving it"
                    items={single.key_drivers}
                    tone="forest"
                  />
                )}
                {single.key_risks?.length > 0 && (
                  <ListTile
                    icon={<AlertTriangle size={12} className="text-brick" />}
                    title="What could break it"
                    items={single.key_risks}
                    tone="brick"
                  />
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  {fc.conflicting_signals?.length > 0 && (
                    <ListTile
                      icon={<GitBranch size={12} className="text-amber" />}
                      title="Conflicting signals"
                      items={fc.conflicting_signals}
                      tone="amber"
                    />
                  )}
                  {fc.data_gaps?.length > 0 && (
                    <ListTile
                      icon={<AlertTriangle size={12} className="text-ink-tertiary" />}
                      title="Data gaps"
                      items={fc.data_gaps}
                      tone="mute"
                    />
                  )}
                </div>

                {fc.calibration_note && (
                  <div className="flex gap-2 text-[12.5px] text-ink-tertiary leading-relaxed px-1">
                    <span className="flex-shrink-0">↺</span>
                    <span>
                      <span className="font-medium text-ink-secondary">Calibrated from track record:</span>{' '}
                      {fc.calibration_note}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── Verdict strip ──────────────────────────────────────────────────────── */

function VerdictStrip({ f }: { f: HorizonForecast }) {
  const color = colorFor(f.direction);
  const signed = f.expected_move_pct ?? 0;
  const probUp = Math.round((f.probability_up ?? 0.5) * 100);
  const action = f.trade_recommendation?.action;
  const actionLabel = action ? ACTION_LABEL[action] : null;
  const tradeColor = action ? actionColor(action) : 'var(--ink-tertiary)';
  return (
    <div
      className="rounded-2xl px-5 py-4 flex flex-wrap items-center gap-x-3 gap-y-1"
      style={{ background: `color-mix(in srgb, ${color} 9%, var(--panel-bg))`, border: '1px solid var(--panel-border)' }}
    >
      <span style={{ color }} className="flex items-center">{arrowFor(f.direction)}</span>
      <span
        className="font-serif text-2xl tabular-nums leading-none"
        style={{ color, letterSpacing: '-0.02em' }}
      >
        {f.direction === 'flat' ? '~0%' : `${signed > 0 ? '+' : ''}${signed.toFixed(1)}%`}
      </span>
      <span className="text-ink-secondary text-[14px]">{probUp}% up</span>
      <span className="text-ink-tertiary">·</span>
      <span className={`pill ${CONF_PILL[f.confidence]} text-[11px]`}>{f.confidence} confidence</span>
      {actionLabel && (
        <span
          className="pill text-[11px] ml-auto"
          style={{
            background: `color-mix(in srgb, ${tradeColor} 14%, transparent)`,
            color: tradeColor,
            border: `1px solid color-mix(in srgb, ${tradeColor} 25%, transparent)`,
          }}
        >
          {actionLabel}
        </span>
      )}
    </div>
  );
}

/* ─── Main detail panel (like TechnicalsCard in structure) ───────────────── */

function HorizonDetail({ f, current }: { f: HorizonForecast; current: number }) {
  const color = colorFor(f.direction);
  const probUp = Math.round((f.probability_up ?? 0.5) * 100);
  const signed = f.expected_move_pct ?? 0;
  const { low, base, high } = f.price_range || { low: current, base: current, high: current };
  const span = Math.max(high - low, 1e-6);
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - low) / span) * 100));

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
    >
      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* Left: confidence gauge */}
        <ConfidenceGauge confidence={f.confidence} direction={f.direction} probUp={probUp} />

        {/* Right: move + price range + edge */}
        <div className="space-y-5">
          {/* Expected move */}
          <div>
            <div className="eyebrow mb-2">Expected move</div>
            <div className="flex items-baseline gap-2">
              <span style={{ color }} className="flex items-center">{arrowFor(f.direction)}</span>
              <span
                className="font-serif text-4xl tabular-nums leading-none"
                style={{ color, letterSpacing: '-0.025em' }}
              >
                {f.direction === 'flat' ? '~0%' : `${signed > 0 ? '+' : ''}${signed.toFixed(1)}%`}
              </span>
              <span className="text-[12px] text-ink-tertiary">expected</span>
            </div>
            {f.expected_move_basis && (
              <div className="text-[11.5px] text-ink-tertiary mt-1.5 leading-relaxed">
                {f.expected_move_basis}
              </div>
            )}
          </div>

          {/* Price range slider */}
          <div>
            <div className="eyebrow mb-2">Price range</div>
            <div className="relative h-2 rounded-full" style={{ background: 'var(--hairline)' }}>
              {/* Range fill */}
              <div
                className="absolute top-0 bottom-0 rounded-full opacity-30"
                style={{
                  left: `${pct(low)}%`,
                  right: `${100 - pct(high)}%`,
                  background: color,
                }}
              />
              {/* Base dot */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white"
                style={{ left: `calc(${pct(base)}% - 6px)`, background: color }}
                title={`Base $${fmtPrice(base)}`}
              />
              {/* Current price tick */}
              <div
                className="absolute -top-1 w-0.5 h-4 rounded-full"
                style={{ left: `${pct(current)}%`, background: 'var(--ink)' }}
                title={`Current $${fmtPrice(current)}`}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] tabular-nums text-ink-tertiary mt-2">
              <span>${fmtPrice(low)}</span>
              <span className="text-ink-secondary font-medium">base ${fmtPrice(base)}</span>
              <span>${fmtPrice(high)}</span>
            </div>
          </div>

          {/* Options edge */}
          {(f.edge_vs_options || f.implied_move_pct != null) && (
            <EdgeRow expected={signed} implied={f.implied_move_pct ?? null} edge={f.edge_vs_options} />
          )}
        </div>
      </div>

      {/* Trade recommendation spans full width */}
      {f.trade_recommendation && (
        <div className="mt-5 pt-5 border-t border-hairline">
          <TradeRecBlock rec={f.trade_recommendation} />
        </div>
      )}
    </div>
  );
}

/* ─── Confidence gauge (mirrors RSI gauge from TechnicalsCard) ───────────── */

function ConfidenceGauge({
  confidence,
  direction,
  probUp,
}: {
  confidence: ForecastConfidence;
  direction: ForecastDirection;
  probUp: number;
}) {
  const confScore = confidence === 'high' ? 82 : confidence === 'medium' ? 50 : 18;
  const clamped = Math.max(0, Math.min(100, confScore));
  const angle = (clamped / 100) * 180;
  const rad = ((180 - angle) * Math.PI) / 180;
  const cx = 90; const cy = 90; const r = 68;
  const nx = cx + r * Math.cos(rad);
  const ny = cy - r * Math.sin(rad);
  const startX = cx - r; const startY = cy;
  const largeArc = angle > 180 ? 1 : 0;
  const arcPath = `M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${nx} ${ny}`;
  const trackPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  const confColor =
    confidence === 'high'
      ? 'var(--forest)'
      : confidence === 'medium'
      ? 'var(--amber)'
      : 'var(--brick)';
  const confLabel = confidence === 'high' ? 'High' : confidence === 'medium' ? 'Medium' : 'Low';
  const pillClass = CONF_PILL[confidence];

  return (
    <div>
      <div className="eyebrow mb-3">Confidence & probability</div>
      <div className="flex items-center gap-5">
        <svg width="180" height="106" viewBox="0 0 180 106" className="flex-shrink-0">
          {/* Zone coloring */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r * Math.cos((2 * Math.PI) / 3)} ${cy - r * Math.sin((2 * Math.PI) / 3)}`}
            stroke="rgba(192,78,64,0.20)" strokeWidth="10" fill="none" strokeLinecap="round"
          />
          <path
            d={`M ${cx + r * Math.cos((2 * Math.PI) / 3)} ${cy - r * Math.sin((2 * Math.PI) / 3)} A ${r} ${r} 0 0 1 ${cx + r * Math.cos(Math.PI / 3)} ${cy - r * Math.sin(Math.PI / 3)}`}
            stroke="rgba(184,133,58,0.22)" strokeWidth="10" fill="none" strokeLinecap="round"
          />
          <path
            d={`M ${cx + r * Math.cos(Math.PI / 3)} ${cy - r * Math.sin(Math.PI / 3)} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            stroke="rgba(46,93,67,0.20)" strokeWidth="10" fill="none" strokeLinecap="round"
          />
          {/* Track */}
          <path d={trackPath} stroke="var(--hairline)" strokeWidth="10" fill="none" strokeLinecap="round" />
          {/* Value arc */}
          <path d={arcPath} stroke={confColor} strokeWidth="10" fill="none" strokeLinecap="round" />
          {/* Needle dot */}
          <circle cx={nx} cy={ny} r="6" fill={confColor} />
          <circle cx={nx} cy={ny} r="3" fill="var(--panel-bg)" />
          {/* Center label */}
          <text x="90" y="80" textAnchor="middle" fontFamily="DM Serif Display" fontSize="28" fill="var(--ink)">
            {probUp}%
          </text>
          <text x="90" y="96" textAnchor="middle" fontFamily="DM Sans" fontSize="10" fill="var(--ink-tertiary)" letterSpacing="0">
            prob up
          </text>
        </svg>
        <div className="space-y-2.5">
          <span className={`pill ${pillClass} text-[11px]`}>{confLabel} confidence</span>
          <p className="text-[12px] text-ink-tertiary leading-relaxed max-w-[140px]">
            {confidence === 'high'
              ? 'Signals align strongly in one direction.'
              : confidence === 'medium'
              ? 'Some disagreement across signals.'
              : 'High uncertainty — signals conflict.'}
          </p>
          {/* Probability bar */}
          <div>
            <div className="flex justify-between text-[10px] text-ink-tertiary mb-1">
              <span>{probUp}% up</span>
              <span>{100 - probUp}% down</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden flex" style={{ background: 'var(--hairline)' }}>
              <div style={{ width: `${probUp}%`, background: 'var(--forest)' }} />
              <div style={{ width: `${100 - probUp}%`, background: 'var(--brick)' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Shared helpers ─────────────────────────────────────────────────────── */

function colorFor(d: ForecastDirection) {
  return d === 'up' ? 'var(--forest)' : d === 'down' ? 'var(--brick)' : 'var(--ink-tertiary)';
}
function arrowFor(d: ForecastDirection) {
  return d === 'up'
    ? <ArrowUpRight size={16} />
    : d === 'down'
    ? <ArrowDownRight size={16} />
    : <ArrowRight size={16} />;
}

const CONF_PILL: Record<ForecastConfidence, string> = {
  low: 'pill-brick',
  medium: 'pill-amber',
  high: 'pill-forest',
};

const EDGE_LABEL: Record<EdgeVsOptions, string> = {
  positive: 'Edge: positive',
  negative: 'Edge: negative',
  none: 'Edge: none',
  unknown: 'Edge: unknown',
};
function edgeColor(e?: EdgeVsOptions) {
  return e === 'positive'
    ? 'var(--forest)'
    : e === 'negative'
    ? 'var(--brick)'
    : 'var(--ink-tertiary)';
}

function EdgeRow({
  expected,
  implied,
  edge,
}: {
  expected: number;
  implied: number | null;
  edge?: EdgeVsOptions;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Scale size={12} className="text-ink-tertiary" />
        <span className="eyebrow">Vs options market</span>
      </div>
      <div className="flex items-center gap-4 text-[12.5px]">
        <div>
          <div className="text-ink-tertiary text-[11px]">Your move</div>
          <div className="tabular-nums font-semibold">{Math.abs(expected).toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-ink-tertiary text-[11px]">Priced in</div>
          <div className="tabular-nums font-semibold">
            {implied == null ? 'n/a' : `±${Math.abs(implied).toFixed(1)}%`}
          </div>
        </div>
        <span
          className="ml-auto pill text-[11px]"
          style={{
            background: `color-mix(in srgb, ${edgeColor(edge)} 14%, transparent)`,
            color: edgeColor(edge),
            border: `1px solid color-mix(in srgb, ${edgeColor(edge)} 25%, transparent)`,
          }}
        >
          {edge ? EDGE_LABEL[edge] : 'Edge: unknown'}
        </span>
      </div>
    </div>
  );
}

const ACTION_LABEL: Record<TradeAction, string> = {
  long_call: 'Long call',
  long_put: 'Long put',
  call_debit_spread: 'Call debit spread',
  put_debit_spread: 'Put debit spread',
  sell_premium: 'Sell premium',
  no_trade: 'No trade',
};
function actionColor(a: TradeAction) {
  if (a === 'long_call' || a === 'call_debit_spread') return 'var(--forest)';
  if (a === 'long_put' || a === 'put_debit_spread') return 'var(--brick)';
  if (a === 'sell_premium') return 'var(--amber)';
  return 'var(--ink-tertiary)';
}

function TradeRecBlock({ rec }: { rec: TradeRecommendation }) {
  const c = actionColor(rec.action);
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: `color-mix(in srgb, ${c} 8%, var(--cream-tint))` }}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <Target size={13} style={{ color: c }} />
          <span className="text-[13px] font-semibold" style={{ color: c, letterSpacing: '-0.013em' }}>
            {ACTION_LABEL[rec.action]}
          </span>
        </div>
        <span className="pill pill-mute text-[10px]">{rec.conviction} conviction</span>
      </div>
      {rec.structure_note && (
        <p className="text-[12.5px] text-ink-secondary leading-relaxed">{rec.structure_note}</p>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11.5px] text-ink-tertiary">
        {rec.suggested_expiry && rec.action !== 'no_trade' && (
          <span>Expiry: <span className="text-ink-secondary">{rec.suggested_expiry}</span></span>
        )}
        {rec.action !== 'no_trade' && rec.max_risk_budget_pct != null && (
          <span>Max risk: <span className="text-ink-secondary">{rec.max_risk_budget_pct}%</span> of options budget</span>
        )}
        {rec.breakeven_vs_target && rec.action !== 'no_trade' && (
          <span>{rec.breakeven_vs_target}</span>
        )}
      </div>
      {rec.reason && (
        <p className="text-[12px] text-ink-secondary leading-relaxed mt-2">{rec.reason}</p>
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
  tone: 'amber' | 'mute' | 'forest' | 'brick';
}) {
  const dotMap: Record<string, string> = {
    amber: 'var(--amber)',
    mute: 'var(--ink-tertiary)',
    forest: 'var(--forest)',
    brick: 'var(--brick)',
  };
  const dot = dotMap[tone] || 'var(--ink-tertiary)';
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
    >
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
