import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Activity,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Newspaper,
  Star,
  X,
} from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../contexts/AuthContext';
import { useWatchlist } from '../contexts/WatchlistContext';

const NAV: Array<{ to: string; label: string; icon: React.ReactNode }> = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} strokeWidth={1.8} /> },
  { to: '/watchlist', label: 'Watchlist', icon: <Star size={18} strokeWidth={1.8} /> },
  { to: '/live', label: 'Live charts', icon: <Activity size={18} strokeWidth={1.8} /> },
  { to: '/news', label: 'News', icon: <Newspaper size={18} strokeWidth={1.8} /> },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Mobile top bar */}
      <header
        className="md:hidden sticky top-0 z-30 backdrop-blur border-b border-hairline flex items-center justify-between px-5 h-14"
        style={{ background: 'rgba(245,241,235,0.85)' }}
      >
        <Logo size="sm" />
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-full hover:bg-cream-tint transition"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 bottom-0 w-64 flex-col border-r border-hairline bg-cream-tint/40 backdrop-blur z-20">
        <SidebarBody onNavigate={() => {}} />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/30 animate-fadeUp"
            onClick={() => setOpen(false)}
            style={{ animationDuration: '200ms' }}
          />
          <aside className="absolute top-0 left-0 bottom-0 w-72 bg-cream flex flex-col shadow-xl animate-fadeUp" style={{ animationDuration: '300ms' }}>
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-cream-tint"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
            <SidebarBody onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}

function SidebarBody({ onNavigate }: { onNavigate: () => void }) {
  const { user, logout } = useAuth();
  const { tickers } = useWatchlist();

  return (
    <div className="flex flex-col h-full overflow-y-auto px-5 pt-6 pb-5">
      <div className="px-1 mb-8">
        <Logo size="md" />
      </div>

      <div className="eyebrow px-2 mb-2">Navigate</div>
      <nav className="flex flex-col gap-0.5 mb-8">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-2xl text-[14px] font-medium transition ${
                isActive
                  ? 'bg-white text-ink shadow-card'
                  : 'text-ink-secondary hover:bg-white/60 hover:text-ink'
              }`
            }
          >
            <span className="text-ink-tertiary">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="eyebrow px-2 mb-2 flex items-center justify-between">
        <span>My list</span>
        <span className="text-ink-tertiary normal-case tracking-normal">{tickers.length}</span>
      </div>
      <div className="flex flex-col gap-0.5 mb-8">
        {tickers.length === 0 ? (
          <p className="px-3 py-2 text-[12px] text-ink-tertiary leading-relaxed">
            Star tickers from the dashboard to pin them here.
          </p>
        ) : (
          tickers.slice(0, 12).map((t) => (
            <NavLink
              key={t}
              to={`/dashboard?ticker=${t}`}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-2xl text-[13px] tracking-tight1 transition ${
                  isActive ? 'bg-white text-ink shadow-card' : 'text-ink-secondary hover:bg-white/60 hover:text-ink'
                }`
              }
            >
              <span className="font-medium">{t}</span>
              <ChevronRight size={14} className="text-ink-tertiary" />
            </NavLink>
          ))
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-hairline">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-8 h-8 rounded-full bg-forest flex items-center justify-center text-cream text-xs font-semibold">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium truncate">{user?.name}</div>
            <div className="text-[11px] text-ink-tertiary truncate">{user?.email}</div>
          </div>
          <button
            onClick={() => logout()}
            className="text-ink-tertiary hover:text-ink p-2 rounded-full hover:bg-white/60 transition"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
