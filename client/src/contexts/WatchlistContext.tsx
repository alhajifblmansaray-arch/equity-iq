import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { watchlist as wlApi } from '../lib/api';
import { useAuth } from './AuthContext';

interface WatchlistContextValue {
  tickers: string[];
  loading: boolean;
  has: (ticker: string) => boolean;
  add: (ticker: string) => Promise<void>;
  remove: (ticker: string) => Promise<void>;
  toggle: (ticker: string) => Promise<void>;
}

const Ctx = createContext<WatchlistContextValue | undefined>(undefined);

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tickers, setTickers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setTickers([]);
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

  const has = useCallback((t: string) => tickers.includes(t.toUpperCase()), [tickers]);

  const add = useCallback(async (t: string) => {
    const list = await wlApi.add(t);
    setTickers(list);
  }, []);

  const remove = useCallback(async (t: string) => {
    const list = await wlApi.remove(t);
    setTickers(list);
  }, []);

  const toggle = useCallback(
    async (t: string) => {
      if (has(t)) await remove(t);
      else await add(t);
    },
    [has, add, remove]
  );

  const value = useMemo(
    () => ({ tickers, loading, has, add, remove, toggle }),
    [tickers, loading, has, add, remove, toggle]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWatchlist(): WatchlistContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useWatchlist must be used inside <WatchlistProvider>');
  return ctx;
}
