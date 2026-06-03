import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, LogOut, RotateCw } from 'lucide-react';
import Logo from '../components/Logo';
import SearchBar from '../components/SearchBar';
import Skeleton from '../components/Skeleton';
import SnapshotCard from '../components/SnapshotCard';
import PriceChart from '../components/PriceChart';
import TechnicalsCard from '../components/TechnicalsCard';
import ShortInterestCard from '../components/ShortInterestCard';
import ValuationCard from '../components/ValuationCard';
import NewsCard from '../components/NewsCard';
import { BullBearCard, RisksCard, VerdictCard } from '../components/ReportCards';
import { useAuth } from '../contexts/AuthContext';
import { useResearch } from '../hooks/useResearch';

const QUICK_PICKS = ['NVDA', 'AAPL', 'TSLA', 'SOFI', 'IONQ', 'PLTR', 'MSFT', 'AMZN'];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { data, loading, error, ticker, load, reset } = useResearch();
  const [params, setParams] = useSearchParams();

  // Allow ?ticker=NVDA deep links from landing page
  useEffect(() => {
    const t = params.get('ticker');
    if (t && !data && !loading && !ticker) {
      load(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(t: string) {
    setParams({ ticker: t });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    load(t);
  }

  const inReport = !!(data || loading || error);

  return (
    <div className="min-h-screen">
      <header
        className="sticky top-0 z-30 backdrop-blur"
        style={{ background: 'rgba(245,241,235,0.78)', borderBottom: inReport ? '1px solid var(--hairline)' : 'none' }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center gap-4">
          <button onClick={() => { reset(); setParams({}); }} className="flex-shrink-0">
            <Logo size="md" />
          </button>
          {inReport && (
            <div className="hidden md:block flex-1 max-w-md ml-auto">
              <SearchBar onSearch={handleSearch} compact initial={ticker || ''} />
            </div>
          )}
          <div className="ml-auto md:ml-0 flex items-center gap-3 flex-shrink-0">
            <span className="hidden sm:block text-sm text-ink-secondary">
              {user?.name?.split(' ')[0]}
            </span>
            <button
              onClick={() => logout()}
              className="text-ink-tertiary hover:text-ink p-2 rounded-full hover:bg-cream-tint transition"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
        {inReport && (
          <div className="md:hidden px-6 pb-4">
            <SearchBar onSearch={handleSearch} compact initial={ticker || ''} />
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-6 md:px-10 py-10">
        {!inReport && <Hero onSearch={handleSearch} userName={user?.name?.split(' ')[0]} />}

        {loading && <Skeleton />}

        {error && (
          <div className="max-w-md mx-auto card text-center animate-fadeUp">
            <AlertCircle size={28} className="mx-auto text-brick mb-3" />
            <h3 className="font-serif text-2xl tracking-tight1 mb-2">Couldn't load report</h3>
            <p className="text-ink-secondary text-sm mb-5">{error}</p>
            <button onClick={() => ticker && load(ticker)} className="btn-primary mx-auto">
              <RotateCw size={14} className="mr-1.5" /> Try again
            </button>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-4">
            <SnapshotCard data={data} />
            <PriceChart data={data} />
            <TechnicalsCard data={data} />
            {data.shortInterest && <ShortInterestCard data={data} />}
            {data.valuation && <ValuationCard data={data} />}
            <VerdictCard data={data} />
            <BullBearCard data={data} />
            <RisksCard data={data} />
            <NewsCard data={data} />
            <div className="text-center text-xs text-ink-tertiary pt-4 pb-2">
              Data from {data.meta.providers.join(' · ') || 'multiple providers'} ·
              Last updated {new Date(data.timestamp).toLocaleTimeString()}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Hero({ onSearch, userName }: { onSearch: (t: string) => void; userName?: string }) {
  return (
    <div className="text-center pt-8 md:pt-20">
      <span className="pill pill-forest animate-fadeUp">
        <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulseDot" />
        Live market data
      </span>
      <h1 className="font-serif text-5xl md:text-7xl tracking-tight2 leading-[1.05] mt-6 animate-fadeUp animate-delay-1">
        {userName ? <>Welcome back, {userName}.</> : <>Institutional<br />equity research.</>}
      </h1>
      <p className="text-ink-secondary text-lg mt-5 max-w-xl mx-auto animate-fadeUp animate-delay-2">
        Search any US ticker for a full research report — snapshot, charts, technicals, sentiment, and a scored verdict.
      </p>

      <div className="mt-10 max-w-xl mx-auto animate-fadeUp animate-delay-3">
        <SearchBar onSearch={onSearch} />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2 animate-fadeUp animate-delay-4">
        {QUICK_PICKS.map((t) => (
          <button
            key={t}
            onClick={() => onSearch(t)}
            className="px-3 py-1.5 rounded-full bg-white border border-hairline text-sm font-medium hover:bg-cream-tint transition"
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
