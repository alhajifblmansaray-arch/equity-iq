import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, AlertCircle, Pause, Play, TrendingDown, TrendingUp } from '../lib/icons';
import SearchBar from '../components/SearchBar';
import { useWatchlist } from '../contexts/WatchlistContext';
import { IntradayInterval, research } from '../lib/api';
import type { NormalizedBar, NormalizedQuote } from '../types';
import { fmtPct, fmtPrice } from '../lib/helpers';
import { useLivePrice } from '../hooks/useLivePrice';

const INTERVALS: IntradayInterval[] = ['1min', '5min', '15min', '30min', '1h'];
const INTERVAL_LABEL: Record<IntradayInterval, string> = {
  '1min': '1m',
  '5min': '5m',
  '15min': '15m',
  '30min': '30m',
  '1h': '1h',
};
const POLL_MS = 30_000;

export default function LivePage() {
  const [params, setParams] = useSearchParams();
  const { tickers } = useWatchlist();
  const initial = params.get('ticker') || tickers[0] || '';
  const [ticker, setTicker] = useState(initial.toUpperCase());
  const [interval, setIntervalState] = useState<IntradayInterval>('5min');
  const [bars, setBars] = useState<NormalizedBar[] | null>(null);
  const [quote, setQuote] = useState<NormalizedQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [tick, setTick] = useState(0); // forces refetch
  const lastFetched = useRef<number>(0);

  const load = useCallback(async () => {
    if (!ticker) return;
    setLoading(true);
    setError(null);
    try {
      const r = await research.intraday(ticker, interval, 200);
      setBars(r.bars);
      setQuote(r.quote);
      lastFetched.current = Date.now();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not load live data.');
    } finally {
      setLoading(false);
    }
  }, [ticker, interval]);

  useEffect(() => {
    load();
  }, [load, tick]);

  // Polling
  useEffect(() => {
    if (paused || !ticker) return;
    const id = setInterval(() => setTick((t) => t + 1), POLL_MS);
    return () => clearInterval(id);
  }, [paused, ticker, interval]);

  function onSearch(t: string) {
    const upper = t.toUpperCase();
    setTicker(upper);
    setParams({ ticker: upper });
  }

  const last = bars && bars.length ? bars[bars.length - 1] : null;
  const first = bars && bars.length ? bars[0] : null;
  const sessionChange = first && last ? last.close - first.close : null;
  const sessionPct = first && first.close ? ((last!.close - first.close) / first.close) * 100 : null;

  // Real-time tick stream
  const { tick: liveTick, lastUpdate: liveLastUpdate } = useLivePrice(ticker || null);
  const isStreamingLive = useMemo(
    () => !!(liveTick && liveLastUpdate && Date.now() - liveLastUpdate < 60_000),
    [liveTick, liveLastUpdate]
  );
  const displayPrice = liveTick?.price ?? quote?.price ?? last?.close ?? null;
  const liveChange =
    liveTick && quote?.prevClose != null
      ? { change: liveTick.price - quote.prevClose, pct: ((liveTick.price - quote.prevClose) / quote.prevClose) * 100 }
      : null;
  const effChange = liveChange?.change ?? quote?.change ?? sessionChange ?? 0;
  const effPct = liveChange?.pct ?? quote?.changePct ?? sessionPct ?? 0;
  const up = effPct >= 0;
  const color = up ? 'var(--forest)' : 'var(--brick)';

  const tickFmt = (d: string) => {
    const date = new Date(d);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-10">
      <header className="mb-8 animate-fadeUp">
        <div className="flex items-center gap-2 mb-2">
          <Activity size={14} className="text-forest" />
          <span className="eyebrow">Live</span>
          {ticker && (
            isStreamingLive ? (
              <span className="pill pill-forest text-[10px] ml-1">
                <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulseDot" />
                Streaming
              </span>
            ) : !paused ? (
              <span className="pill pill-mute text-[10px] ml-1">Refreshing every 30s</span>
            ) : null
          )}
        </div>
        <h1 className="font-serif text-4xl md:text-5xl tracking-tight2">Real-time charts</h1>
        <p className="text-ink-secondary mt-2 text-[15px]">
          Intraday price action with live tick updates. Falls back to daily bars when intraday isn't
          available.
        </p>
      </header>

      <div className="mb-6 animate-fadeUp animate-delay-1 max-w-xl">
        <SearchBar onSearch={onSearch} initial={ticker} compact />
      </div>

      {!ticker ? (
        <div className="card text-center animate-fadeUp animate-delay-2">
          <Activity size={28} className="mx-auto mb-3 text-ink-tertiary" />
          <h3 className="font-serif text-2xl tracking-tight1 mb-2">Pick a ticker</h3>
          <p className="text-ink-secondary text-sm">Search above to start streaming an intraday chart.</p>
        </div>
      ) : error ? (
        <div className="card text-center animate-fadeUp animate-delay-2">
          <AlertCircle size={24} className="mx-auto mb-3 text-brick" />
          <h3 className="font-serif text-xl tracking-tight1 mb-2">Couldn't load live data</h3>
          <p className="text-ink-secondary text-sm mb-4">{error}</p>
          <button onClick={() => setTick((t) => t + 1)} className="btn-primary mx-auto">
            Try again
          </button>
        </div>
      ) : (
        <div className="card animate-fadeUp animate-delay-2">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
            <div>
              <div className="eyebrow mb-1">{ticker}</div>
              {displayPrice != null ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-ink-tertiary text-2xl font-serif">$</span>
                    <span className="font-serif text-5xl md:text-6xl tracking-tight2 leading-none tabular-nums">
                      {fmtPrice(displayPrice)}
                    </span>
                  </div>
                  <div className={`mt-2 flex items-center gap-2 text-sm font-medium ${up ? 'text-forest' : 'text-brick'}`}>
                    {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    <span className="tabular-nums">{up ? '+' : ''}{fmtPrice(effChange)}</span>
                    <span className="tabular-nums">({fmtPct(effPct)})</span>
                    <span className="text-ink-tertiary font-normal">{isStreamingLive ? 'live' : 'past day'}</span>
                  </div>
                </>
              ) : last ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-ink-tertiary text-2xl font-serif">$</span>
                    <span className="font-serif text-5xl md:text-6xl tracking-tight2 leading-none">
                      {fmtPrice(last.close)}
                    </span>
                  </div>
                  {sessionChange != null && sessionPct != null && (
                    <div className={`mt-2 text-sm font-medium ${sessionChange >= 0 ? 'text-forest' : 'text-brick'}`}>
                      {sessionChange >= 0 ? '+' : ''}{fmtPrice(sessionChange)} ({fmtPct(sessionPct)}) session
                    </div>
                  )}
                </>
              ) : (
                <div className="skel h-14 w-48" />
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setPaused((p) => !p)}
                className="inline-flex items-center gap-1.5 rounded-full bg-cream-tint px-3 py-1.5 text-xs font-medium text-ink-secondary hover:bg-white transition"
                title={paused ? 'Resume polling' : 'Pause polling'}
              >
                {paused ? <Play size={12} /> : <Pause size={12} />}
                {paused ? 'Paused' : 'Live'}
              </button>
              <div className="inline-flex items-center bg-cream-tint rounded-full p-1">
                {INTERVALS.map((i) => (
                  <button
                    key={i}
                    onClick={() => setIntervalState(i)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
                      interval === i ? 'bg-white text-ink shadow-pill' : 'text-ink-secondary'
                    }`}
                  >
                    {INTERVAL_LABEL[i]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-80 -mx-2">
            {loading && !bars ? (
              <div className="skel h-full" />
            ) : bars && bars.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bars} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="liveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'var(--ink-tertiary)' }}
                    interval="preserveStartEnd"
                    tickFormatter={tickFmt}
                    minTickGap={50}
                  />
                  <YAxis
                    orientation="right"
                    tick={{ fontSize: 11, fill: 'var(--ink-tertiary)' }}
                    tickFormatter={(v) => `$${Number(v).toFixed(2)}`}
                    domain={['dataMin - 0.5', 'dataMax + 0.5']}
                    width={60}
                  />
                  <Tooltip
                    cursor={{ stroke: 'var(--ink-tertiary)', strokeDasharray: '2 4' }}
                    contentStyle={{
                      background: 'white',
                      border: 'none',
                      borderRadius: 14,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                      fontSize: 12,
                    }}
                    labelFormatter={(d) =>
                      new Date(String(d)).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    }
                    formatter={(v: any) => [`$${fmtPrice(Number(v))}`, 'Price']}
                  />
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke={color}
                   
                    fill="url(#liveGrad)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-ink-secondary italic text-sm">No bars yet.</p>
            )}
          </div>

          <div className="hairline-divider mt-4 mb-4" />
          <div className="flex items-center justify-between text-xs text-ink-tertiary">
            <span>{bars?.length || 0} bars · {INTERVAL_LABEL[interval]} interval</span>
            <span>
              {paused
                ? 'Polling paused'
                : `Refreshing every ${POLL_MS / 1000}s · last update ${
                    lastFetched.current ? new Date(lastFetched.current).toLocaleTimeString() : '—'
                  }`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
