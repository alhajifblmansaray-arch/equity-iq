import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart2,
  Brain,
  Lock,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Zap,
} from '../lib/icons';
import Logo from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';

const SAMPLE_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'SOFI', 'IONQ', 'PLTR', 'MSFT', 'AMZN'];

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, ease: EASE, delay },
});

export default function Landing() {
  // Set when a signed-out visitor was bounced here from a protected page.
  const from = (useLocation().state as { from?: string } | null)?.from;
  const authState = from ? { from } : undefined;
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30"
        style={{
          background: 'var(--glass-sidebar-sheen), var(--glass-sidebar-bg)',
          backdropFilter: 'blur(28px) saturate(190%)',
          WebkitBackdropFilter: 'blur(28px) saturate(190%)',
          borderBottom: '1px solid var(--glass-border)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.40)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <Logo size="md" />
          <nav className="flex items-center gap-2">
            {user ? (
              <Link to="/dashboard" className="btn-forest">
                Open dashboard <ArrowRight size={15} />
              </Link>
            ) : (
              <>
                <Link to="/login" state={authState} className="btn-ghost">Log in</Link>
                <Link to="/signup" state={authState} className="btn-primary">Create account</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pt-16 md:pt-28 pb-12">
        <div className="grid md:grid-cols-[1fr_420px] gap-12 md:gap-20 items-center">

          {/* Left: copy */}
          <div>
            <motion.div {...fade(0)}>
              <span className="pill pill-forest mb-6 inline-flex">
                <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulseDot" />
                Live market data · Free forever
              </span>
            </motion.div>

            <motion.h1
              {...fade(0.06)}
              className="font-serif leading-[1.02] text-ink"
              style={{
                fontSize: 'clamp(48px, 7vw, 88px)',
                letterSpacing: '-0.030em',
              }}
            >
              Institutional<br />equity research.
            </motion.h1>

            <motion.p
              {...fade(0.12)}
              className="mt-5 text-lg md:text-xl text-ink-secondary leading-relaxed max-w-lg"
            >
              Type a ticker, get the full picture — snapshot, technicals, fundamentals, sentiment,
              and a scored verdict. Clean numbers. No noise.
            </motion.p>

            <motion.div {...fade(0.18)} className="mt-8 flex flex-wrap gap-3">
              {user ? (
                <Link to="/dashboard" className="btn-forest text-base px-6 py-3">
                  Open dashboard <ArrowRight size={17} />
                </Link>
              ) : (
                <>
                  <Link to="/signup" state={authState} className="btn-forest text-base px-6 py-3">
                    Get started — free <ArrowRight size={17} />
                  </Link>
                  <Link to="/login" state={authState} className="btn-ghost text-base px-6 py-3">
                    Log in
                  </Link>
                </>
              )}
            </motion.div>

            {/* Ticker quick-picks */}
            <motion.div {...fade(0.24)} className="mt-8">
              <div className="eyebrow mb-3">Try a ticker</div>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_TICKERS.map((t) => (
                  <button
                    key={t}
                    onClick={() => navigate(user ? `/dashboard?ticker=${t}` : '/signup')}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-sm font-medium transition"
                    style={{
                      background: 'var(--panel-bg)',
                      border: '1px solid var(--panel-border)',
                      boxShadow: 'var(--panel-shadow)',
                      color: 'var(--ink-secondary)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-secondary)';
                    }}
                  >
                    {t}
                    <ChevronRight size={12} className="text-ink-tertiary" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right: product preview card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.14 }}
            className="hidden md:block"
          >
            <motion.div
              animate={{ y: [0, -9, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <AppPreviewCard />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Provider trust strip ──────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pb-10">
        <motion.div {...fade(0.30)} className="flex items-center gap-3 flex-wrap">
          <span className="eyebrow">Data from</span>
          {['Polygon.io', 'Finnhub', 'Alpha Vantage', 'Yahoo Finance'].map((p) => (
            <span
              key={p}
              className="px-3 py-1 rounded-full text-xs font-medium text-ink-secondary"
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--panel-border)',
              }}
            >
              {p}
            </span>
          ))}
          <span className="text-ink-tertiary text-xs">· automatic fallback</span>
        </motion.div>
      </section>

      {/* ── Feature grid ─────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pb-16">
        <motion.div {...fade(0.20)} className="mb-8">
          <div className="eyebrow mb-2">What you get</div>
          <h2 className="font-serif text-3xl md:text-4xl text-ink" style={{ letterSpacing: '-0.020em' }}>
            Research, not noise.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: EASE, delay: 0.24 + i * 0.08 }}
              className="card group"
            >
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5"
                style={{
                  background: `color-mix(in srgb, ${f.color} 12%, var(--cream-tint))`,
                  border: `1px solid color-mix(in srgb, ${f.color} 20%, var(--hairline))`,
                }}
              >
                <span style={{ color: f.color }}>{f.icon}</span>
              </div>
              <div className="eyebrow mb-2" style={{ color: f.color }}>
                {f.eyebrow}
              </div>
              <h3 className="font-serif text-xl mb-2" style={{ letterSpacing: '-0.016em' }}>
                {f.title}
              </h3>
              <p className="text-ink-secondary leading-relaxed text-[14px]">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pb-20">
        <div className="card">
          <motion.div {...fade(0.10)}>
            <div className="eyebrow mb-3">How it works</div>
            <h2 className="font-serif text-2xl md:text-3xl mb-10" style={{ letterSpacing: '-0.018em' }}>
              Three steps, full picture.
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {HOW_STEPS.map((s, i) => (
              <div key={s.title} className="relative">
                {i < HOW_STEPS.length - 1 && (
                  <div
                    className="hidden md:block absolute top-5 left-full w-8 h-px"
                    style={{ background: 'var(--hairline)' }}
                  />
                )}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-semibold mb-4"
                  style={{
                    background: 'var(--forest)',
                    color: '#fff',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3 className="font-serif text-lg mb-1.5" style={{ letterSpacing: '-0.015em' }}>
                  {s.title}
                </h3>
                <p className="text-ink-secondary text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid var(--hairline)' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-10 flex flex-wrap items-center justify-between gap-4 text-sm text-ink-tertiary">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span>· Research, not advice.</span>
          </div>
          <span>© {new Date().getFullYear()} EquityIQ.</span>
        </div>
      </footer>
    </div>
  );
}

/* ─── App preview card ───────────────────────────────────────────────────── */

function AppPreviewCard() {
  return (
    <div className="card" style={{ maxWidth: 400 }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="eyebrow mb-1">NVDA · NVIDIA Corp</div>
          <div
            className="font-serif leading-none"
            style={{ fontSize: 42, letterSpacing: '-0.028em' }}
          >
            $875.40
          </div>
        </div>
        <span className="pill pill-forest text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulseDot" />
          Live
        </span>
      </div>

      {/* Change */}
      <div className="flex items-center gap-1.5 text-forest text-sm font-semibold mb-4">
        <TrendingUp size={14} />
        <span>+$18.20 (2.12%)</span>
        <span className="text-ink-tertiary font-normal">vs prev close</span>
      </div>

      {/* Mini chart */}
      <div
        className="rounded-xl overflow-hidden mb-4"
        style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', padding: '12px 12px 6px' }}
      >
        <svg viewBox="0 0 280 70" className="w-full" style={{ height: 64 }}>
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--forest)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--forest)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,55 C15,52 28,58 45,44 C62,30 75,38 95,24 C115,10 130,18 155,12 C175,6 195,14 215,8 C232,3 250,10 280,4"
            fill="none"
            stroke="var(--forest)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M0,55 C15,52 28,58 45,44 C62,30 75,38 95,24 C115,10 130,18 155,12 C175,6 195,14 215,8 C232,3 250,10 280,4 L280,70 L0,70 Z"
            fill="url(#chartGrad)"
          />
        </svg>
      </div>

      {/* Score */}
      <div className="flex items-center justify-between">
        <div>
          <div className="eyebrow mb-1">EquityIQ score</div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-serif text-4xl" style={{ letterSpacing: '-0.025em' }}>82</span>
            <span className="text-sm text-ink-tertiary">/100</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 items-end">
          <span className="pill pill-forest">Strong buy</span>
          <div className="flex gap-1.5">
            <ScoreChip label="RSI" value="68" color="var(--amber)" />
            <ScoreChip label="MACD" value="↑" color="var(--forest)" />
            <ScoreChip label="Vol" value="2.3×" color="var(--dusty)" />
          </div>
        </div>
      </div>

      {/* Forecast preview */}
      <div className="hairline-divider my-4" />
      <div className="flex items-center justify-between">
        <div className="eyebrow">1H forecast</div>
        <div className="flex items-center gap-2">
          <span className="text-forest font-semibold text-sm">↑ +0.8%</span>
          <span className="pill pill-forest text-[10px]">High confidence</span>
        </div>
      </div>
    </div>
  );
}

function ScoreChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="px-2 py-1 rounded-lg text-[10px] font-medium"
      style={{
        background: `color-mix(in srgb, ${color} 12%, var(--cream-tint))`,
        color,
      }}
    >
      {label} {value}
    </div>
  );
}

/* ─── Static data ────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: <BarChart2 size={20} />,
    eyebrow: 'Multi-source',
    title: 'Real market data',
    body: 'Quotes, history, fundamentals, and news aggregated from Polygon, Finnhub, Alpha Vantage, and Yahoo — with automatic fallback.',
    color: 'var(--dusty)',
  },
  {
    icon: <Brain size={20} />,
    eyebrow: 'AI-scored',
    title: 'A verdict, not a wall of charts',
    body: 'Every report rolls into one score out of 100 — with the factors shown transparently. Plus AI forecasts across four time horizons.',
    color: 'var(--forest)',
  },
  {
    icon: <Lock size={20} />,
    eyebrow: 'Private',
    title: 'Your watchlist, your data',
    body: 'Sign in once, save tickers, get live price feeds. No tracking pixels, no email blasts — just research.',
    color: 'var(--amber)',
  },
];

const HOW_STEPS = [
  {
    title: 'Search a ticker',
    body: 'Type any US equity symbol. We pull data from multiple sources in parallel — quotes, history, fundamentals, options flow, and news.',
  },
  {
    title: 'Read the report',
    body: 'Seven tabs cover every angle: snapshot, technicals, fundamentals, AI analysis, sentiment, forecast, and news.',
  },
  {
    title: 'Get the verdict',
    body: 'One score from 0–100 with the factors listed. AI forecasts for 1H, 1D, 3D, and 1W give you a forward view.',
  },
];
