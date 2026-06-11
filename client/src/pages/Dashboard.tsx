import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, ChevronRight, Loader2, RotateCw } from '../lib/icons';
import { motion } from 'framer-motion';
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
import ForecastCard from '../components/ForecastCard';
import OptionsChainCard from '../components/OptionsChainCard';
import { useAuth } from '../contexts/AuthContext';
import { useAiJobStatus } from '../contexts/AiJobsContext';
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
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xl mb-8"
        >
          <SearchBar onSearch={handleSearch} compact initial={ticker || ''} />
        </motion.div>
      )}

      {loading && <Skeleton />}

      {error && (
        <div className="max-w-md mx-auto card text-center animate-fadeUp">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(192,78,64,0.10)', border: '1px solid rgba(192,78,64,0.20)' }}
          >
            <AlertCircle size={22} className="text-brick" />
          </div>
          <h3 className="font-serif text-2xl mb-2" style={{ letterSpacing: '-0.018em' }}>Couldn't load report</h3>
          <p className="text-ink-secondary text-sm mb-6 leading-relaxed">{error}</p>
          <button onClick={() => ticker && load(ticker)} className="btn-primary mx-auto">
            <RotateCw size={14} /> Try again
          </button>
        </div>
      )}

      {data && !loading && <ReportTabs data={data} />}
    </div>
  );
}

type TabId = 'overview' | 'forecast' | 'technicals' | 'options' | 'fundamentals' | 'ai' | 'sentiment' | 'news';

function ReportTabs({ data }: { data: ReturnType<typeof useResearch>['data'] }) {
  const [active, setActive] = useState<TabId>('overview');

  // Build the list of tabs that actually have data, so we never show an empty one.
  const tabs = useMemo(() => {
    const t: Array<{ id: TabId; label: string }> = [
      { id: 'overview', label: 'Overview' },
      { id: 'forecast', label: 'Forecast' },
      { id: 'technicals', label: 'Technicals' },
      { id: 'options', label: 'Options' },
    ];
    if (data?.valuation) t.push({ id: 'fundamentals', label: 'Fundamentals' });
    t.push({ id: 'ai', label: 'AI Analysis' });
    t.push({ id: 'sentiment', label: 'Sentiment' });
    t.push({ id: 'news', label: 'News' });
    return t;
  }, [data]);

  // Background AI job statuses, for the per-tab spinner / ready dot.
  const ticker = data?.ticker || '';
  const f1H = useAiJobStatus('forecast-1H', ticker);
  const f1D = useAiJobStatus('forecast-1D', ticker);
  const f3D = useAiJobStatus('forecast-3D', ticker);
  const f1W = useAiJobStatus('forecast-1W', ticker);
  const outlookStatus = useAiJobStatus('outlook', ticker);
  const thesisStatus = useAiJobStatus('thesis', ticker);

  function tabStatus(id: TabId): 'idle' | 'loading' | 'done' {
    if (id === 'forecast') {
      const fs = [f1H, f1D, f3D, f1W];
      if (fs.includes('loading')) return 'loading';
      if (fs.includes('done')) return 'done';
      return 'idle';
    }
    if (id === 'ai') {
      if (outlookStatus === 'loading' || thesisStatus === 'loading') return 'loading';
      if (outlookStatus === 'done' || thesisStatus === 'done') return 'done';
    }
    return 'idle';
  }

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
      <div className="sticky top-0 z-10 -mx-6 md:-mx-10 px-6 md:px-10 mt-4 mb-5">
        <div
          className="flex gap-0.5 overflow-x-auto rounded-2xl p-1.5 no-scrollbar"
          style={{
            background: 'var(--glass-sidebar-sheen), var(--glass-sidebar-bg)',
            backdropFilter: 'blur(28px) saturate(190%)',
            WebkitBackdropFilter: 'blur(28px) saturate(190%)',
            border: '1px solid var(--glass-border)',
            boxShadow: 'var(--glass-shadow)',
          }}
        >
          {tabs.map((t) => {
            const isActive = active === t.id;
            const st = tabStatus(t.id);
            return (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-[13px] font-semibold transition flex-shrink-0 inline-flex items-center gap-1.5 ${
                  isActive ? 'text-ink' : 'text-ink-secondary hover:text-ink'
                }`}
                style={
                  isActive
                    ? {
                        background: 'var(--panel-bg)',
                        boxShadow: 'var(--panel-shadow), 0 1px 0 rgba(255,255,255,0.50)',
                        border: '1px solid var(--panel-border)',
                      }
                    : undefined
                }
              >
                {t.label}
                {st === 'loading' && <Loader2 size={11} className="animate-spin text-forest" />}
                {st === 'done' && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-forest" title="Result ready" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab panels */}
      <div key={active} className="space-y-4">
        {active === 'overview' && (
          <>
            <PriceChart data={data} />
            <VerdictCard data={data} />
          </>
        )}
        {active === 'forecast' && <ForecastCard data={data} />}
        {active === 'technicals' && (
          <>
            <TechnicalsCard data={data} />
            <WhatIfCard data={data} />
          </>
        )}
        {active === 'options' && <OptionsChainCard data={data} />}
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

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, ease: EASE, delay },
});

function Hero({ onSearch, userName }: { onSearch: (t: string) => void; userName?: string }) {
  return (
    <div className="text-center pt-8 md:pt-20">
      <motion.div {...fade(0)}>
        <span className="pill pill-forest">
          <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulseDot" />
          Live market data
        </span>
      </motion.div>

      <motion.h1
        {...fade(0.06)}
        className="font-serif text-5xl md:text-7xl leading-[1.03] mt-6"
        style={{ letterSpacing: '-0.028em' }}
      >
        {userName ? <>Welcome back,<br />{userName}.</> : <>Institutional<br />equity research.</>}
      </motion.h1>

      <motion.p {...fade(0.12)} className="text-ink-secondary text-lg mt-5 max-w-xl mx-auto leading-relaxed">
        Search any US ticker for a full research report — snapshot, charts, technicals,
        sentiment, and a scored verdict.
      </motion.p>

      <motion.div {...fade(0.18)} className="mt-10 max-w-xl mx-auto">
        <SearchBar onSearch={onSearch} />
      </motion.div>

      <motion.div
        {...fade(0.24)}
        className="mt-6 flex flex-wrap items-center justify-center gap-2"
      >
        <span className="eyebrow mr-1">Try</span>
        {QUICK_PICKS.map((t) => (
          <button
            key={t}
            onClick={() => onSearch(t)}
            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-sm font-medium text-ink-secondary hover:text-ink transition"
            style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--panel-border)',
              boxShadow: 'var(--panel-shadow)',
            }}
          >
            {t}
            <ChevronRight size={12} className="text-ink-tertiary" />
          </button>
        ))}
      </motion.div>
    </div>
  );
}
