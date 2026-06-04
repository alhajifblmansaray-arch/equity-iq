import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import type { EarningsEvent } from '../types';
import { fmtCompact } from '../lib/helpers';
import { useWatchlist } from '../contexts/WatchlistContext';

const DAYS_OPTIONS = [7, 14, 30];

export default function CalendarPage() {
  const { tickers } = useWatchlist();
  const [events, setEvents] = useState<EarningsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [daysAhead, setDaysAhead] = useState(14);
  const [onlyWatchlist, setOnlyWatchlist] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ events: EarningsEvent[] }>(`/calendar/earnings`, {
        params: { days: daysAhead },
      });
      setEvents(data.events);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [daysAhead]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = onlyWatchlist
    ? events.filter((e) => tickers.includes(e.symbol))
    : events;

  // Group by date
  const byDate = filtered.reduce<Record<string, EarningsEvent[]>>((acc, e) => {
    (acc[e.date] = acc[e.date] || []).push(e);
    return acc;
  }, {});
  const dates = Object.keys(byDate).sort();

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-10">
      <header className="mb-8 animate-fadeUp">
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays size={14} className="text-dusty" />
          <span className="eyebrow">Calendar</span>
        </div>
        <h1 className="font-serif text-4xl md:text-5xl tracking-tight2">Earnings ahead</h1>
        <p className="text-ink-secondary mt-2 text-[15px]">
          Upcoming company earnings reports, grouped by day.
        </p>
      </header>

      <div className="flex items-center gap-3 mb-6 flex-wrap animate-fadeUp animate-delay-1">
        <div className="inline-flex items-center bg-cream-tint rounded-full p-1">
          {DAYS_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDaysAhead(d)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
                daysAhead === d ? 'bg-white text-ink shadow-pill' : 'text-ink-secondary'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
        {tickers.length > 0 && (
          <button
            onClick={() => setOnlyWatchlist((v) => !v)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
              onlyWatchlist ? 'bg-ink text-cream' : 'bg-cream-tint text-ink-secondary hover:text-ink'
            }`}
          >
            ★ Watchlist only
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card animate-fadeUp">
              <div className="skel h-4 w-24 mb-4" />
              <div className="skel h-5 w-1/2" />
            </div>
          ))}
        </div>
      ) : dates.length === 0 ? (
        <div className="card text-center animate-fadeUp animate-delay-2">
          <CalendarDays size={28} className="mx-auto mb-3 text-ink-tertiary" />
          <h3 className="font-serif text-2xl tracking-tight1 mb-2">Nothing scheduled</h3>
          <p className="text-ink-secondary text-sm">
            No earnings in the next {daysAhead} days{onlyWatchlist ? ' for your watchlist' : ''}.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {dates.map((d, idx) => {
            const date = new Date(d + 'T00:00:00');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const diff = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const label =
              diff === 0
                ? 'Today'
                : diff === 1
                ? 'Tomorrow'
                : date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
            return (
              <div key={d} className={`animate-fadeUp animate-delay-${Math.min(idx + 1, 9)}`}>
                <div className="eyebrow mb-2 flex items-center gap-2">
                  {label}
                  <span className="text-ink-tertiary normal-case tracking-normal">
                    {d}
                  </span>
                </div>
                <div className="card !p-0 overflow-hidden">
                  {byDate[d].map((e, i, arr) => (
                    <Link
                      key={e.symbol + i}
                      to={`/dashboard?ticker=${e.symbol}`}
                      className={`flex items-center gap-4 px-5 py-4 hover:bg-cream-tint transition ${
                        i < arr.length - 1 ? 'border-b border-hairline' : ''
                      }`}
                    >
                      <span className="font-serif text-xl tracking-tight1 w-20">{e.symbol}</span>
                      <span className="flex-1 text-sm text-ink-secondary">
                        {e.hour === 'bmo'
                          ? 'Before market open'
                          : e.hour === 'amc'
                          ? 'After market close'
                          : 'Time TBD'}
                        {e.quarter && e.year && (
                          <span className="text-ink-tertiary"> · Q{e.quarter} {e.year}</span>
                        )}
                      </span>
                      <span className="text-right text-sm">
                        {e.estimate != null && (
                          <span className="block text-ink-secondary">
                            Est EPS <span className="font-medium text-ink tabular-nums">${e.estimate.toFixed(2)}</span>
                          </span>
                        )}
                        {e.revenueEstimate != null && (
                          <span className="block text-ink-tertiary text-xs">
                            Rev {fmtCompact(e.revenueEstimate)}
                          </span>
                        )}
                      </span>
                      <ChevronRight size={16} className="text-ink-tertiary" />
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
