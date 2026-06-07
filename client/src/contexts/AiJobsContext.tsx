import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';

/**
 * Shared store for long-running AI generations (forecast, outlook, thesis).
 *
 * Cards used to hold their result in local state, so switching dashboard tabs
 * unmounted the card and abandoned the in-flight request. By lifting the job
 * here — above the tabs and pages — a generation keeps running in the
 * background and its result is ready when you navigate back.
 *
 * Jobs are keyed by `${kind}:${ticker}` so each stock keeps its own results.
 */

export type AiJobKind = 'forecast-now' | 'forecast-long' | 'outlook' | 'thesis';
export type AiJobStatus = 'idle' | 'loading' | 'done' | 'error';

interface JobEntry<T = unknown> {
  status: AiJobStatus;
  data?: T;
  error?: string;
  refreshing?: boolean; // a silent re-fetch is in flight; keep showing current data
  startedAt?: number;
  finishedAt?: number;
}

interface StartOpts {
  silent?: boolean; // keep current data on screen while refreshing
}

interface AiJobsContextValue {
  jobs: Record<string, JobEntry>;
  start: (key: string, fetcher: () => Promise<unknown>, opts?: StartOpts) => void;
  reset: (key: string) => void;
}

const Ctx = createContext<AiJobsContextValue | undefined>(undefined);

export function AiJobsProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Record<string, JobEntry>>({});
  const inFlight = useRef<Set<string>>(new Set());

  const start = useCallback((key: string, fetcher: () => Promise<unknown>, opts?: StartOpts) => {
    if (inFlight.current.has(key)) return; // already running — don't double-fire
    inFlight.current.add(key);
    const silent = opts?.silent;
    setJobs((p) => {
      const prev = p[key];
      // Silent refresh of an existing result: keep data + 'done', flag refreshing.
      if (silent && prev?.status === 'done') {
        return { ...p, [key]: { ...prev, refreshing: true } };
      }
      return { ...p, [key]: { status: 'loading', startedAt: Date.now() } };
    });
    fetcher()
      .then((data) =>
        setJobs((p) => ({ ...p, [key]: { status: 'done', data, finishedAt: Date.now(), refreshing: false } }))
      )
      .catch((err: any) => {
        const msg = err?.response?.data?.error || err?.message || 'Something went wrong.';
        setJobs((p) => {
          const prev = p[key];
          // On a silent failure, keep the last good value rather than wiping it.
          if (silent && prev?.data != null) {
            return { ...p, [key]: { ...prev, refreshing: false } };
          }
          return { ...p, [key]: { status: 'error', error: msg, finishedAt: Date.now() } };
        });
      })
      .finally(() => inFlight.current.delete(key));
  }, []);

  const reset = useCallback((key: string) => {
    inFlight.current.delete(key);
    setJobs((p) => {
      const copy = { ...p };
      delete copy[key];
      return copy;
    });
  }, []);

  return <Ctx.Provider value={{ jobs, start, reset }}>{children}</Ctx.Provider>;
}

function keyFor(kind: AiJobKind, ticker: string) {
  return `${kind}:${ticker.toUpperCase()}`;
}

/** Full job handle for a card: status, data, error, and a run() that won't double-fire. */
export function useAiJob<T = unknown>(kind: AiJobKind, ticker: string) {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAiJob must be used within <AiJobsProvider>');
  const key = keyFor(kind, ticker);
  const entry = (ctx.jobs[key] as JobEntry<T>) || { status: 'idle' as AiJobStatus };
  const run = useCallback(
    (fetcher: () => Promise<T>, opts?: StartOpts) => ctx.start(key, fetcher as () => Promise<unknown>, opts),
    [ctx, key]
  );
  const reset = useCallback(() => ctx.reset(key), [ctx, key]);
  return {
    status: entry.status,
    data: entry.data as T | undefined,
    error: entry.error,
    refreshing: !!entry.refreshing,
    run,
    reset,
  };
}

/** Lightweight status peek — for tab indicators that just need loading/done. */
export function useAiJobStatus(kind: AiJobKind, ticker: string): AiJobStatus {
  const ctx = useContext(Ctx);
  if (!ctx) return 'idle';
  return ctx.jobs[keyFor(kind, ticker)]?.status || 'idle';
}
