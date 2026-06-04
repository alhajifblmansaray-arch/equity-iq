import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Globe, Newspaper, RotateCw } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import { useWatchlist } from '../contexts/WatchlistContext';
import { newsApi, research } from '../lib/api';
import type { NormalizedNews } from '../types';
import { fmtRelative, sentimentPill } from '../lib/helpers';

type Tab = 'ticker' | 'market';

export default function NewsPage() {
  const [params, setParams] = useSearchParams();
  const { tickers } = useWatchlist();
  const initial = (params.get('ticker') || tickers[0] || '').toUpperCase();
  const [ticker, setTicker] = useState(initial);
  const [tab, setTab] = useState<Tab>(initial ? 'ticker' : 'market');
  const [articles, setArticles] = useState<NormalizedNews[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'ticker' && ticker) {
        const r = await research.news(ticker, 30, 30);
        setArticles(r.articles);
      } else {
        const r = await newsApi.market();
        setArticles(r.articles);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not load news.');
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [ticker, tab]);

  useEffect(() => {
    load();
  }, [load]);

  function onSearch(t: string) {
    const upper = t.toUpperCase();
    setTicker(upper);
    setTab('ticker');
    setParams({ ticker: upper });
  }

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-10">
      <header className="mb-8 animate-fadeUp">
        <div className="eyebrow mb-2">News</div>
        <h1 className="font-serif text-4xl md:text-5xl tracking-tight2">
          {tab === 'ticker' && ticker ? `${ticker} headlines` : 'Market headlines'}
        </h1>
        <p className="text-ink-secondary mt-2 text-[15px]">
          {tab === 'ticker' && ticker
            ? `Most recent stories tagged for ${ticker}, past 30 days.`
            : 'General market news from across the wire.'}
        </p>
      </header>

      <div className="flex items-center gap-3 mb-4 flex-wrap animate-fadeUp animate-delay-1">
        <div className="inline-flex items-center bg-cream-tint rounded-full p-1">
          <button
            onClick={() => setTab('market')}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition inline-flex items-center gap-1.5 ${
              tab === 'market' ? 'bg-white text-ink shadow-pill' : 'text-ink-secondary'
            }`}
          >
            <Globe size={12} />
            Market
          </button>
          <button
            onClick={() => ticker && setTab('ticker')}
            disabled={!ticker}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition inline-flex items-center gap-1.5 ${
              tab === 'ticker' ? 'bg-white text-ink shadow-pill' : 'text-ink-secondary'
            } disabled:opacity-40`}
          >
            <Newspaper size={12} />
            {ticker || 'Ticker'}
          </button>
        </div>
        <div className="flex-1 max-w-md">
          <SearchBar onSearch={onSearch} compact initial={ticker} />
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-ink-tertiary hover:text-ink p-2 rounded-full hover:bg-cream-tint transition disabled:opacity-40"
          aria-label="Refresh"
          title="Refresh"
        >
          <RotateCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Watchlist quick-tabs */}
      {tickers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6 animate-fadeUp animate-delay-2">
          <span className="eyebrow mr-1">My list</span>
          {tickers.slice(0, 10).map((t) => (
            <button
              key={t}
              onClick={() => onSearch(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                tab === 'ticker' && ticker === t
                  ? 'border-ink bg-ink text-cream'
                  : 'border-hairline bg-white text-ink-secondary hover:bg-cream-tint hover:text-ink'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {error ? (
        <div className="card text-center animate-fadeUp animate-delay-2">
          <p className="text-ink-secondary text-sm mb-4">{error}</p>
          <button onClick={load} className="btn-primary mx-auto">
            Try again
          </button>
        </div>
      ) : loading && !articles.length ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`card animate-fadeUp animate-delay-${Math.min(i + 1, 9)}`}>
              <div className="skel h-3 w-24 mb-3" />
              <div className="skel h-5 w-3/4 mb-2" />
              <div className="skel h-3 w-full" />
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="card text-center animate-fadeUp animate-delay-2">
          <Newspaper size={26} className="mx-auto mb-3 text-ink-tertiary" />
          <h3 className="font-serif text-2xl tracking-tight1 mb-2">No stories yet</h3>
          <p className="text-ink-secondary text-sm">
            {tab === 'ticker'
              ? `We couldn't find recent news for ${ticker}.`
              : 'No general market headlines available right now.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map((n, i) => {
            const sent = sentimentPill(n.sentiment);
            return (
              <a
                key={n.id}
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`card flex gap-4 hover:shadow-cardHover transition animate-fadeUp animate-delay-${Math.min(i + 1, 9)}`}
              >
                {n.imageUrl && (
                  <img
                    src={n.imageUrl}
                    alt=""
                    className="hidden sm:block flex-shrink-0 w-32 h-24 rounded-2xl object-cover bg-cream-tint"
                    onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-ink-tertiary mb-1.5">
                    {n.publisher && <span className="text-ink-secondary font-medium">{n.publisher}</span>}
                    {n.publisher && <span>·</span>}
                    <span>{fmtRelative(n.publishedAt)}</span>
                    {n.sentiment && <span className={`pill ${sent.cls} ml-1`}>{sent.label}</span>}
                  </div>
                  <h4 className="text-[15px] md:text-base font-medium leading-snug group-hover:text-forest transition mb-1">
                    {n.title}
                  </h4>
                  {n.description && (
                    <p className="text-sm text-ink-secondary line-clamp-2 leading-relaxed">{n.description}</p>
                  )}
                </div>
                <ArrowUpRight size={18} className="flex-shrink-0 text-ink-tertiary mt-1" />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
