import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellOff, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { alerts as alertsApi } from '../lib/api';
import type { PriceAlert } from '../types';
import { fmtDate, fmtPrice } from '../lib/helpers';
import { useWatchlist } from '../contexts/WatchlistContext';

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

  useEffect(() => {
    load();
  }, [load]);

  async function onCreated() {
    await load();
  }

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
          <Bell size={14} className="text-amber" />
          <span className="eyebrow">Alerts</span>
        </div>
        <h1 className="font-serif text-4xl md:text-5xl tracking-tight2">Price alerts</h1>
        <p className="text-ink-secondary mt-2 text-[15px]">
          Get notified when a ticker crosses a threshold. Server checks every 5 minutes.
        </p>
      </header>

      <CreateAlertCard onCreated={onCreated} />

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
  return (
    <div className={`card flex items-center gap-4 animate-fadeUp animate-delay-${Math.min(delay, 9)}`}>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0`}
        style={{
          background:
            a.triggeredAt
              ? 'color-mix(in srgb, var(--forest) 18%, var(--cream-tint))'
              : a.active
              ? 'color-mix(in srgb, var(--amber) 14%, var(--cream-tint))'
              : 'var(--cream-tint)',
          color: a.triggeredAt ? 'var(--forest)' : a.active ? 'var(--amber)' : 'var(--ink-tertiary)',
        }}
      >
        {a.triggeredAt ? <CheckCircle2 size={16} /> : <Bell size={16} />}
      </div>
      <Link to={`/dashboard?ticker=${a.ticker}`} className="flex-1 min-w-0">
        <div className="font-serif text-xl tracking-tight1">{a.ticker}</div>
        <div className="text-sm text-ink-secondary">
          {a.condition === 'above' ? '↑ above' : '↓ below'}{' '}
          <span className="font-medium text-ink tabular-nums">${fmtPrice(a.price)}</span>
        </div>
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
    </div>
  );
}

function CreateAlertCard({ onCreated }: { onCreated: () => void }) {
  const { tickers } = useWatchlist();
  const [ticker, setTicker] = useState(tickers[0] || '');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    const p = Number(price);
    if (!ticker || !Number.isFinite(p) || p <= 0) {
      setErr('Enter a ticker and a positive price.');
      return;
    }
    setBusy(true);
    try {
      await alertsApi.create(ticker.toUpperCase(), condition, p);
      setPrice('');
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
      <div className="grid sm:grid-cols-[1fr_auto_1fr_auto] gap-3 items-center">
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="TICKER"
          maxLength={10}
          className="px-4 py-3 rounded-2xl bg-cream-tint border border-transparent focus:border-ink-tertiary focus:bg-white transition text-[15px] uppercase tracking-tight1 font-medium"
        />
        <div className="inline-flex items-center bg-cream-tint rounded-full p-1 justify-self-start">
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
        <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">
          <Plus size={14} className="mr-1.5" /> Create
        </button>
      </div>
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
