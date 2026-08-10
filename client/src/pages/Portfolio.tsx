import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus, X, ArrowRight, ArrowUpRight, TrendingDown, Trash2, PenLine, Landmark, ChevronDown,
} from '../lib/icons';
import { portfolio as portfolioApi } from '../lib/api';
import { useWatchlist } from '../contexts/WatchlistContext';
import { useCurrency } from '../contexts/CurrencyContext';
import Sparkline from '../components/Sparkline';
import SnaptradeConnect from '../components/SnaptradeConnect';
import CurrencyToggle from '../components/CurrencyToggle';
import {
  money, dollars, pct, compact, pnlColor, Monogram, ReturnCell, AreaChart, Donut, Stat, concentration,
} from '../components/portfolio/primitives';
import type { PortfolioData, PortfolioHolding, PortfolioTransaction } from '../types';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const RANGES = ['1W', '1M', '3M', 'YTD', '1Y', 'ALL'] as const;
type Range = (typeof RANGES)[number];
const TABS = ['Overview', 'Accounts', 'Holdings', 'Activity'] as const;
type Tab = (typeof TABS)[number];

const ACTIVITY_LABEL: Record<string, string> = {
  buy: 'Bought', sell: 'Sold', dividend: 'Dividend', deposit: 'Deposit', withdrawal: 'Withdrawal',
};

/** Wealthsimple hands back names like "Wealthsimple Trade TFSA · CAD"; show the useful part. */
export function shortAccountName(name: string): string {
  return name.replace(/^Wealthsimple Trade\s*/i, '').trim() || name;
}

type Modal =
  | { type: 'add-holding' }
  | { type: 'edit-holding'; holding: PortfolioHolding }
  | { type: 'activity' }
  | { type: 'cash' }
  | null;

