import { Link } from 'react-router-dom';
import { ArrowRight, Star, TrendingDown, TrendingUp, X } from 'lucide-react';
import { useWatchlist } from '../contexts/WatchlistContext';
import { fmtPct, fmtPrice } from '../lib/helpers';
import SentimentHeatmap from '../components/SentimentHeatmap';
import Sparkline from '../components/Sparkline';

export default function WatchlistPage() {
  const { tickers, snaps, remove } = useWatchlist();

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-10">
      <header className="mb-8 animate-fadeUp">
        <div className="eyebrow mb-2">Watchlist</div>
        <h1 className="font-serif text-4xl md:text-5xl tracking-tight2">Your saved tickers</h1>
        <p className="text-ink-secondary mt-2 text-[15px]">
          {tickers.length === 0
            ? 'Star tickers from a research report to pin them here.'
            : `${tickers.length} ${tickers.length === 1 ? 'ticker' : 'tickers'} on your list.`}
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

          <div className="grid gap-3">
            {tickers.map((t, i) => {
              const snap = snaps[t];
              const q = snap?.quote;
              const up = (q?.changePct ?? 0) >= 0;
              return (
                <Link
                  key={t}
                  to={`/dashboard?ticker=${t}`}
                  className={`card flex items-center justify-between gap-6 hover:shadow-cardHover transition animate-fadeUp animate-delay-${Math.min(i + 2, 9)}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-serif text-2xl tracking-tight1">{t}</div>
                    {q?.name && (
                      <div className="text-sm text-ink-secondary truncate mt-0.5">{q.name}</div>
                    )}
                  </div>
                  <div className="hidden sm:block">
                    {snap?.spark?.length ? (
                      <Sparkline values={snap.spark} width={120} height={36} />
                    ) : (
                      <div className="skel w-[120px] h-[36px]" />
                    )}
                  </div>
                  <div className="text-right min-w-[110px]">
                    {!q && !snap ? (
                      <div className="skel h-6 w-24" />
                    ) : q ? (
                      <>
                        <div className="font-serif text-2xl tracking-tight1">${fmtPrice(q.price)}</div>
                        <div className={`text-sm font-medium ${up ? 'text-forest' : 'text-brick'} flex items-center justify-end gap-1`}>
                          {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                          {fmtPct(q.changePct)}
                        </div>
                      </>
                    ) : (
                      <span className="text-ink-tertiary text-sm italic">no quote</span>
                    )}
                  </div>
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
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
