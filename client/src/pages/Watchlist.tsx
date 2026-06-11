import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BarChart2,
  Star,
  TrendingDown,
  TrendingUp,
  X,
} from '../lib/icons';
import { motion } from 'framer-motion';
import { useWatchlist } from '../contexts/WatchlistContext';
import { research } from '../lib/api';
import type { QuickScan } from '../types';
import { fmtPct, fmtPrice } from '../lib/helpers';
import SentimentHeatmap from '../components/SentimentHeatmap';
import Sparkline from '../components/Sparkline';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

export default function WatchlistPage() {
  const { tickers, snaps, remove } = useWatchlist();
  const [scans, setScans] = useState<Record<string, QuickScan>>({});

  // Fetch quick-scan technicals for each ticker
  useEffect(() => {
    tickers.forEach((t) => {
      if (scans[t]) return;
      research.quick(t).then((d) => {
        setScans((prev) => ({ ...prev, [t]: d }));
      }).catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickers]);

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-10">
      <header className="mb-8 animate-fadeUp">
        <div className="flex items-center gap-2 mb-2">
          <Activity size={14} className="text-forest" />
          <span className="eyebrow">Watchlist</span>
        </div>
        <h1 className="font-serif text-4xl md:text-5xl tracking-tight2">Your tickers</h1>
        <p className="text-ink-secondary mt-2 text-[15px]">
          {tickers.length === 0
            ? 'Star tickers from a research report to pin them here.'
            : `${tickers.length} ${tickers.length === 1 ? 'ticker' : 'tickers'} · RSI, MACD, and trend at a glance.`}
        </p>
      </header>

      {tickers.length === 0 ? (
        <div className="card text-center animate-fadeUp animate-delay-1">
          <Star size={28} className="mx-auto mb-3 text-ink-tertiary" />
          <h3 className="font-serif text-2xl tracking-tight1 mb-2">Nothing here yet</h3>
          <p className="text-ink-secondary text-sm mb-5">
            Open a stock from the dashboard and click <strong>Save</strong> to add it.
          </p>
          <Link to="/dashboard" className="btn-primary inline-flex mx-auto">
            Go to dashboard <ArrowRight size={14} className="ml-1.5" />
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-4 animate-fadeUp animate-delay-1">
            <SentimentHeatmap />
          </div>

          {/* Column header row */}
          <div
            className="hidden md:grid gap-4 px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-tertiary mb-1 animate-fadeUp animate-delay-1"
            style={{ gridTemplateColumns: '2fr 100px 80px 1fr 80px 80px 60px 40px' }}
          >
            <span>Ticker</span>
            <span className="text-right">Price</span>
            <span className="text-right">Change</span>
            <span className="text-center">7-day</span>
            <span className="text-center">RSI</span>
            <span className="text-center">MACD</span>
            <span className="text-center">Trend</span>
            <span />
          </div>

          <div className="grid gap-3">
            {tickers.map((t, i) => {
              const snap = snaps[t];
              const q = snap?.quote;
              const scan = scans[t];
              const up = (q?.changePct ?? 0) >= 0;
              return (
                <motion.div
                  key={t}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE, delay: i * 0.06 }}
                >
                  <Link
                    to={`/dashboard?ticker=${t}`}
                    className="card flex md:grid items-center gap-4 hover:shadow-cardHover transition"
                    style={{ gridTemplateColumns: '2fr 100px 80px 1fr 80px 80px 60px 40px' }}
                  >
                    {/* Ticker + name */}
                    <div className="flex-1 min-w-0">
                      <div className="font-serif text-2xl tracking-tight1">{t}</div>
                      {q?.name && (
                        <div className="text-sm text-ink-secondary truncate mt-0.5">{q.name}</div>
                      )}
                    </div>

                    {/* Price */}
                    <div className="text-right min-w-[80px]">
                      {!q && !snap ? (
                        <div className="skel h-6 w-20 ml-auto" />
                      ) : q ? (
                        <div className="font-serif text-xl tabular-nums tracking-tight1">
                          ${fmtPrice(q.price)}
                        </div>
                      ) : (
                        <span className="text-ink-tertiary text-sm italic">no data</span>
                      )}
                    </div>

                    {/* Change */}
                    <div className="text-right">
                      {q ? (
                        <div
                          className={`text-sm font-medium flex items-center justify-end gap-1 ${
                            up ? 'text-forest' : 'text-brick'
                          }`}
                        >
                          {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                          {fmtPct(q.changePct)}
                        </div>
                      ) : (
                        <div className="skel h-4 w-14 ml-auto" />
                      )}
                    </div>

                    {/* Sparkline */}
                    <div className="hidden md:flex justify-center">
                      {snap?.spark?.length ? (
                        <Sparkline values={snap.spark} width={100} height={32} />
                      ) : (
                        <div className="skel w-[100px] h-[32px]" />
                      )}
                    </div>

                    {/* RSI */}
                    <div className="hidden md:flex justify-center">
                      <RsiBadge rsi={scan?.rsi ?? null} loading={!scan} />
                    </div>

                    {/* MACD */}
                    <div className="hidden md:flex justify-center">
                      <MacdBadge macd={scan?.macd?.histogram ?? null} loading={!scan} />
                    </div>

                    {/* Trend (SMA50 vs SMA200) */}
                    <div className="hidden md:flex justify-center">
                      <TrendBadge price={scan?.price ?? null} sma50={scan?.sma50 ?? null} sma200={scan?.sma200 ?? null} loading={!scan} />
                    </div>

                    {/* Remove */}
                    <div className="flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          remove(t);
                        }}
                        className="p-2 rounded-full text-ink-tertiary hover:text-brick hover:bg-cream-tint transition"
                        aria-label="Remove"
                        title="Remove from watchlist"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* Mobile technicals legend */}
          <div className="md:hidden mt-6 card animate-fadeUp">
            <p className="text-[12px] text-ink-secondary">
              Open a ticker's research report to see RSI, MACD, and trend analysis in the Technicals tab.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── RSI badge ──────────────────────────────────────────────────────────── */

function RsiBadge({ rsi, loading }: { rsi: number | null; loading: boolean }) {
  if (loading) return <div className="skel w-12 h-7 rounded-lg" />;
  if (rsi == null) return <span className="text-[11px] text-ink-tertiary">—</span>;

  const color =
    rsi >= 70
      ? 'var(--brick)'
      : rsi <= 30
      ? 'var(--forest)'
      : 'var(--amber)';
  const label = rsi >= 70 ? 'OB' : rsi <= 30 ? 'OS' : 'N';

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className="text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-md"
        style={{ color, background: `color-mix(in srgb, ${color} 12%, var(--cream-tint))` }}
      >
        {rsi.toFixed(0)}
      </div>
      <div className="text-[9px] text-ink-tertiary">{label}</div>
    </div>
  );
}

/* ─── MACD badge ─────────────────────────────────────────────────────────── */

function MacdBadge({ macd, loading }: { macd: number | null; loading: boolean }) {
  if (loading) return <div className="skel w-12 h-7 rounded-lg" />;
  if (macd == null) return <span className="text-[11px] text-ink-tertiary">—</span>;

  const bullish = macd > 0;
  const color = bullish ? 'var(--forest)' : 'var(--brick)';

  return (
    <div className="flex items-center gap-1">
      {bullish ? (
        <TrendingUp size={13} style={{ color }} />
      ) : (
        <TrendingDown size={13} style={{ color }} />
      )}
      <span className="text-[11px] font-medium" style={{ color }}>
        {bullish ? 'Bull' : 'Bear'}
      </span>
    </div>
  );
}

/* ─── Trend badge (price vs SMA50 vs SMA200) ─────────────────────────────── */

function TrendBadge({
  price,
  sma50,
  sma200,
  loading,
}: {
  price: number | null;
  sma50: number | null;
  sma200: number | null;
  loading: boolean;
}) {
  if (loading) return <div className="skel w-10 h-7 rounded-lg" />;
  if (!price || !sma50 || !sma200) return <span className="text-[11px] text-ink-tertiary">—</span>;

  const above50 = price > sma50;
  const above200 = price > sma200;

  if (above50 && above200) {
    return (
      <div className="flex items-center gap-0.5">
        <BarChart2 size={12} style={{ color: 'var(--forest)' }} />
        <span className="text-[10px] font-medium" style={{ color: 'var(--forest)' }}>Up</span>
      </div>
    );
  }
  if (!above50 && !above200) {
    return (
      <div className="flex items-center gap-0.5">
        <BarChart2 size={12} style={{ color: 'var(--brick)' }} />
        <span className="text-[10px] font-medium" style={{ color: 'var(--brick)' }}>Down</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-0.5">
      <BarChart2 size={12} style={{ color: 'var(--amber)' }} />
      <span className="text-[10px] font-medium" style={{ color: 'var(--amber)' }}>Mixed</span>
    </div>
  );
}
