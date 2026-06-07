import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Activity,
  Bell,
  CalendarDays,
  GitCompareArrows,
  LayoutDashboard,
  LogOut,
  Menu,
  Newspaper,
  Star,
  X,
} from 'lucide-react';
import Logo from './Logo';
import Sparkline from './Sparkline';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import { useWatchlist } from '../contexts/WatchlistContext';
import { fmtPct, fmtPrice } from '../lib/helpers';

const NAV: Array<{ to: string; label: string; icon: React.ReactNode }> = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} strokeWidth={1.8} /> },
  { to: '/watchlist', label: 'Watchlist', icon: <Star size={18} strokeWidth={1.8} /> },
  { to: '/compare', label: 'Compare', icon: <GitCompareArrows size={18} strokeWidth={1.8} /> },
  { to: '/live', label: 'Live charts', icon: <Activity size={18} strokeWidth={1.8} /> },
  { to: '/news', label: 'News', icon: <Newspaper size={18} strokeWidth={1.8} /> },
  { to: '/calendar', label: 'Earnings', icon: <CalendarDays size={18} strokeWidth={1.8} /> },
  { to: '/alerts', label: 'Alerts', icon: <Bell size={18} strokeWidth={1.8} /> },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Mobile top bar */}
      <header
        className="md:hidden sticky top-0 z-30 flex items-center justify-between px-5 h-14"
        style={{
          background: 'var(--glass-sidebar-bg)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderBottom: '1px solid var(--glass-border)',
        }}
      >
        <Logo size="sm" />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-full hover:bg-cream-tint transition"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex fixed top-0 left-0 bottom-0 w-64 flex-col z-20"
        style={{
          background: 'var(--glass-sidebar-bg)',
          backdropFilter: 'blur(32px) saturate(180%)',
          WebkitBackdropFilter: 'blur(32px) saturate(180%)',
          borderRight: '1px solid var(--glass-border)',
        }}
      >
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
          <aside
            className="absolute top-0 left-0 bottom-0 w-72 bg-cream flex flex-col shadow-xl animate-fadeUp"
            style={{ animationDuration: '300ms' }}
          >
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
  const { tickers, snaps } = useWatchlist();

  return (
    <div className="flex flex-col h-full overflow-y-auto px-5 pt-6 pb-5">
      <div className="px-1 mb-7 flex items-center justify-between">
        <Logo size="md" />
        <ThemeToggle />
      </div>

      <div className="eyebrow px-2 mb-2">Navigate</div>
      <nav className="flex flex-col gap-0.5 mb-7">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-2xl text-[14px] font-medium transition ${
                isActive
                  ? 'glass-chip text-ink'
                  : 'glass-chip-hover text-ink-secondary hover:text-ink'
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
      <div className="flex flex-col gap-0.5 mb-6">
        {tickers.length === 0 ? (
          <p className="px-3 py-2 text-[12px] text-ink-tertiary leading-relaxed">
            Star tickers to pin them here.
          </p>
        ) : (
          tickers.slice(0, 12).map((t) => {
            const snap = snaps[t];
            const q = snap?.quote;
            const up = (q?.changePct ?? 0) >= 0;
            return (
              <NavLink
                key={t}
                to={`/dashboard?ticker=${t}`}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-2xl text-[13px] transition ${
                    isActive ? 'glass-chip text-ink' : 'glass-chip-hover text-ink-secondary hover:text-ink'
                  }`
                }
              >
                <span className="font-medium tracking-tight1 w-12 truncate">{t}</span>
                <span className="flex-1">
                  {snap?.spark?.length ? (
                    <Sparkline values={snap.spark} width={56} height={18} />
                  ) : (
                    <span className="block w-14 h-[18px] skel" style={{ borderRadius: 6 }} />
                  )}
                </span>
                <span className="text-right">
                  {q ? (
                    <>
                      <span className="block text-[12px] tabular-nums font-medium leading-tight">
                        ${fmtPrice(q.price)}
                      </span>
                      <span
                        className={`block text-[10px] tabular-nums leading-tight ${
                          up ? 'text-forest' : 'text-brick'
                        }`}
                      >
                        {fmtPct(q.changePct)}
                      </span>
                    </>
                  ) : (
                    <span className="inline-block w-10 h-3 skel" style={{ borderRadius: 4 }} />
                  )}
                </span>
              </NavLink>
            );
          })
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-hairline">
        <div className="flex items-center gap-3 px-2 py-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
            style={{ background: 'var(--forest)', color: 'var(--cream)' }}
          >
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium truncate">{user?.name}</div>
            <div className="text-[11px] text-ink-tertiary truncate">{user?.email}</div>
          </div>
          <button
            onClick={() => logout()}
            className="text-ink-tertiary hover:text-ink p-2 rounded-full glass-chip-hover"
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
