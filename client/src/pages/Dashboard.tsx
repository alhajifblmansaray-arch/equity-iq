import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, RotateCw } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import Skeleton from '../components/Skeleton';
import SnapshotCard from '../components/SnapshotCard';
import PriceChart from '../components/PriceChart';
import TechnicalsCard from '../components/TechnicalsCard';
import ShortInterestCard from '../components/ShortInterestCard';
import ValuationCard from '../components/ValuationCard';
import NewsCard from '../components/NewsCard';
import { BullBearCard, RisksCard, VerdictCard } from '../components/ReportCards';
import ThesisCard from '../components/ThesisCard';
import OutlookCard from '../components/OutlookCard';
import WhatIfCard from '../components/WhatIfCard';
import PulseCard from '../components/PulseCard';
import { useAuth } from '../contexts/AuthContext';
import { useResearch } from '../hooks/useResearch';

const QUICK_PICKS = ['NVDA', 'AAPL', 'TSLA', 'SOFI', 'IONQ', 'PLTR', 'MSFT', 'AMZN'];

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, ticker, load } = useResearch();
  const [params, setParams] = useSearchParams();

  // Deep-link support: ?ticker=NVDA
  useEffect(() => {
    const t = params.get('ticker');
    if (!t) return;
    if (t.toUpperCase() !== (ticker || '').toUpperCase()) {
      load(t);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  function handleSearch(t: string) {
    setParams({ ticker: t });
  }

  const inReport = !!(data || loading || error);

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-10">
      {!inReport ? (
        <Hero onSearch={handleSearch} userName={user?.name?.split(' ')[0]} />
      ) : (
        <div className="max-w-xl mb-8 animate-fadeUp">
          <SearchBar onSearch={handleSearch} compact initial={ticker || ''} />
        </div>
      )}

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

      {data && !loading && <ReportTabs data={data} />}
    </div>
  );
}

type TabId = 'overview' | 'technicals' | 'fundamentals' | 'ai' | 'sentiment' | 'news';

function ReportTabs({ data }: { data: ReturnType<typeof useResearch>['data'] }) {
  const [active, setActive] = useState<TabId>('overview');

  // Build the list of tabs that actually have data, so we never show an empty one.
  const tabs = useMemo(() => {
    const t: Array<{ id: TabId; label: string }> = [
      { id: 'overview', label: 'Overview' },
      { id: 'technicals', label: 'Technicals' },
    ];
    if (data?.valuation) t.push({ id: 'fundamentals', label: 'Fundamentals' });
    t.push({ id: 'ai', label: 'AI Analysis' });
    t.push({ id: 'sentiment', label: 'Sentiment' });
    t.push({ id: 'news', label: 'News' });
    return t;
  }, [data]);

  // Reset to the first tab whenever a new ticker loads, and guard against the
  // active tab disappearing (e.g. fundamentals when the next ticker has none).
  useEffect(() => {
    if (!tabs.some((t) => t.id === active)) setActive('overview');
  }, [tabs, active]);
  useEffect(() => {
    setActive('overview');
  }, [data?.ticker]);

  if (!data) return null;

  return (
    <div>
      <SnapshotCard data={data} />

      {/* Sticky glass tab bar */}
      <div
        className="sticky top-0 md:top-0 z-10 -mx-6 md:-mx-10 px-6 md:px-10 mt-4 mb-5"
      >
        <div
          className="flex gap-1 overflow-x-auto rounded-2xl p-1.5 no-scrollbar"
          style={{
            background: 'var(--glass-sidebar-bg)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid var(--glass-border)',
            boxShadow: 'var(--glass-shadow)',
          }}
        >
          {tabs.map((t) => {
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-[13px] font-medium transition flex-shrink-0 ${
                  isActive ? 'text-ink' : 'text-ink-secondary hover:text-ink'
                }`}
                style={isActive ? { background: 'var(--surface)', boxShadow: 'var(--glass-shadow)' } : undefined}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab panels — keyed so each switch re-triggers the fadeUp animation */}
      <div key={active} className="space-y-4">
        {active === 'overview' && (
          <>
            <PriceChart data={data} />
            <VerdictCard data={data} />
          </>
        )}
        {active === 'technicals' && (
          <>
            <TechnicalsCard data={data} />
            <WhatIfCard data={data} />
          </>
        )}
        {active === 'fundamentals' && data.valuation && <ValuationCard data={data} />}
        {active === 'ai' && (
          <>
            <OutlookCard data={data} />
            <ThesisCard data={data} />
            <BullBearCard data={data} />
            <RisksCard data={data} />
          </>
        )}
        {active === 'sentiment' && (
          <>
            <PulseCard data={data} />
            {data.shortInterest && <ShortInterestCard data={data} />}
          </>
        )}
        {active === 'news' && <NewsCard data={data} />}
      </div>

      <div className="text-center text-xs text-ink-tertiary pt-6 pb-2">
        Data from {data.meta.providers.join(' · ') || 'multiple providers'} ·
        Last updated {new Date(data.timestamp).toLocaleTimeString()}
      </div>
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
