import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { research, watchlist as wlApi } from '../lib/api';
import type { NormalizedQuote } from '../types';
import { useAuth } from './AuthContext';

export interface TickerSnap {
  quote: NormalizedQuote | null;
  spark: number[]; // ~7 day closes
}

interface WatchlistContextValue {
  tickers: string[];
  snaps: Record<string, TickerSnap>;
  loading: boolean;
  has: (ticker: string) => boolean;
  add: (ticker: string) => Promise<void>;
  remove: (ticker: string) => Promise<void>;
  toggle: (ticker: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<WatchlistContextValue | undefined>(undefined);

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tickers, setTickers] = useState<string[]>([]);
  const [snaps, setSnaps] = useState<Record<string, TickerSnap>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setTickers([]);
      setSnaps({});
      return;
    }
    let alive = true;
    setLoading(true);
    wlApi
      .get()
      .then((list) => {
        if (alive) setTickers(list);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [user]);

  // Fetch quotes + sparklines for any ticker we don't have data for yet.
  // Sparklines use the daily-close endpoint so they work even for thinly
  // traded tickers where intraday data isn't available.
  useEffect(() => {
    let alive = true;
    tickers.forEach((t) => {
      if (snaps[t]) return;
      Promise.all([
        research.quote(t).catch(() => null),
        research.spark(t, 10).catch(() => null),
      ]).then(([q, spark]) => {
        if (!alive) return;
        setSnaps((prev) => ({
          ...prev,
          [t]: { quote: q?.quote || null, spark: spark?.closes || [] },
        }));
      });
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickers]);

  const has = useCallback((t: string) => tickers.includes(t.toUpperCase()), [tickers]);

  const add = useCallback(async (t: string) => {
    const list = await wlApi.add(t);
    setTickers(list);
  }, []);

  const remove = useCallback(async (t: string) => {
    const list = await wlApi.remove(t);
    setTickers(list);
    setSnaps((prev) => {
      const { [t.toUpperCase()]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const toggle = useCallback(
    async (t: string) => {
      if (has(t)) await remove(t);
      else await add(t);
    },
    [has, add, remove]
  );

  const refresh = useCallback(async () => {
    const list = await wlApi.get();
    setTickers(list);
    setSnaps({});
  }, []);

  const value = useMemo(
    () => ({ tickers, snaps, loading, has, add, remove, toggle, refresh }),
    [tickers, snaps, loading, has, add, remove, toggle, refresh]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWatchlist(): WatchlistContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useWatchlist must be used inside <WatchlistProvider>');
  return ctx;
}
