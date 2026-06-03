import { FormEvent, useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';

interface Props {
  onSearch: (ticker: string) => void;
  compact?: boolean;
  initial?: string;
}

const PLACEHOLDERS = ['NVDA', 'AAPL', 'SOFI', 'TSLA', 'AMZN', 'MSFT', 'IONQ', 'PLTR'];

export default function SearchBar({ onSearch, compact, initial = '' }: Props) {
  const [value, setValue] = useState(initial);
  const [phIndex, setPhIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setPhIndex((i) => (i + 1) % PLACEHOLDERS.length), 2500);
    return () => clearInterval(id);
  }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
    const v = value.trim().toUpperCase();
    if (!v) return;
    onSearch(v);
  }

  const pad = compact ? 'pl-11 pr-24 py-2.5 text-sm' : 'pl-14 pr-28 py-4 text-base';
  const btn = compact ? 'right-1.5 top-1/2 -translate-y-1/2 text-xs px-3 py-1.5' : 'right-2 top-1/2 -translate-y-1/2 px-4 py-2';

  return (
    <form onSubmit={submit} className="relative w-full">
      <Search
        size={compact ? 16 : 20}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-tertiary"
      />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={`Search ${PLACEHOLDERS[phIndex]}…`}
        className={`w-full bg-white shadow-card rounded-full ${pad} placeholder:text-ink-tertiary focus:shadow-cardHover transition uppercase tracking-tight1`}
        autoComplete="off"
        spellCheck={false}
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue('')}
          className={`absolute ${compact ? 'right-20' : 'right-24'} top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink p-1`}
          aria-label="Clear"
        >
          <X size={compact ? 14 : 16} />
        </button>
      )}
      <button type="submit" className={`absolute ${btn} bg-ink text-cream rounded-full font-medium transition active:scale-[0.97] hover:bg-black`}>
        Search
      </button>
    </form>
  );
}
