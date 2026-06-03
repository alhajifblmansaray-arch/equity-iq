import { useCallback, useState } from 'react';
import { research } from '../lib/api';
import type { ResearchReport } from '../types';

interface State {
  data: ResearchReport | null;
  loading: boolean;
  error: string | null;
  ticker: string | null;
}

export function useResearch() {
  const [state, setState] = useState<State>({ data: null, loading: false, error: null, ticker: null });

  const load = useCallback(async (ticker: string) => {
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    setState({ data: null, loading: true, error: null, ticker: t });
    try {
      const data = await research.get(t);
      setState({ data, loading: false, error: null, ticker: t });
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to load research report.';
      setState({ data: null, loading: false, error: msg, ticker: t });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null, ticker: null });
  }, []);

  return { ...state, load, reset };
}
