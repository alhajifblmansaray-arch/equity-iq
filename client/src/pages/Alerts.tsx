import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  BarChart2,
  Bell,
  BellOff,
  CheckCircle2,
  ChevronDown,
  DollarSign,
  Plus,
  TrendingDown,
  TrendingUp,
  Trash2,
  Zap,
} from '../lib/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { alerts as alertsApi } from '../lib/api';
import type { AlertType, PriceAlert } from '../types';
import { fmtDate, fmtPrice } from '../lib/helpers';
import { useWatchlist } from '../contexts/WatchlistContext';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const ALERT_TYPES: Array<{
  id: AlertType;
  label: string;
  short: string;
  icon: React.ReactNode;
  color: string;
  desc: string;
}> = [
  {
    id: 'price',
    label: 'Price',
    short: 'Price',
    icon: <DollarSign size={14} />,
    color: 'var(--ink)',
    desc: 'Fires when price crosses a dollar threshold',
  },
  {
    id: 'rsi_above',
    label: 'RSI above',
    short: 'RSI ↑',
    icon: <Activity size={14} />,
    color: 'var(--brick)',
    desc: 'Fires when RSI-14 rises above your level (overbought)',
  },
  {
    id: 'rsi_below',
    label: 'RSI below',
    short: 'RSI ↓',
    icon: <Activity size={14} />,
    color: 'var(--forest)',
    desc: 'Fires when RSI-14 falls below your level (oversold)',
  },
  {
    id: 'macd_bullish',
    label: 'MACD bullish cross',
    short: 'MACD ↑',
    icon: <TrendingUp size={14} />,
    color: 'var(--forest)',
    desc: 'Fires when MACD histogram turns positive',
  },
  {
    id: 'macd_bearish',
    label: 'MACD bearish cross',
    short: 'MACD ↓',
    icon: <TrendingDown size={14} />,
    color: 'var(--brick)',
    desc: 'Fires when MACD histogram turns negative',
  },
  {
    id: 'vol_spike',
    label: 'Volume spike',
    short: 'Vol ×2',
    icon: <BarChart2 size={14} />,
    color: 'var(--amber)',
    desc: "Fires when today’s volume is ≥ 2× the 20-day average",
  },
];

const ALERT_TYPE_MAP = Object.fromEntries(ALERT_TYPES.map((t) => [t.id, t]));