export default function Portfolio() {
  const navigate = useNavigate();
  const { currency } = useCurrency();
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('Overview');
  const [range, setRange] = useState<Range>('1M');
  const [modal, setModal] = useState<Modal>(null);
  const [showAllActivity, setShowAllActivity] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await portfolioApi.get(undefined, currency));
    } finally { setLoading(false); }
  }, [currency]);

  useEffect(() => { load(); }, [load]);

  // Returning from the Snaptrade portal — pull the freshly linked accounts in.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') !== '1') return;
    portfolioApi.snaptrade.sync()
      .catch((err) => console.error('Sync after connecting failed:', err))
      .finally(() => { window.history.replaceState({}, '', '/portfolio'); load(); });
  }, [load]);

  const rangedHistory = useMemo(() => {
    if (!data?.history?.length) return [];
    const take: Record<Range, number> = { '1W': 7, '1M': 22, '3M': 30, YTD: 30, '1Y': 30, ALL: 30 };
    return data.history.slice(-Math.min(take[range], data.history.length));
  }, [data, range]);

  const cur = data?.displayCurrency ?? currency;
  const s = data?.summary;
  const dayUp = (s?.todayChange ?? 0) >= 0;
  const holdings = data?.holdings ?? [];
  const accounts = data?.accountSummaries ?? [];

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-forest/15 text-forest flex items-center justify-center">
            <Landmark size={17} />
          </div>
          <div>
            <h1 className="font-semibold text-ink leading-tight">Portfolio</h1>
            <p className="text-[11px] text-ink-tertiary">
              {accounts.length} account{accounts.length === 1 ? '' : 's'} · {holdings.length} holdings
            </p>
          </div>
        </div>
        <CurrencyToggle />
      </div>

      {/* ── Hero ── */}
      <div className="card !p-6 mb-5 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -top-24 -right-16 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, color-mix(in srgb, var(--forest) 16%, transparent), transparent 68%)` }}
        />
        <div className="relative">
          <p className="text-xs text-ink-secondary mb-1.5">Total portfolio value</p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <h2 className="text-4xl md:text-5xl font-semibold text-ink tracking-tight tabular-nums">
              {loading ? '—' : `$${(s?.totalValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </h2>
            <span className="text-ink-secondary text-sm font-medium">{cur}</span>
          </div>

          {s && (
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-sm font-medium ${pnlColor(s.todayChange)}`}>
                {dayUp ? <ArrowUpRight size={15} /> : <TrendingDown size={15} />}
                {dollars(s.todayChange)} <span className="text-ink-secondary font-normal">today</span>
              </span>
              <span className="text-ink-tertiary">·</span>
              <span className={`text-sm font-medium ${pnlColor(s.allTimeReturn)}`}>
                {dollars(s.allTimeReturn)} <span className="text-ink-secondary font-normal">all time ({pct(s.allTimeReturnPct)})</span>
              </span>
            </div>
          )}

          {!!data?.unpricedTickers?.length && (
            <p className="mt-2 text-xs text-ink-tertiary">
              Excludes {data.unpricedTickers.join(', ')} — no live price available, so this total is partial.
            </p>
          )}
          {data && data.fxRate == null && (
            <p className="mt-2 text-xs text-brick">
              No FX rate available, so amounts in the other currency are omitted from totals.
            </p>
          )}

          <div className="mt-4"><AreaChart values={rangedHistory} /></div>

          <div className="flex gap-1 mt-3">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                aria-selected={range === r}
                className="tab-pill !px-3 !py-1 !text-[12px]"
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="tab-rail" role="tablist">
          {TABS.map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className="tab-pill">
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModal({ type: 'add-holding' })} className="btn-primary btn-sm">
            <Plus size={14} /> Add holding
          </button>
          <button onClick={() => setModal({ type: 'activity' })} className="btn-forest btn-sm">
            <ArrowRight size={14} /> Log activity
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: EASE }}
            >
              {tab === 'Overview' && (
                <OverviewTab
                  data={data}
                  cur={cur}
                  loading={loading}
                  onOpenAccount={(n) => navigate(`/portfolio/account/${encodeURIComponent(n)}`)}
                />
              )}

              {tab === 'Accounts' && (
                <AccountsTab
                  data={data}
                  cur={cur}
                  onOpenAccount={(n) => navigate(`/portfolio/account/${encodeURIComponent(n)}`)}
                />
              )}

              {tab === 'Holdings' && (
                <HoldingsTable
                  holdings={holdings}
                  cur={cur}
                  loading={loading}
                  onEdit={(h) => setModal({ type: 'edit-holding', holding: h })}
                  onDelete={async (h) => { await portfolioApi.removeHolding(h.id); load(); }}
                  onOpen={(t) => navigate(`/dashboard?ticker=${t}`)}
                />
              )}

              {tab === 'Activity' && (
                <ActivityFeed
                  transactions={data?.transactions ?? []}
                  cur={cur}
                  expanded={showAllActivity}
                  onToggle={() => setShowAllActivity((v) => !v)}
                  onDelete={async (id) => { await portfolioApi.removeTransaction(id); load(); }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Right rail ── */}
        <div className="space-y-4">
          <button onClick={() => setModal({ type: 'cash' })} className="card w-full text-left hover:bg-white/10 transition-all">
            <p className="text-xs text-ink-secondary mb-1">Cash available</p>
            <p className="text-2xl font-semibold text-ink tabular-nums">{money(data?.cash ?? 0, cur)}</p>
          </button>

          {accounts.length > 0 && (
            <div className="card">
              <p className="font-semibold text-ink mb-3">Allocation by account</p>
              <div className="flex items-center gap-4">
                <Donut slices={accounts.map((a, i) => ({ label: a.name, value: a.value, color: ACCOUNT_COLORS[i % ACCOUNT_COLORS.length] }))} />
                <div className="flex-1 space-y-1.5 min-w-0">
                  {accounts.slice(0, 5).map((a, i) => (
                    <div key={a.name} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ACCOUNT_COLORS[i % ACCOUNT_COLORS.length] }} />
                      <span className="font-medium text-ink flex-1 truncate">{shortAccountName(a.name)}</span>
                      <span className="text-ink-secondary tabular-nums">{a.allocation.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <SnaptradeConnect onConnected={load} />
          <WatchlistRail />
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {modal?.type === 'add-holding' && (
          <Modal title="Add holding" onClose={() => setModal(null)}>
            <HoldingForm accounts={data?.accounts ?? ['RRSP', 'TFSA', 'Cash']} onDone={() => { setModal(null); load(); }} onClose={() => setModal(null)} />
          </Modal>
        )}
        {modal?.type === 'edit-holding' && (
          <Modal title={`Edit ${modal.holding.ticker}`} onClose={() => setModal(null)}>
            <HoldingForm accounts={data?.accounts ?? []} editing={modal.holding} onDone={() => { setModal(null); load(); }} onClose={() => setModal(null)} />
          </Modal>
        )}
        {modal?.type === 'activity' && (
          <Modal title="Log activity" onClose={() => setModal(null)}>
            <ActivityForm onDone={() => { setModal(null); load(); }} onClose={() => setModal(null)} />
          </Modal>
        )}
        {modal?.type === 'cash' && (
          <Modal title="Cash available" onClose={() => setModal(null)}>
            <CashForm cash={data?.cash ?? 0} currency={cur} onDone={() => { setModal(null); load(); }} onClose={() => setModal(null)} />
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

const ACCOUNT_COLORS = ['#10B981', '#3b5bdb', '#c2410c', '#7c3aed', '#0891b2', '#be123c', '#a16207'];

/* ── Overview ───────────────────────────────────────────────────────────────── */

function OverviewTab({ data, cur, loading, onOpenAccount }: {
  data: PortfolioData | null;
  cur: string;
  loading: boolean;
  onOpenAccount: (name: string) => void;
}) {
  const holdings = data?.holdings ?? [];
  const s = data?.summary;
  const conc = useMemo(() => concentration(holdings), [holdings]);

  const best = [...holdings].filter((h) => h.allTimeReturnPct != null).sort((a, b) => (b.allTimeReturnPct ?? 0) - (a.allTimeReturnPct ?? 0))[0];
  const worst = [...holdings].filter((h) => h.allTimeReturnPct != null).sort((a, b) => (a.allTimeReturnPct ?? 0) - (b.allTimeReturnPct ?? 0))[0];

  if (loading && !data) return <div className="card text-sm text-ink-secondary">Loading your portfolio…</div>;

  if (!holdings.length) {
    return (
      <div className="card text-center py-10">
        <p className="font-medium text-ink mb-1">No holdings yet</p>
        <p className="text-sm text-ink-secondary">Connect a broker or add a holding to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Invested" value={compact(s?.investedValue)} sub={`${holdings.length} positions`} />
        <Stat label="Cost basis" value={compact(s?.totalCost)} />
        <Stat label="Unrealized" value={dollars(s?.allTimeReturn)} sub={pct(s?.allTimeReturnPct)} tone={(s?.allTimeReturn ?? 0) >= 0 ? 'up' : 'down'} />
        <Stat label="Top position" value={`${conc.top.toFixed(0)}%`} sub={`Top 3 · ${conc.top3.toFixed(0)}%`} />
      </div>

      {(best || worst) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {best && <MoverCard title="Best performer" h={best} />}
          {worst && worst.id !== best?.id && <MoverCard title="Weakest performer" h={worst} />}
        </div>
      )}

      <div className="card">
        <p className="font-semibold text-ink mb-3">Accounts</p>
        <div className="space-y-1">
          {(data?.accountSummaries ?? []).map((a, i) => (
            <button
              key={a.name}
              onClick={() => onOpenAccount(a.name)}
              className="w-full flex items-center gap-3 px-2 py-2.5 rounded-2xl hover:bg-white/15 transition text-left"
            >
              <span className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                style={{ background: ACCOUNT_COLORS[i % ACCOUNT_COLORS.length] }}>
                {shortAccountName(a.name).slice(0, 2).toUpperCase()}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-ink truncate">{shortAccountName(a.name)}</span>
                <span className="block text-[11px] text-ink-tertiary">{a.holdings} holdings · {a.allocation.toFixed(0)}% of book</span>
              </span>
              <span className="text-right">
                <span className="block text-sm font-semibold text-ink tabular-nums">{money(a.value, cur)}</span>
                <span className={`block text-[11px] tabular-nums ${pnlColor(a.allTimeReturn)}`}>{pct(a.allTimeReturnPct)}</span>
              </span>
              <ChevronDown size={15} className="-rotate-90 text-ink-tertiary flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MoverCard({ title, h }: { title: string; h: PortfolioHolding }) {
  return (
    <div className="card !py-3.5 flex items-center gap-3">
      <Monogram ticker={h.ticker} color={h.color} size={38} />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-ink-tertiary">{title}</p>
        <p className="font-semibold text-ink">{h.ticker}</p>
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold tabular-nums ${pnlColor(h.allTimeReturn)}`}>{pct(h.allTimeReturnPct)}</p>
        <p className={`text-[11px] tabular-nums ${pnlColor(h.allTimeReturn)}`}>{dollars(h.allTimeReturn)}</p>
      </div>
    </div>
  );
}

/* ── Accounts tab ───────────────────────────────────────────────────────────── */

function AccountsTab({ data, cur, onOpenAccount }: {
  data: PortfolioData | null;
  cur: string;
  onOpenAccount: (name: string) => void;
}) {
  const accounts = data?.accountSummaries ?? [];
  const holdings = data?.holdings ?? [];

  if (!accounts.length) return <div className="card text-sm text-ink-secondary">No accounts yet.</div>;

  return (
    <div className="space-y-3">
      {accounts.map((a, i) => {
        const own = holdings.filter((h) => h.account === a.name).slice(0, 4);
        return (
          <div key={a.name} className="card">
            <button onClick={() => onOpenAccount(a.name)} className="w-full flex items-center gap-3 mb-3 text-left group">
              <span className="w-9 h-9 rounded-2xl flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0"
                style={{ background: ACCOUNT_COLORS[i % ACCOUNT_COLORS.length] }}>
                {shortAccountName(a.name).slice(0, 2).toUpperCase()}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-ink truncate group-hover:underline">{shortAccountName(a.name)}</span>
                <span className="block text-[11px] text-ink-tertiary">{a.holdings} holdings</span>
              </span>
              <span className="text-right">
                <span className="block font-semibold text-ink tabular-nums">{money(a.value, cur)}</span>
                <span className={`block text-xs tabular-nums ${pnlColor(a.todayChange)}`}>{dollars(a.todayChange)} today</span>
              </span>
            </button>

            <div className="flex flex-wrap gap-1.5">
              {own.map((h) => (
                <span key={h.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px]"
                  style={{ background: 'color-mix(in srgb, var(--ink) 6%, transparent)' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: h.color }} />
                  <span className="font-medium text-ink">{h.ticker}</span>
                  <span className={pnlColor(h.allTimeReturn)}>{pct(h.allTimeReturnPct)}</span>
                </span>
              ))}
              {a.holdings > own.length && (
                <button onClick={() => onOpenAccount(a.name)} className="text-[12px] px-2.5 py-1 rounded-full text-ink-secondary hover:text-ink transition"
                  style={{ background: 'color-mix(in srgb, var(--ink) 6%, transparent)' }}>
                  +{a.holdings - own.length} more
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Holdings table ─────────────────────────────────────────────────────────── */

export function HoldingsTable({ holdings, cur, loading, onEdit, onDelete, onOpen, groupByAccount = true }: {
  holdings: PortfolioHolding[];
  cur: string;
  loading?: boolean;
  onEdit?: (h: PortfolioHolding) => void;
  onDelete?: (h: PortfolioHolding) => void;
  onOpen: (ticker: string) => void;
  groupByAccount?: boolean;
}) {
  const groups = useMemo(() => {
    if (!groupByAccount) return [{ name: '', rows: holdings }];
    const map = new Map<string, PortfolioHolding[]>();
    for (const h of holdings) map.set(h.account, [...(map.get(h.account) ?? []), h]);
    return [...map.entries()]
      .map(([name, rows]) => ({ name, rows: rows.sort((a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0)) }))
      .sort((a, b) => b.rows.reduce((s, h) => s + (h.marketValue ?? 0), 0) - a.rows.reduce((s, h) => s + (h.marketValue ?? 0), 0));
  }, [holdings, groupByAccount]);

  if (loading && !holdings.length) return <div className="card text-sm text-ink-secondary">Loading holdings…</div>;
  if (!holdings.length) return <div className="card text-sm text-ink-secondary">No holdings yet.</div>;

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.name || 'all'} className="card !px-0 !py-0 overflow-hidden">
          {g.name && (
            <div className="px-4 py-2.5 border-b border-hairline flex items-center justify-between">
              <p className="text-[13px] font-semibold text-ink">{shortAccountName(g.name)}</p>
              <p className="text-[12px] text-ink-secondary tabular-nums">
                {money(g.rows.reduce((s, h) => s + (h.marketValue ?? 0), 0), cur)}
              </p>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-ink-tertiary">
                  <th className="text-left font-medium px-4 py-2">Holding</th>
                  <th className="text-right font-medium px-2 py-2">Qty</th>
                  <th className="text-right font-medium px-2 py-2 hidden sm:table-cell">Price</th>
                  <th className="text-right font-medium px-2 py-2">Value</th>
                  <th className="text-right font-medium px-4 py-2">All-time</th>
                  {(onEdit || onDelete) && <th className="w-16" />}
                </tr>
              </thead>
              <tbody>
                {g.rows.map((h) => (
                  <tr key={h.id} className="border-t border-hairline hover:bg-white/8 transition group">
                    <td className="px-4 py-2.5">
                      <button onClick={() => onOpen(h.ticker)} className="flex items-center gap-2.5 text-left">
                        <Monogram ticker={h.ticker} color={h.color} size={30} />
                        <span>
                          <span className="block font-medium text-ink leading-tight">{h.ticker}</span>
                          <span className="block text-[11px] text-ink-tertiary">
                            {h.allocation.toFixed(1)}%{h.nativeCurrency && h.nativeCurrency !== cur ? ` · ${h.nativeCurrency}` : ''}
                          </span>
                        </span>
                      </button>
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-ink-secondary">
                      {h.quantity.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-ink-secondary hidden sm:table-cell">
                      {h.price == null ? '—' : `$${h.price.toFixed(2)}`}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums font-medium text-ink">
                      {h.marketValue == null ? '—' : `$${h.marketValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}`}
                    </td>
                    <td className="px-4 py-2.5">
                      <ReturnCell amount={h.allTimeReturn} percent={h.allTimeReturnPct} />
                    </td>
                    {(onEdit || onDelete) && (
                      <td className="pr-3">
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                          {onEdit && (
                            <button onClick={() => onEdit(h)} className="p-1.5 rounded-full hover:bg-white/20" aria-label={`Edit ${h.ticker}`}>
                              <PenLine size={13} className="text-ink-tertiary" />
                            </button>
                          )}
                          {onDelete && (
                            <button onClick={() => onDelete(h)} className="p-1.5 rounded-full hover:bg-white/20" aria-label={`Remove ${h.ticker}`}>
                              <Trash2 size={13} className="text-ink-tertiary" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Activity ───────────────────────────────────────────────────────────────── */

const PREVIEW_COUNT = 5;

export function ActivityFeed({ transactions, cur, expanded, onToggle, onDelete }: {
  transactions: PortfolioTransaction[];
  cur: string;
  expanded: boolean;
  onToggle: () => void;
  onDelete?: (id: string) => void;
}) {
  const shown = expanded ? transactions : transactions.slice(0, PREVIEW_COUNT);

  if (!transactions.length) return <div className="card text-sm text-ink-secondary">No activity recorded yet.</div>;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-ink">Recent activity</p>
        <p className="text-[11px] text-ink-tertiary">{transactions.length} total</p>
      </div>

      <div className="space-y-0.5">
        {shown.map((t) => (
          <div key={t.id} className="flex items-center gap-3 px-2 py-2.5 rounded-2xl hover:bg-white/10 transition group">
            <Monogram ticker={t.ticker ?? '$'} color={t.color} size={32} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-ink truncate">
                {ACTIVITY_LABEL[t.type] ?? t.type}{t.ticker ? ` ${t.ticker}` : ''}
              </p>
              <p className="text-[11px] text-ink-tertiary truncate">
                {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {t.quantity != null && t.price != null ? ` · ${t.quantity} @ $${t.price.toFixed(2)}` : ''}
              </p>
            </div>
            <p className={`text-sm tabular-nums font-medium ${t.type === 'sell' || t.type === 'dividend' || t.type === 'deposit' ? 'text-forest' : 'text-ink'}`}>
              {money(t.amount, cur)}
            </p>
            {onDelete && (
              <button onClick={() => onDelete(t.id)} className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-white/20 transition" aria-label="Remove">
                <Trash2 size={13} className="text-ink-tertiary" />
              </button>
            )}
          </div>
        ))}
      </div>

      {transactions.length > PREVIEW_COUNT && (
        <button onClick={onToggle} className="btn-ghost btn-sm w-full mt-3">
          {expanded ? 'Show less' : `Show all ${transactions.length}`}
        </button>
      )}
    </div>
  );
}

/* ── Watchlist rail ─────────────────────────────────────────────────────────── */

function WatchlistRail() {
  const { tickers, snaps } = useWatchlist();
  const navigate = useNavigate();
  if (!tickers.length) return null;

  return (
    <div className="card">
      <p className="font-semibold text-ink mb-3">Watchlist</p>
      <div className="space-y-0.5">
        {tickers.slice(0, 6).map((t) => {
          const snap = snaps[t];
          const q = snap?.quote;
          const spark = snap?.spark ?? [];
          return (
            <button
              key={t}
              onClick={() => navigate(`/dashboard?ticker=${t}`)}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-2xl hover:bg-white/15 transition"
            >
              <span className="font-medium text-ink text-[13px] w-14 text-left truncate">{t}</span>
              <span className="flex-1">{spark.length > 1 && <Sparkline values={spark} width={44} height={18} />}</span>
              <span className="text-right">
                <span className="block text-[12px] tabular-nums text-ink">{q?.price != null ? `$${q.price.toFixed(2)}` : '—'}</span>
                <span className={`block text-[10px] tabular-nums ${pnlColor(q?.changePct ?? null)}`}>{pct(q?.changePct ?? null)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Modal shell + forms ────────────────────────────────────────────────────── */

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.24, ease: EASE }}
        className="relative w-full max-w-sm rounded-3xl p-5 shadow-2xl"
        style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(28px) saturate(180%)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-ink">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 transition" aria-label="Close">
            <X size={16} className="text-ink-tertiary" />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 rounded-2xl text-sm outline-none';
const inputStyle = { background: 'color-mix(in srgb, var(--ink) 5%, transparent)', border: '1px solid var(--glass-border)', color: 'var(--ink)' } as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wide text-ink-tertiary mb-1">{label}</span>
      {children}
    </label>
  );
}

function HoldingForm({ accounts, editing, onDone, onClose }: {
  accounts: string[];
  editing?: PortfolioHolding;
  onDone: () => void;
  onClose: () => void;
}) {
  const [ticker, setTicker] = useState(editing?.ticker ?? '');
  const [quantity, setQuantity] = useState(String(editing?.quantity ?? ''));
  const [avgCost, setAvgCost] = useState(String(editing?.avgCost ?? ''));
  const [currency, setCurrency] = useState(editing?.nativeCurrency ?? editing?.currency ?? 'CAD');
  const [account, setAccount] = useState(editing?.account ?? accounts[0] ?? 'RRSP');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    const q = Number(quantity), c = Number(avgCost);
    if (!ticker.trim()) return setError('Ticker is required.');
    if (!Number.isFinite(q) || q <= 0) return setError('Quantity must be greater than zero.');
    if (!Number.isFinite(c) || c < 0) return setError('Average cost must be zero or more.');

    setSaving(true);
    try {
      if (editing) await portfolioApi.updateHolding(editing.id, { quantity: q, avgCost: c, currency, account });
      else await portfolioApi.addHolding({ ticker: ticker.trim().toUpperCase(), quantity: q, avgCost: c, currency, account });
      onDone();
    } catch (err) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Could not save.');
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-3">
      <Field label="Ticker">
        <input className={inputCls} style={inputStyle} value={ticker} disabled={!!editing}
          onChange={(e) => setTicker(e.target.value)} placeholder="AAPL" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantity">
          <input className={inputCls} style={inputStyle} value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="decimal" placeholder="10" />
        </Field>
        <Field label="Avg cost">
          <input className={inputCls} style={inputStyle} value={avgCost} onChange={(e) => setAvgCost(e.target.value)} inputMode="decimal" placeholder="150.00" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Currency">
          <select className={inputCls} style={inputStyle} value={currency} onChange={(e) => setCurrency(e.target.value as 'CAD' | 'USD')}>
            <option value="CAD">🇨🇦 CAD</option>
            <option value="USD">🇺🇸 USD</option>
          </select>
        </Field>
        <Field label="Account">
          <input className={inputCls} style={inputStyle} value={account} onChange={(e) => setAccount(e.target.value)} list="pf-accounts" />
          <datalist id="pf-accounts">{accounts.map((a) => <option key={a} value={a} />)}</datalist>
        </Field>
      </div>
      {error && <p className="text-xs text-brick">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button onClick={onClose} className="btn-ghost btn-sm flex-1">Cancel</button>
        <button onClick={submit} disabled={saving} className="btn-forest btn-sm flex-1">
          {saving ? 'Saving…' : editing ? 'Save changes' : 'Add holding'}
        </button>
      </div>
    </div>
  );
}

function ActivityForm({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const [type, setType] = useState('buy');
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'CAD' | 'USD'>('CAD');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsTicker = type === 'buy' || type === 'sell' || type === 'dividend';

  async function submit() {
    setError(null);
    const a = Number(amount);
    if (!Number.isFinite(a) || a <= 0) return setError('Amount must be greater than zero.');
    setSaving(true);
    try {
      await portfolioApi.addTransaction({
        type, amount: a, currency, date,
        ...(needsTicker && ticker ? { ticker: ticker.trim().toUpperCase() } : {}),
        ...(quantity ? { quantity: Number(quantity) } : {}),
        ...(price ? { price: Number(price) } : {}),
      });
      onDone();
    } catch (err) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Could not save.');
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-3">
      <Field label="Type">
        <select className={inputCls} style={inputStyle} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="buy">Buy</option><option value="sell">Sell</option><option value="dividend">Dividend</option>
          <option value="deposit">Deposit</option><option value="withdrawal">Withdrawal</option>
        </select>
      </Field>
      {needsTicker && (
        <div className="grid grid-cols-3 gap-3">
          <Field label="Ticker"><input className={inputCls} style={inputStyle} value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="AAPL" /></Field>
          <Field label="Qty"><input className={inputCls} style={inputStyle} value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="decimal" /></Field>
          <Field label="Price"><input className={inputCls} style={inputStyle} value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" /></Field>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        <Field label="Amount"><input className={inputCls} style={inputStyle} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" /></Field>
        <Field label="Currency">
          <select className={inputCls} style={inputStyle} value={currency} onChange={(e) => setCurrency(e.target.value as 'CAD' | 'USD')}>
            <option value="CAD">🇨🇦 CAD</option><option value="USD">🇺🇸 USD</option>
          </select>
        </Field>
        <Field label="Date"><input type="date" className={inputCls} style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      </div>
      {error && <p className="text-xs text-brick">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button onClick={onClose} className="btn-ghost btn-sm flex-1">Cancel</button>
        <button onClick={submit} disabled={saving} className="btn-forest btn-sm flex-1">{saving ? 'Saving…' : 'Log activity'}</button>
      </div>
    </div>
  );
}

function CashForm({ cash, currency, onDone, onClose }: { cash: number; currency: string; onDone: () => void; onClose: () => void }) {
  const [value, setValue] = useState(String(cash));
  const [cur, setCur] = useState<'CAD' | 'USD'>(currency === 'USD' ? 'USD' : 'CAD');
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try { await portfolioApi.setCash(Number(value) || 0, cur); onDone(); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cash"><input className={inputCls} style={inputStyle} value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" /></Field>
        <Field label="Currency">
          <select className={inputCls} style={inputStyle} value={cur} onChange={(e) => setCur(e.target.value as 'CAD' | 'USD')}>
            <option value="CAD">🇨🇦 CAD</option><option value="USD">🇺🇸 USD</option>
          </select>
        </Field>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onClose} className="btn-ghost btn-sm flex-1">Cancel</button>
        <button onClick={submit} disabled={saving} className="btn-forest btn-sm flex-1">{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </div>
  );
}
