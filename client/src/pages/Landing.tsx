import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BarChart3, ShieldCheck, Zap } from 'lucide-react';
import Logo from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';

const SAMPLE_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'SOFI', 'IONQ', 'PLTR', 'MSFT', 'AMZN'];

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Top nav */}
      <header
        className="sticky top-0 z-30"
        style={{
          background: 'var(--glass-sidebar-bg)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderBottom: '1px solid var(--glass-border)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <Logo size="md" />
          <nav className="flex items-center gap-2">
            {user ? (
              <Link to="/dashboard" className="btn-primary">
                Go to dashboard <ArrowRight size={16} className="ml-1.5" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-ghost">Log in</Link>
                <Link to="/signup" className="btn-primary">Create account</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pt-16 md:pt-28 pb-20">
        <div className="max-w-3xl">
          <span className="pill pill-forest mb-6 animate-fadeUp">
            <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulseDot" />
            Live market data
          </span>
          <h1 className="font-serif text-5xl md:text-7xl lg:text-[88px] leading-[1.02] tracking-tight2 text-ink animate-fadeUp animate-delay-1">
            Institutional<br />equity research.
          </h1>
          <p className="mt-6 text-lg md:text-xl text-ink-secondary leading-relaxed max-w-xl animate-fadeUp animate-delay-2">
            Type a ticker, get the full picture — snapshot, technicals, fundamentals, sentiment, and a scored verdict.
            Clean numbers. No noise.
          </p>

          <div className="mt-10 flex flex-wrap gap-3 animate-fadeUp animate-delay-3">
            {user ? (
              <Link to="/dashboard" className="btn-primary text-base px-6 py-3">
                Open dashboard <ArrowRight size={18} className="ml-2" />
              </Link>
            ) : (
              <>
                <Link to="/signup" className="btn-primary text-base px-6 py-3">
                  Get started — it's free <ArrowRight size={18} className="ml-2" />
                </Link>
                <Link to="/login" className="btn-ghost text-base px-6 py-3">I have an account</Link>
              </>
            )}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-2 animate-fadeUp animate-delay-4">
            <span className="text-xs uppercase tracking-eyebrow text-ink-tertiary mr-2">Try a ticker</span>
            {SAMPLE_TICKERS.map((t) => (
              <button
                key={t}
                onClick={() => navigate(user ? `/dashboard?ticker=${t}` : '/signup')}
                className="px-3 py-1.5 rounded-full bg-white border border-hairline text-sm font-medium hover:bg-cream-tint transition"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pb-24">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: <BarChart3 size={20} />,
              eyebrow: 'Multi-source',
              title: 'Real market data',
              body: 'Quotes, history, fundamentals and news aggregated from Massive, Finnhub, Alpha Vantage, and Yahoo — with automatic fallback.',
            },
            {
              icon: <Zap size={20} />,
              eyebrow: 'Scored',
              title: 'A verdict, not a wall of charts',
              body: 'Every report rolls into one number out of 100, with the factors that drove it shown transparently.',
            },
            {
              icon: <ShieldCheck size={20} />,
              eyebrow: 'Private',
              title: 'Your watchlist, your account',
              body: 'Sign in once. Save tickers. No tracking pixels, no email blasts — just research.',
            },
          ].map((f, i) => (
            <div
              key={f.title}
              className={`card animate-fadeUp animate-delay-${i + 5}`}
            >
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'var(--cream-tint)' }}>
                <span style={{ color: 'var(--forest)' }}>{f.icon}</span>
              </div>
              <div className="eyebrow mb-2">{f.eyebrow}</div>
              <h3 className="font-serif text-2xl tracking-tight1 mb-3">{f.title}</h3>
              <p className="text-ink-secondary leading-relaxed text-[15px]">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-hairline">
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
