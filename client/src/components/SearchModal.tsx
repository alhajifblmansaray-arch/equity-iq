import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X } from '../lib/icons';
import { useWatchlist } from '../contexts/WatchlistContext';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

/** Handful of well-known names so an empty box is still useful. */
const SUGGESTED = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'TSLA', 'SPY', 'ENB.TO'];

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const navigate = useNavigate();
  const { tickers } = useWatchlist();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setCursor(0);
    // Wait for the mount animation so focus lands reliably.
    const id = setTimeout(() => inputRef.current?.focus(), 40);
    return () => clearTimeout(id);
  }, [open]);

  // The pool is the user's own list first, then familiar names.
  const results = useMemo(() => {
    const pool = [...new Set([...tickers, ...SUGGESTED])];
    const q = query.trim().toUpperCase();
    if (!q) return pool.slice(0, 8);
    const matches = pool.filter((t) => t.includes(q)).slice(0, 8);
    // Always allow searching a symbol we've never seen before.
    return matches.includes(q) || !/^[A-Z0-9.\-]{1,10}$/.test(q) ? matches : [q, ...matches].slice(0, 8);
  }, [query, tickers]);

  function go(ticker: string) {
    onClose();
    navigate(`/dashboard?ticker=${encodeURIComponent(ticker)}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); const t = results[cursor] ?? query.trim().toUpperCase(); if (t) go(t); }
    else if (e.key === 'Escape') { onClose(); }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
            style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(28px) saturate(180%)' }}
            role="dialog"
            aria-label="Search symbols"
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-hairline">
              <Search size={18} className="text-ink-tertiary flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
                onKeyDown={onKeyDown}
                placeholder="Search a symbol - AAPL, ENB.TO…"
                className="flex-1 bg-transparent outline-none text-[15px] text-ink placeholder:text-ink-tertiary"
                autoComplete="off"
                spellCheck={false}
              />
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/15 transition" aria-label="Close search">
                <X size={16} className="text-ink-tertiary" />
              </button>
            </div>

            <div className="max-h-[46dvh] overflow-y-auto py-2">
              {results.length === 0 ? (
                <p className="px-5 py-6 text-sm text-ink-tertiary text-center">No matches. Type a full symbol to look it up.</p>
              ) : (
                results.map((t, i) => (
                  <button
                    key={t}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => go(t)}
                    className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition ${i === cursor ? 'bg-white/12' : ''}`}
                  >
                    <span className="font-mono font-semibold text-ink text-[14px] w-20">{t}</span>
                    <span className="text-xs text-ink-tertiary flex-1">
                      {tickers.includes(t) ? 'On your watchlist' : 'Open research'}
                    </span>
                    <span className="text-[11px] text-ink-tertiary">↵</span>
                  </button>
                ))
              )}
            </div>

            <div className="px-5 py-2.5 border-t border-hairline flex items-center gap-3 text-[11px] text-ink-tertiary">
              <span>↑↓ navigate</span><span>↵ open</span><span>esc close</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
