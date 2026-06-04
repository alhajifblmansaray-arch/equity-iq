import { useState } from 'react';
import { Star } from 'lucide-react';
import { useWatchlist } from '../contexts/WatchlistContext';

export default function WatchlistButton({ ticker }: { ticker: string }) {
  const { has, toggle } = useWatchlist();
  const [busy, setBusy] = useState(false);
  const active = has(ticker);

  async function onClick() {
    if (busy) return;
    setBusy(true);
    try {
      await toggle(ticker);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      title={active ? 'Remove from watchlist' : 'Add to watchlist'}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition active:scale-[0.97] ${
        active
          ? 'bg-[rgba(184,133,58,0.14)] text-amber'
          : 'bg-cream-tint text-ink-secondary hover:text-ink hover:bg-white'
      }`}
    >
      <Star size={13} fill={active ? 'currentColor' : 'none'} strokeWidth={1.8} />
      {active ? 'Saved' : 'Save'}
    </button>
  );
}