export default function AlertsPage() {
  const [list, setList] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await alertsApi.list();
      setList(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not load alerts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function onDelete(id: string) {
    await alertsApi.remove(id);
    setList((prev) => prev.filter((a) => a.id !== id));
  }

  async function onToggle(id: string) {
    const a = await alertsApi.toggle(id);
    setList((prev) => prev.map((x) => (x.id === id ? a : x)));
  }

  const active = list.filter((a) => a.active);
  const triggered = list.filter((a) => !a.active && a.triggeredAt);
  const paused = list.filter((a) => !a.active && !a.triggeredAt);

  return (
    <div className="max-w-3xl mx-auto px-6 md:px-10 py-10">
      <header className="mb-8 animate-fadeUp">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={14} className="text-amber" />
          <span className="eyebrow">Alerts</span>
        </div>
        <h1 className="font-serif text-4xl md:text-5xl tracking-tight2">Smart alerts</h1>
        <p className="text-ink-secondary mt-2 text-[15px]">
          Price, RSI, MACD, and volume alerts. Checked every 5 minutes.
        </p>
      </header>

      <CreateAlertCard onCreated={load} />

      {error && (
        <div className="card mt-4 text-center text-brick text-sm">{error}</div>
      )}

      {triggered.length > 0 && (
        <Section title="Triggered" eyebrow="recently">
          {triggered.map((a, i) => (
            <Row key={a.id} a={a} delay={i + 1} onToggle={onToggle} onDelete={onDelete} />
          ))}
        </Section>
      )}

      <Section title="Active" eyebrow="watching">
        {loading && active.length === 0 ? (
          <div className="card"><div className="skel h-5 w-1/2 mb-2" /><div className="skel h-3 w-1/4" /></div>
        ) : active.length === 0 ? (
          <div className="card text-center">
            <BellOff size={26} className="mx-auto mb-3 text-ink-tertiary" />
            <p className="text-ink-secondary text-sm">No active alerts. Create one above.</p>
          </div>
        ) : (
          active.map((a, i) => (
            <Row key={a.id} a={a} delay={i + 1} onToggle={onToggle} onDelete={onDelete} />
          ))
        )}
      </Section>

      {paused.length > 0 && (
        <Section title="Paused" eyebrow="off">
          {paused.map((a, i) => (
            <Row key={a.id} a={a} delay={i + 1} onToggle={onToggle} onDelete={onDelete} />
          ))}
        </Section>
      )}
    </div>
  );
}

/* ─── Section wrapper ────────────────────────────────────────────────────── */

function Section({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-8 animate-fadeUp">
      <div className="eyebrow mb-2">{eyebrow}</div>
      <h2 className="font-serif text-2xl tracking-tight1 mb-3">{title}</h2>
      <div className="grid gap-3">{children}</div>
    </div>
  );
}

/* ─── Alert row ──────────────────────────────────────────────────────────── */

function alertLabel(a: PriceAlert): string {
  const type = a.alertType || 'price';
  if (type === 'price')
    return `${a.condition === 'above' ? '↑ above' : '↓ below'} $${fmtPrice(a.price)}`;
  if (type === 'rsi_above') return `RSI-14 ≥ ${a.threshold}`;
  if (type === 'rsi_below') return `RSI-14 ≤ ${a.threshold}`;
  if (type === 'macd_bullish') return 'MACD histogram turns positive';
  if (type === 'macd_bearish') return 'MACD histogram turns negative';
  if (type === 'vol_spike') return 'Volume ≥ 2× 20-day average';
  return type;
}

function Row({
  a,
  delay,
  onToggle,
  onDelete,
}: {
  a: PriceAlert;
  delay: number;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const type = ALERT_TYPE_MAP[a.alertType || 'price'];
  const iconBg = a.triggeredAt
    ? 'color-mix(in srgb, var(--forest) 18%, var(--cream-tint))'
    : a.active
    ? `color-mix(in srgb, ${type.color} 14%, var(--cream-tint))`
    : 'var(--cream-tint)';
  const iconColor = a.triggeredAt
    ? 'var(--forest)'
    : a.active
    ? type.color
    : 'var(--ink-tertiary)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay: delay * 0.06 }}
      className="card flex items-center gap-4"
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: iconBg, color: iconColor }}
      >
        {a.triggeredAt ? <CheckCircle2 size={16} /> : type.icon}
      </div>

      <Link to={`/dashboard?ticker=${a.ticker}`} className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-serif text-xl tracking-tight1">{a.ticker}</span>
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{
              background: `color-mix(in srgb, ${type.color} 12%, var(--cream-tint))`,
              color: type.color,
            }}
          >
            {type.short}
          </span>
        </div>
        <div className="text-sm text-ink-secondary mt-0.5">{alertLabel(a)}</div>
        <div className="text-[11px] text-ink-tertiary mt-0.5">
          {a.triggeredAt
            ? `Triggered ${fmtDate(a.triggeredAt)}`
            : `Created ${fmtDate(a.createdAt)}`}
        </div>
      </Link>

      <button
        onClick={() => onToggle(a.id)}
        className="text-xs font-medium px-3 py-1.5 rounded-full bg-cream-tint text-ink-secondary hover:text-ink hover:bg-white transition"
      >
        {a.active ? 'Pause' : 'Resume'}
      </button>
      <button
        onClick={() => onDelete(a.id)}
        className="text-ink-tertiary hover:text-brick p-2 rounded-full hover:bg-cream-tint transition"
        aria-label="Delete"
      >
        <Trash2 size={14} />
      </button>
    </motion.div>
  );
}

/* ─── Create form ────────────────────────────────────────────────────────── */

