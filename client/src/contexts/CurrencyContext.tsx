import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Currency } from '../types';

const STORAGE_KEY = 'equityiq.currency';

interface CurrencyState {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  toggle: () => void;
}

const CurrencyContext = createContext<CurrencyState | null>(null);

/** CAD is the reporting default; USD is opt-in via the toggle. */
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return saved === 'USD' ? 'USD' : 'CAD';
  });

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    try { localStorage.setItem(STORAGE_KEY, c); } catch { /* private mode */ }
  }, []);

  const toggle = useCallback(() => setCurrency(currency === 'CAD' ? 'USD' : 'CAD'), [currency, setCurrency]);

  const value = useMemo(() => ({ currency, setCurrency, toggle }), [currency, setCurrency, toggle]);
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyState {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used inside CurrencyProvider');
  return ctx;
}
