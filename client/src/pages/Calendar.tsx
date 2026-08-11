import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, ChevronRight, ExternalLink, Landmark, Users, X } from '../lib/icons';
import { api, research } from '../lib/api';
import type { EarningsEvent } from '../types';
import { fmtCompact, fmtPrice } from '../lib/helpers';
import { useWatchlist } from '../contexts/WatchlistContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function startOfWeek(offset = 0): Date {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function weekDays(monday: Date): Date[] {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function isToday(d: Date) {
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

function isPast(d: Date) {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return d < t;
}

function fmtDay(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function fmtDayNum(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtWeekRange(monday: Date) {
  const friday = new Date(monday); friday.setDate(monday.getDate() + 4);
  const m = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const f = friday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const year = monday.getFullYear();
  return `${m} - ${f}, ${year}`;
}

const TIMING: Record<string, { label: string; icon: string; color: string }> = {
  bmo: { label: 'Before open', icon: '🌅', color: 'var(--amber)' },
  amc: { label: 'After close',  icon: '🌆', color: 'var(--dusty)' },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { tickers: watchlist } = useWatchlist();
  const [events, setEvents] = useState<EarningsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [onlyWatchlist, setOnlyWatchlist] = useState(false);
  const [selected, setSelected] = useState<EarningsEvent | null>(null);
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof research.profile>> | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    api.get<{ events: EarningsEvent[] }>('/calendar/earnings', { params: { days: 90 } })
      .then((r) => {
        const evts = r.data.events;
        setEvents(evts);
        // Auto-jump to the first week that has events if current week is empty
        if (evts.length > 0) {
          const firstEvent = [...evts].sort((a, b) => a.date.localeCompare(b.date))[0];
          const firstEventDate = new Date(firstEvent.date + 'T00:00:00');
          // Find how many weeks ahead the first event is
          const todayMonday = startOfWeek(0);
          const diffDays = Math.floor((firstEventDate.getTime() - todayMonday.getTime()) / (1000 * 60 * 60 * 24));
          const weekDiff = Math.max(0, Math.floor(diffDays / 7));
          // Only auto-jump if current week is before the first event
          const thisWeekEnd = new Date(todayMonday);
          thisWeekEnd.setDate(todayMonday.getDate() + 4);
          const currentWeekHasEvents = evts.some((e) => {
            const d = e.date;
            return d >= isoDate(todayMonday) && d <= isoDate(thisWeekEnd);
          });
          if (!currentWeekHasEvents && weekDiff > 0) {
            setWeekOffset(weekDiff);
          }
        }
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  // Fetch company profile when a ticker is selected
  useEffect(() => {
    if (!selected) { setProfile(null); return; }
    setProfile(null);
    setProfileLoading(true);
    research.profile(selected.symbol)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setProfileLoading(false));
  }, [selected?.symbol]);

  const monday = startOfWeek(weekOffset);
  const days = weekDays(monday);
  const dayStrs = days.map(isoDate);

  // Latest date in the data so we can cap forward navigation
  const latestEventDate = events.length > 0 ? [...events].sort((a, b) => a.date < b.date ? 1 : -1)[0]?.date : '';
  const canGoBack = weekOffset > 0;
  const canGoForward = !!latestEventDate && dayStrs[0] < latestEventDate;

  const base = onlyWatchlist ? events.filter((e) => watchlist.includes(e.symbol)) : events;
  const byDay: Record<string, EarningsEvent[]> = {};
  for (const d of dayStrs) byDay[d] = [];
  for (const e of base) { if (byDay[e.date] !== undefined) byDay[e.date].push(e); }

  const totalThisWeek = dayStrs.reduce((s, d) => s + byDay[d].length, 0);

  // Scroll detail panel into view
  useEffect(() => {
    if (selected && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selected]);

  const navigate = useCallback((dir: -1 | 1) => {
    setSelected(null);
    setWeekOffset((o) => o + dir);
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-10 py-10">
      {/* Header */}
      <header className="mb-8 animate-fadeUp">
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays size={14} className="text-dusty" />
          <span className="eyebrow">Calendar</span>
        </div>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-serif text-4xl md:text-5xl tracking-tight2">Earnings calendar</h1>
            <p className="text-ink-secondary mt-1 text-[15px]">
              Upcoming earnings reports. Click any report to see details.
            </p>
          </div>
          {watchlist.length > 0 && (
            <button
              onClick={() => setOnlyWatchlist((v) => !v)}
              className={`text-sm font-semibold px-4 py-2 rounded-full transition flex-shrink-0 ${
                onlyWatchlist ? 'bg-ink text-cream' : 'btn-ghost'
              }`}
            >
              ★ Watchlist only
            </button>
          )}
        </div>
      </header>

      {/* Week navigator */}
      <div className="flex items-center justify-between mb-5 animate-fadeUp">
        <button
          onClick={() => navigate(-1)}
          disabled={!canGoBack}
          className="btn-ghost text-sm disabled:opacity-30"
        >
          ← Prev week
        </button>
        <div className="text-center">
          <div className="font-semibold text-[15px]">{fmtWeekRange(monday)}</div>
          {weekOffset === 0 && <div className="text-[11px] text-forest mt-0.5">This week</div>}
          {weekOffset === 1 && <div className="text-[11px] text-ink-tertiary mt-0.5">Next week</div>}
          {weekOffset > 1 && <div className="text-[11px] text-ink-tertiary mt-0.5">In {weekOffset} weeks</div>}
        </div>
        <button
          onClick={() => navigate(1)}
          disabled={!canGoForward}
          className="btn-ghost text-sm disabled:opacity-30"
        >
          Next week →
        </button>
      </div>

      {/* Week summary pill */}
      {!loading && totalThisWeek > 0 && (
        <div className="mb-4 flex items-center gap-2 text-[13px] text-ink-secondary animate-fadeUp">
          <span className="font-semibold text-ink tabular-nums">{totalThisWeek}</span> report{totalThisWeek !== 1 ? 's' : ''} this week
          {onlyWatchlist && <span className="text-forest">· watchlist only</span>}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card space-y-2">
              <div className="skel h-3 w-12 mb-3" />
              <div className="skel h-8 w-full" />
              <div className="skel h-8 w-4/5" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Calendar grid */}
          <div className="grid grid-cols-5 gap-3">
            {days.map((day) => {
              const ds = isoDate(day);
              const dayEvents = byDay[ds] || [];
              const today = isToday(day);
              const past = isPast(day);

              return (
                <div key={ds} className={`flex flex-col gap-1 min-h-[140px] ${past && !today ? 'opacity-50' : ''}`}>
                  {/* Day header */}
                  <div
                    className={`text-center py-2 px-1 rounded-xl mb-1 ${today ? 'text-cream' : 'text-ink-secondary'}`}
                    style={today ? { background: 'var(--forest)' } : undefined}
                  >
                    <div className={`text-[11px] font-semibold uppercase tracking-wider ${today ? 'text-cream/80' : 'text-ink-tertiary'}`}>
                      {fmtDay(day)}
                    </div>
                    <div className={`font-serif text-xl tracking-tight1 ${today ? 'text-cream' : 'text-ink'}`}>
                      {day.getDate()}
                    </div>
                    <div className={`text-[10px] ${today ? 'text-cream/70' : 'text-ink-tertiary'}`}>
                      {day.toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                  </div>

                  {/* Event chips */}
                  {dayEvents.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-[11px] text-ink-tertiary py-4">
                      -
                    </div>
                  ) : (
                    dayEvents.slice(0, 6).map((e) => {
                      const timing = e.hour ? TIMING[e.hour] : null;
                      const inWatchlist = watchlist.includes(e.symbol);
                      const isSelected = selected?.symbol === e.symbol && selected?.date === e.date;

                      return (
                        <button
                          key={e.symbol + e.date}
                          onClick={() => setSelected(isSelected ? null : e)}
                          className={`w-full text-left rounded-xl px-2.5 py-2 transition border ${
                            isSelected ? 'border-forest' : 'border-transparent hover:border-hairline'
                          }`}
                          style={{
                            background: isSelected
                              ? 'color-mix(in srgb, var(--forest) 10%, var(--panel-bg))'
                              : inWatchlist
                              ? 'color-mix(in srgb, var(--amber) 8%, var(--panel-bg))'
                              : 'var(--panel-bg)',
                            boxShadow: 'var(--panel-shadow)',
                          }}
                        >
                          <div className="flex items-center gap-1 justify-between">
                            <span className="font-medium text-[12px] truncate">{e.symbol}</span>
                            {inWatchlist && <span className="text-[10px] text-amber flex-shrink-0">★</span>}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            {timing && (
                              <span className="text-[9px]" style={{ color: timing.color }}>
                                {timing.icon}
                              </span>
                            )}
                            {e.estimate != null && (
                              <span className="text-[10px] text-ink-tertiary tabular-nums truncate">
                                EPS est ${e.estimate.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                  {dayEvents.length > 6 && (
                    <div className="text-[10px] text-ink-tertiary text-center py-1">
                      +{dayEvents.length - 6} more
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Empty week state */}
          {totalThisWeek === 0 && (
            <div className="card text-center py-10 mt-4">
              <CalendarDays size={28} className="mx-auto mb-3 text-ink-tertiary" />
              <h3 className="font-serif text-2xl mb-2">Nothing this week</h3>
              <p className="text-ink-secondary text-sm">
                No earnings scheduled{onlyWatchlist ? ' for your watchlist' : ''}.{' '}
                {canGoForward && (
                  <button onClick={() => navigate(1)} className="text-forest hover:underline">
                    Check next week →
                  </button>
                )}
              </p>
            </div>
          )}

          {/* Detail panel */}
          <AnimatePresence>
            {selected && (
              <motion.div
                ref={detailRef}
                key={selected.symbol + selected.date}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="mt-5 card"
              >
                {/* Header row: logo + name + badges + close */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {profile?.logo && (
                      <img
                        src={profile.logo}
                        alt={selected.symbol}
                        className="w-10 h-10 rounded-xl object-contain flex-shrink-0"
                        style={{ background: 'var(--cream-tint)', padding: '4px' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          to={`/dashboard?ticker=${selected.symbol}`}
                          className="font-serif text-3xl tracking-tight1 hover:text-forest transition"
                        >
                          {selected.symbol}
                        </Link>
                        {selected.quarter && selected.year && (
                          <span className="pill" style={{ background: 'var(--cream-tint)', color: 'var(--ink-secondary)' }}>
                            Q{selected.quarter} {selected.year}
                          </span>
                        )}
                        {watchlist.includes(selected.symbol) && (
                          <span className="pill" style={{ background: 'color-mix(in srgb, var(--amber) 15%, var(--cream-tint))', color: 'var(--amber)' }}>
                            ★ Watchlist
                          </span>
                        )}
                      </div>
                      {(profile?.name || profileLoading) && (
                        <div className="text-[13px] text-ink-secondary mt-0.5 truncate">
                          {profileLoading ? <span className="skel inline-block w-32 h-3 rounded" /> : profile?.name}
                        </div>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-ink-tertiary hover:text-ink transition p-1 flex-shrink-0">
                    <X size={16} />
                  </button>
                </div>

                {/* Company description */}
                {(profile?.description || profileLoading) && (
                  <div className="mt-4 text-[13px] text-ink-secondary leading-relaxed">
                    {profileLoading
                      ? <div className="space-y-1.5"><div className="skel h-3 w-full rounded" /><div className="skel h-3 w-4/5 rounded" /></div>
                      : profile?.description && <ExpandableText text={profile.description} maxChars={220} />
                    }
                  </div>
                )}

                {/* Meta row: sector · industry · exchange · employees · website */}
                {profile && !profileLoading && (
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-ink-tertiary">
                    {profile.sector && (
                      <span className="flex items-center gap-1">
                        <Landmark size={11} />
                        {profile.sector}
                      </span>
                    )}
                    {profile.employees && (
                      <span className="flex items-center gap-1">
                        <Users size={11} />
                        {fmtCompact(profile.employees)} employees
                      </span>
                    )}
                    {profile.ipo && (
                      <span>IPO {profile.ipo}</span>
                    )}
                    {profile.website && (
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-0.5 hover:text-forest transition"
                      >
                        <ExternalLink size={10} />
                        {profile.website.replace(/^https?:\/\/(www\.)?/, '')}
                      </a>
                    )}
                  </div>
                )}

                <div className="mt-4 h-px" style={{ background: 'var(--hairline)' }} />

                {/* Earnings stats grid */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <DetailTile
                    label="Date"
                    value={new Date(selected.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  />
                  <DetailTile
                    label="Timing"
                    value={selected.hour ? (TIMING[selected.hour]?.label ?? 'TBD') : 'TBD'}
                    accent={selected.hour ? TIMING[selected.hour]?.color : undefined}
                    prefix={selected.hour ? TIMING[selected.hour]?.icon + ' ' : ''}
                  />
                  {selected.estimate != null && (
                    <DetailTile label="EPS estimate" value={`$${fmtPrice(selected.estimate)}`} accent="var(--forest)" />
                  )}
                  {selected.revenueEstimate != null && (
                    <DetailTile label="Revenue est." value={fmtCompact(selected.revenueEstimate)} />
                  )}
                  {profile?.marketCap != null && (
                    <DetailTile label="Market cap" value={fmtCompact(profile.marketCap)} />
                  )}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link to={`/dashboard?ticker=${selected.symbol}`} className="btn-forest text-sm">
                    Open research <ChevronRight size={13} />
                  </Link>
                  <Link to={`/simulator`} state={{ ticker: selected.symbol }} className="btn-ghost text-sm">
                    Trade in simulator
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

function DetailTile({ label, value, accent, prefix = '' }: { label: string; value: string; accent?: string; prefix?: string }) {
  return (
    <div>
      <div className="eyebrow mb-1">{label}</div>
      <div className="font-medium text-[14px]" style={accent ? { color: accent } : undefined}>
        {prefix}{value}
      </div>
    </div>
  );
}

function ExpandableText({ text, maxChars }: { text: string; maxChars: number }) {
  const [expanded, setExpanded] = useState(false);
  if (text.length <= maxChars) return <>{text}</>;
  return (
    <>
      {expanded ? text : text.slice(0, maxChars).trimEnd() + '…'}
      {' '}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="text-forest hover:underline font-medium text-[12px]"
      >
        {expanded ? 'Show less' : 'Read more'}
      </button>
    </>
  );
}
