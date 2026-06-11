import { FormEvent, useEffect, useState } from 'react';
import { Search, X } from '../lib/icons';

interface Props {
  onSearch: (ticker: string) => void;
  compact?: boolean;
  initial?: string;
}

const PLACEHOLDERS = ['NVDA', 'AAPL', 'SOFI', 'TSLA', 'AMZN', 'MSFT', 'IONQ', 'PLTR'];

export default function SearchBar({ onSearch, compact, initial = '' }: Props) {
  const [value, setValue] = useState(initial);
  const [phIndex, setPhIndex] = useState(0);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setPhIndex((i) => (i + 1) % PLACEHOLDERS.length), 2800);
    return () => clearInterval(id);
  }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
    const v = value.trim().toUpperCase();
    if (!v) return;
    onSearch(v);
  }

  const isCompact = compact;

  return (
    <form onSubmit={submit} className="relative w-full">
      <Search
        size={isCompact ? 15 : 18}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-tertiary pointer-events-none transition-colors"
        style={{ color: focused ? 'var(--forest)' : undefined }}
      />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={`Search ${PLACEHOLDERS[phIndex]}…`}
        className={`w-full rounded-2xl uppercase tracking-tight1 placeholder:text-ink-tertiary placeholder:normal-case placeholder:tracking-normal transition-all ${
          isCompact
            ? 'pl-10 pr-20 py-2.5 text-sm'
            : 'pl-12 pr-28 py-3.5 text-base'
        }`}
        style={{
          background: 'var(--panel-bg)',
          backdropFilter: 'blur(16px) saturate(160%)',
          WebkitBackdropFilter: 'blur(16px) saturate(160%)',
          border: `1px solid ${focused ? 'rgba(46,93,67,0.40)' : 'var(--hairline)'}`,
          boxShadow: focused
            ? '0 0 0 3px rgba(46,93,67,0.10), 0 2px 8px rgba(0,0,0,0.06)'
            : 'var(--panel-shadow)',
          outline: 'none',
        }}
        autoComplete="off"
        spellCheck={false}
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue('')}
          className="absolute top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink p-1 transition"
          style={{ right: isCompact ? '72px' : '88px' }}
          aria-label="Clear"
        >
          <X size={isCompact ? 13 : 15} />
        </button>
      )}
      <button
        type="submit"
        className={`absolute top-1/2 -translate-y-1/2 btn-forest ${
          isCompact ? 'right-1.5 text-xs px-3 py-1.5' : 'right-1.5 text-sm px-4 py-2'
        }`}
        style={{ borderRadius: '14px' }}
      >
        Search
      </button>
    </form>
  );
}