function CreateAlertCard({ onCreated }: { onCreated: () => void }) {
  const { tickers } = useWatchlist();
  const [ticker, setTicker] = useState(tickers[0] || '');
  const [alertType, setAlertType] = useState<AlertType>('price');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [price, setPrice] = useState('');
  const [threshold, setThreshold] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showTypes, setShowTypes] = useState(false);

  const selType = ALERT_TYPE_MAP[alertType];
  const needsPrice = alertType === 'price';
  const needsThreshold = alertType === 'rsi_above' || alertType === 'rsi_below';

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!ticker) { setErr('Enter a ticker.'); return; }
    if (needsPrice) {
      const p = Number(price);
      if (!Number.isFinite(p) || p <= 0) { setErr('Enter a positive price.'); return; }
    }
    if (needsThreshold) {
      const t = Number(threshold);
      if (!Number.isFinite(t) || t <= 0 || t > 100) { setErr('Enter an RSI threshold between 1 and 100.'); return; }
    }
    setBusy(true);
    try {
      await alertsApi.create({
        ticker: ticker.toUpperCase(),
        alertType,
        condition,
        price: needsPrice ? Number(price) : 0,
        threshold: needsThreshold ? Number(threshold) : 0,
      });
      setPrice('');
      setThreshold('');
      onCreated();
    } catch (e: any) {
      setErr(e?.response?.data?.error || 'Could not create alert.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card animate-fadeUp animate-delay-1">
      <div className="eyebrow mb-1">New alert</div>
      <h3 className="section-title mb-5">Notify me when…</h3>

      {/* Alert type selector */}
      <div className="mb-4">
        <div className="eyebrow mb-2">Alert type</div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTypes((s) => !s)}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl text-left transition"
            style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--panel-border)',
              boxShadow: 'var(--panel-shadow)',
            }}
          >
            <span style={{ color: selType.color }}>{selType.icon}</span>
            <span className="flex-1 text-[14px] font-medium">{selType.label}</span>
            <span className="text-[12px] text-ink-tertiary mr-2">{selType.desc}</span>
            <ChevronDown
              size={14}
              className="text-ink-tertiary transition-transform flex-shrink-0"
              style={{ transform: showTypes ? 'rotate(180deg)' : 'none' }}
            />
          </button>

          <AnimatePresence>
            {showTypes && (
              <motion.div
                initial={{ opacity: 0, y: -8, scaleY: 0.92 }}
                animate={{ opacity: 1, y: 0, scaleY: 1 }}
                exit={{ opacity: 0, y: -8, scaleY: 0.92 }}
                transition={{ duration: 0.2, ease: EASE }}
                style={{ transformOrigin: 'top' }}
                className="absolute z-20 w-full mt-1 rounded-2xl overflow-hidden"
                onClick={() => setShowTypes(false)}
              >
                <div
                  style={{
                    background: 'var(--glass-sidebar-bg)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid var(--glass-border)',
                    boxShadow: 'var(--glass-shadow)',
                  }}
                >
                  {ALERT_TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => { setAlertType(t.id); setShowTypes(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/30 transition ${
                        alertType === t.id ? 'bg-white/20' : ''
                      }`}
                    >
                      <span style={{ color: t.color }}>{t.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium">{t.label}</div>
                        <div className="text-[11px] text-ink-tertiary">{t.desc}</div>
                      </div>
                      {alertType === t.id && (
                        <span className="w-1.5 h-1.5 rounded-full bg-forest flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Ticker + condition + value row */}
      <div className="grid sm:grid-cols-[1fr_auto_1fr_auto] gap-3 items-start">
        <div>
          <div className="eyebrow mb-1.5">Ticker</div>
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="AAPL"
            maxLength={10}
            className="w-full px-4 py-3 rounded-2xl bg-cream-tint border border-transparent focus:border-ink-tertiary focus:bg-white transition text-[15px] uppercase tracking-tight1 font-medium"
          />
        </div>

        {alertType === 'price' && (
          <>
            <div>
              <div className="eyebrow mb-1.5">Direction</div>
              <div className="inline-flex items-center bg-cream-tint rounded-full p-1">
                {(['above', 'below'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCondition(c)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
                      condition === c ? 'bg-white text-ink shadow-pill' : 'text-ink-secondary'
                    }`}
                  >
                    {c === 'above' ? '↑ above' : '↓ below'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="eyebrow mb-1.5">Price</div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-tertiary text-[15px]">$</span>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full pl-7 pr-4 py-3 rounded-2xl bg-cream-tint border border-transparent focus:border-ink-tertiary focus:bg-white transition text-[15px] tabular-nums"
                />
              </div>
            </div>
          </>
        )}

        {needsThreshold && (
          <div className="sm:col-span-2">
            <div className="eyebrow mb-1.5">RSI threshold (1–100)</div>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder={alertType === 'rsi_above' ? '70' : '30'}
              step="1"
              min="1"
              max="100"
              className="w-full px-4 py-3 rounded-2xl bg-cream-tint border border-transparent focus:border-ink-tertiary focus:bg-white transition text-[15px] tabular-nums"
            />
          </div>
        )}

        <div className={needsThreshold ? '' : ''}>
          {(needsPrice || needsThreshold) && <div className="eyebrow mb-1.5 invisible">Go</div>}
          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50 w-full sm:w-auto">
            <Plus size={14} className="mr-1.5" /> Create
          </button>
        </div>
      </div>

      {/* No extra input needed for MACD / vol spike */}
      {!needsPrice && !needsThreshold && (
        <p className="text-[12px] text-ink-secondary mt-2">
          No threshold needed — this alert triggers automatically on {selType.desc.toLowerCase()}.
        </p>
      )}

      {err && <div className="text-brick text-xs mt-3">{err}</div>}

      {tickers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="eyebrow mr-1">From watchlist</span>
          {tickers.slice(0, 8).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTicker(t)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                ticker === t
                  ? 'border-ink bg-ink text-cream'
                  : 'border-hairline bg-white text-ink-secondary hover:bg-cream-tint hover:text-ink'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
