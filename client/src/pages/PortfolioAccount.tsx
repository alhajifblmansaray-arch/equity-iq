import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, TrendingDown, ArrowUpRight } from '../lib/icons';
import { portfolio as portfolioApi } from '../lib/api';
import { useCurrency } from '../contexts/CurrencyContext';
import CurrencyToggle from '../components/CurrencyToggle';
import {
  money, dollars, pct, compact, pnlColor, Donut, Stat, concentration,
} from '../components/portfolio/primitives';
import { HoldingsTable, ActivityFeed, shortAccountName } from './Portfolio';
import type { PortfolioData } from '../types';

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export default function PortfolioAccount() {
  const { name = '' } = useParams();
  const accountName = decodeURIComponent(name);
  const navigate = useNavigate();
  const { currency } = useCurrency();

  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await portfolioApi.get(undefined, currency)); }
    finally { setLoading(false); }
  }, [currency]);

  useEffect(() => { load(); }, [load]);

  const cur = data?.displayCurrency ?? currency;
  const holdings = useMemo(
    () => (data?.holdings ?? []).filter((h) => h.account === accountName),
    [data, accountName]
  );

  // Activity for this account. Imported rows carry the account in `note`; manual
  // ones don't, so fall back to matching any ticker held here.
  const transactions = useMemo(() => {
    const tickers = new Set(holdings.map((h) => h.ticker));
    return (data?.transactions ?? []).filter(
      (t) => t.note?.startsWith(accountName) || (t.ticker && tickers.has(t.ticker))
    );
  }, [data, accountName, holdings]);

  const stats = useMemo(() => {
    const value = holdings.reduce((s, h) => s + (h.marketValue ?? 0), 0);
    const cost = holdings.reduce((s, h) => s + h.costBasis, 0);
    const today = holdings.reduce((s, h) => s + (h.todayReturn ?? 0), 0);
    const unrealized = value - cost;

    const cutoff = Date.now() - YEAR_MS;
    const recent = transactions.filter((t) => new Date(t.date).getTime() >= cutoff);
    const dividends = recent.filter((t) => t.type === 'dividend').reduce((s, t) => s + t.amount, 0);
    const invested = recent.filter((t) => t.type === 'buy').reduce((s, t) => s + t.amount, 0);
    const sold = recent.filter((t) => t.type === 'sell').reduce((s, t) => s + t.amount, 0);

    // What share of the account sits in a currency other than the display one.
    const foreign = holdings
      .filter((h) => h.nativeCurrency && h.nativeCurrency !== cur)
      .reduce((s, h) => s + (h.marketValue ?? 0), 0);

    const winners = holdings.filter((h) => (h.allTimeReturn ?? 0) > 0).length;
    const priced = holdings.filter((h) => h.marketValue != null).length;

    return {
      value, cost, today, unrealized,
      unrealizedPct: cost > 0 ? (unrealized / cost) * 100 : 0,
      dividends, invested, sold,
      foreignPct: value > 0 ? (foreign / value) * 100 : 0,
      winners, priced,
      avgPosition: priced > 0 ? value / priced : 0,
      yieldPct: value > 0 ? (dividends / value) * 100 : 0,
    };
  }, [holdings, transactions, cur]);

  const conc = useMemo(() => concentration(holdings), [holdings]);
  const dayUp = stats.today >= 0;

  if (!loading && !holdings.length) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        <button onClick={() => navigate('/portfolio')} className="btn-ghost btn-sm mb-5">
          <ArrowRight size={14} className="rotate-180" /> Back to portfolio
        </button>
        <div className="card text-center py-10">
          <p className="font-medium text-ink mb-1">Nothing in {shortAccountName(accountName)}</p>
          <p className="text-sm text-ink-secondary">This account has no priced holdings right now.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
      <div className="flex items-center justify-between gap-3 mb-5">
        <button onClick={() => navigate('/portfolio')} className="btn-ghost btn-sm">
          <ArrowRight size={14} className="rotate-180" /> Portfolio
        </button>
        <CurrencyToggle />
      </div>

      {/* Hero */}
      <div className="card !p-6 mb-5 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -top-24 -right-16 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--forest) 16%, transparent), transparent 68%)' }}
        />
        <div className="relative">
          <p className="text-xs text-ink-secondary mb-1">{shortAccountName(accountName)}</p>
          <div className="flex items-baseline gap-2">
            <h1 className="text-4xl font-semibold text-ink tracking-tight tabular-nums">
              {loading ? '-' : `$${stats.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </h1>
            <span className="text-ink-secondary text-sm font-medium">{cur}</span>
          </div>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-sm font-medium ${pnlColor(stats.today)}`}>
              {dayUp ? <ArrowUpRight size={15} /> : <TrendingDown size={15} />}
              {dollars(stats.today)} <span className="text-ink-secondary font-normal">today</span>
            </span>
            <span className="text-ink-tertiary">·</span>
            <span className={`text-sm font-medium ${pnlColor(stats.unrealized)}`}>
              {dollars(stats.unrealized)} <span className="text-ink-secondary font-normal">unrealized ({pct(stats.unrealizedPct)})</span>
            </span>
          </div>
        </div>
      </div>

      {/* Analytics an investor actually asks about */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="Cost basis" value={compact(stats.cost)} sub={`${holdings.length} positions`} />
        <Stat label="Avg position" value={compact(stats.avgPosition)} sub={`${stats.winners}/${holdings.length} in profit`} />
        <Stat label="Concentration" value={`${conc.top.toFixed(0)}%`} sub={`Top 3 · ${conc.top3.toFixed(0)}%`} tone={conc.top > 35 ? 'down' : 'neutral'} />
        <Stat label="FX exposure" value={`${stats.foreignPct.toFixed(0)}%`} sub={`Not held in ${cur}`} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Stat label="Dividends 12m" value={compact(stats.dividends)} sub={`${stats.yieldPct.toFixed(2)}% on value`} tone={stats.dividends > 0 ? 'up' : 'neutral'} />
        <Stat label="Bought 12m" value={compact(stats.invested)} />
        <Stat label="Sold 12m" value={compact(stats.sold)} />
        <Stat label="Net flow 12m" value={dollars(stats.invested - stats.sold)} tone={stats.invested - stats.sold >= 0 ? 'up' : 'down'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">
        <div className="min-w-0 space-y-4">
          <HoldingsTable
            holdings={holdings}
            cur={cur}
            loading={loading}
            groupByAccount={false}
            onOpen={(t) => navigate(`/dashboard?ticker=${t}`)}
          />
          <ActivityFeed
            transactions={transactions}
            cur={cur}
            expanded={showAll}
            onToggle={() => setShowAll((v) => !v)}
          />
        </div>

        <div className="space-y-4">
          <div className="card">
            <p className="font-semibold text-ink mb-3">Allocation</p>
            <div className="flex items-center gap-4">
              <Donut slices={holdings.map((h) => ({ label: h.ticker, value: h.marketValue ?? 0, color: h.color }))} />
              <div className="flex-1 space-y-1.5 min-w-0">
                {holdings.slice(0, 6).map((h) => (
                  <div key={h.id} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: h.color }} />
                    <span className="font-medium text-ink flex-1 truncate">{h.ticker}</span>
                    <span className="text-ink-secondary tabular-nums">{h.allocation.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {conc.top > 35 && (
            <div className="card !py-3.5">
              <p className="text-[11px] uppercase tracking-wide text-ink-tertiary mb-1">Concentration risk</p>
              <p className="text-[13px] text-ink-secondary leading-relaxed">
                Your largest position is {conc.top.toFixed(0)}% of this account. A single name above roughly a third
                means its moves drive the whole account.
              </p>
            </div>
          )}

          <div className="card">
            <p className="font-semibold text-ink mb-2">Value by holding</p>
            <div className="space-y-2">
              {holdings.slice(0, 8).map((h) => (
                <div key={h.id}>
                  <div className="flex items-center justify-between text-[12px] mb-0.5">
                    <span className="font-medium text-ink">{h.ticker}</span>
                    <span className="text-ink-secondary tabular-nums">{money(h.marketValue, cur)}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'color-mix(in srgb, var(--ink) 8%, transparent)' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, h.allocation)}%`, background: h.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
