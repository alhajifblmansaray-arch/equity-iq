import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { portfolio as portfolioApi } from '../../lib/api';
import { money, dollars, pct, compact, pnlColor, Monogram, Donut, Stat } from './primitives';
import type { PortfolioInsights, HoldingInsight } from '../../types';

const SECTOR_COLORS = ['#10B981', '#3b5bdb', '#c2410c', '#7c3aed', '#0891b2', '#be123c', '#a16207', '#4d7c0f', '#0f766e'];

function ratio(n: number | null | undefined, digits = 2): string {
  return n == null || !Number.isFinite(n) ? '-' : n.toFixed(digits);
}
function percentOf(fraction: number | null | undefined): string {
  return fraction == null ? '-' : `${(fraction * 100).toFixed(2)}%`;
}

/** Beta above 1 means the position swings harder than the market. */
function betaTone(b: number | null): 'up' | 'down' | 'neutral' {
  if (b == null) return 'neutral';
  return b > 1.3 ? 'down' : b < 0.8 ? 'up' : 'neutral';
}

export default function InsightsTab({ currency, onOpenTicker }: { currency: string; onOpenTicker?: (t: string) => void }) {
  const navigate = useNavigate();
  const [data, setData] = useState<PortfolioInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setData(await portfolioApi.insights(currency)); }
    finally { setLoading(false); }
  }, [currency]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  // Fundamentals arrive a few per request because the provider is rate limited.
  // Poll until the backlog clears so the page fills in rather than sitting empty.
  useEffect(() => {
    if (!data?.coverage.pending) return;
    const id = setTimeout(load, 1500);
    return () => clearTimeout(id);
  }, [data, load]);

  const open = (t: string) => (onOpenTicker ? onOpenTicker(t) : navigate(`/dashboard?ticker=${t}`));

  const m = data?.metrics;
  const holdings = data?.holdings ?? [];
  const cur = data?.displayCurrency ?? currency;

  const movers = useMemo(() => {
    const withData = holdings.filter((h) => h.unrealizedPct != null);
    return {
      best: [...withData].sort((a, b) => (b.unrealizedPct ?? 0) - (a.unrealizedPct ?? 0)).slice(0, 3),
      worst: [...withData].sort((a, b) => (a.unrealizedPct ?? 0) - (b.unrealizedPct ?? 0)).slice(0, 3),
    };
  }, [holdings]);

  if (loading && !data) return <div className="card text-sm text-ink-secondary">Loading analytics…</div>;
  if (!holdings.length) return <div className="card text-sm text-ink-secondary">Add holdings to see analytics.</div>;

  return (
    <div className="space-y-4">
      {/* Coverage note - be explicit about what is missing rather than showing blanks */}
      {data && (data.coverage.pending > 0 || data.coverage.withFundamentals < data.coverage.total) && (
        <div className="card !py-3 flex items-center gap-3">
          <span className="text-xs text-ink-secondary flex-1">
            {data.coverage.pending > 0
              ? `Loading fundamentals… ${data.coverage.withFundamentals} of ${data.coverage.total} ready.`
              : `Fundamentals available for ${data.coverage.withFundamentals} of ${data.coverage.total} holdings. The rest are ETFs or non-US listings the data provider doesn't cover.`}
          </span>
          {data.coverage.pending > 0 && (
            <span className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background: 'var(--brand)' }} />
          )}
        </div>
      )}

      {/* Portfolio-level metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat
          label="Portfolio beta"
          value={ratio(m?.weightedBeta)}
          sub={m?.weightedBeta == null ? 'not enough data' : m.weightedBeta > 1 ? 'moves more than market' : 'moves less than market'}
          tone={betaTone(m?.weightedBeta ?? null)}
        />
        <Stat label="Weighted P/E" value={ratio(m?.weightedPE, 1)} sub={m?.weightedForwardPE ? `forward ${ratio(m.weightedForwardPE, 1)}` : undefined} />
        <Stat
          label="Dividend income"
          value={compact(m?.annualDividendIncome)}
          sub={`${ratio(m?.dividendYieldOnValue)}% yield / year`}
          tone={(m?.annualDividendIncome ?? 0) > 0 ? 'up' : 'neutral'}
        />
        <Stat
          label="Analyst upside"
          value={m?.avgUpsideToTarget == null ? '-' : pct(m.avgUpsideToTarget)}
          sub="weighted to target"
          tone={(m?.avgUpsideToTarget ?? 0) >= 0 ? 'up' : 'down'}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Sectors" value={String(m?.sectorCount ?? 0)} sub={m?.topSector ? `${m.topSector} ${m.topSectorPct.toFixed(0)}%` : undefined} tone={(m?.topSectorPct ?? 0) > 40 ? 'down' : 'neutral'} />
        <Stat label="In profit" value={`${m?.winners ?? 0}/${holdings.length}`} sub={`${m?.losers ?? 0} down`} tone={(m?.winners ?? 0) >= (m?.losers ?? 0) ? 'up' : 'down'} />
        <Stat label="Near 52w high" value={String(m?.nearHigh.length ?? 0)} sub={m?.nearHigh.slice(0, 3).join(', ') || 'none'} />
        <Stat label="Near 52w low" value={String(m?.nearLow.length ?? 0)} sub={m?.nearLow.slice(0, 3).join(', ') || 'none'} tone={(m?.nearLow.length ?? 0) > 0 ? 'down' : 'neutral'} />
      </div>

      {/* Sector mix */}
      {!!data?.sectors.length && (
        <div className="card">
          <p className="font-semibold text-ink mb-3">Sector exposure</p>
          <div className="flex items-center gap-5 flex-wrap">
            <Donut slices={data.sectors.map((s, i) => ({ label: s.name, value: s.value, color: SECTOR_COLORS[i % SECTOR_COLORS.length] }))} size={124} />
            <div className="flex-1 min-w-[200px] space-y-2">
              {data.sectors.map((s, i) => (
                <div key={s.name}>
                  <div className="flex items-center gap-2 text-[13px] mb-1">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: SECTOR_COLORS[i % SECTOR_COLORS.length] }} />
                    <span className="font-medium text-ink flex-1 truncate">{s.name}</span>
                    <span className="text-ink-secondary tabular-nums">{s.allocation.toFixed(1)}%</span>
                    <span className="text-ink-tertiary tabular-nums w-20 text-right">{money(s.value, cur)}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'color-mix(in srgb, var(--ink) 8%, transparent)' }}>
                    <div className="h-full rounded-full" style={{ width: `${s.allocation}%`, background: SECTOR_COLORS[i % SECTOR_COLORS.length] }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {(m?.topSectorPct ?? 0) > 40 && (
            <p className="text-xs text-ink-tertiary mt-3 leading-relaxed">
              {m!.topSector} is {m!.topSectorPct.toFixed(0)}% of the book. Above roughly 40% in one sector, a sector-wide
              move drives your whole return.
            </p>
          )}
        </div>
      )}

      {/* Winners and losers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <MoverList title="Best performers" rows={movers.best} cur={cur} onOpen={open} />
        <MoverList title="Weakest performers" rows={movers.worst} cur={cur} onOpen={open} />
      </div>

      {/* Who actually moved the needle */}
      {!!data?.contributors.length && (
        <div className="card">
          <p className="font-semibold text-ink mb-1">Contribution to gain</p>
          <p className="text-xs text-ink-tertiary mb-3">How much of your total unrealized result each position is responsible for.</p>
          <div className="space-y-2">
            {data.contributors.slice(0, 8).map((c) => (
              <div key={c.ticker} className="flex items-center gap-3">
                <span className="font-mono text-[13px] font-medium text-ink w-16">{c.ticker}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'color-mix(in srgb, var(--ink) 7%, transparent)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, Math.abs(c.contributionPct))}%`,
                      background: c.contribution >= 0 ? 'var(--forest)' : 'var(--brick)',
                    }}
                  />
                </div>
                <span className={`text-[13px] tabular-nums w-24 text-right ${pnlColor(c.contribution)}`}>{dollars(c.contribution)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming earnings */}
      {!!data?.upcomingEarnings.length && (
        <div className="card">
          <p className="font-semibold text-ink mb-1">Upcoming earnings</p>
          <p className="text-xs text-ink-tertiary mb-3">Dates your holdings report. Expect larger moves around these.</p>
          <div className="flex flex-wrap gap-2">
            {data.upcomingEarnings.map((e) => (
              <button
                key={e.ticker}
                onClick={() => open(e.ticker)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] transition hover:bg-white/20"
                style={{ background: 'color-mix(in srgb, var(--ink) 6%, transparent)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: e.color }} />
                <span className="font-medium text-ink">{e.ticker}</span>
                <span className="text-ink-secondary">
                  {new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Per-holding fundamentals */}
      <div className="card !px-0 !py-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-hairline">
          <p className="font-semibold text-ink">Fundamentals by holding</p>
          <p className="text-xs text-ink-tertiary mt-0.5">Tap a row for the full picture.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-ink-tertiary">
                <th className="text-left font-medium px-4 py-2">Holding</th>
                <th className="text-left font-medium px-2 py-2 hidden md:table-cell">Sector</th>
                <th className="text-right font-medium px-2 py-2">Beta</th>
                <th className="text-right font-medium px-2 py-2">P/E</th>
                <th className="text-right font-medium px-2 py-2 hidden sm:table-cell">Yield</th>
                <th className="text-right font-medium px-4 py-2">52w range</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => (
                <HoldingRow
                  key={`${h.ticker}-${h.account}`}
                  h={h}
                  cur={cur}
                  expanded={expanded === `${h.ticker}-${h.account}`}
                  onToggle={() => setExpanded(expanded === `${h.ticker}-${h.account}` ? null : `${h.ticker}-${h.account}`)}
                  onOpen={() => open(h.ticker)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MoverList({ title, rows, cur, onOpen }: { title: string; rows: HoldingInsight[]; cur: string; onOpen: (t: string) => void }) {
  if (!rows.length) return null;
  return (
    <div className="card">
      <p className="font-semibold text-ink mb-3">{title}</p>
      <div className="space-y-2">
        {rows.map((h) => (
          <button key={`${h.ticker}-${h.account}`} onClick={() => onOpen(h.ticker)} className="w-full flex items-center gap-3 text-left">
            <Monogram ticker={h.ticker} color={h.color} size={30} />
            <span className="flex-1 min-w-0">
              <span className="block text-[13px] font-medium text-ink truncate">{h.ticker}</span>
              <span className="block text-[11px] text-ink-tertiary truncate">{h.name ?? h.sector}</span>
            </span>
            <span className="text-right">
              <span className={`block text-[13px] tabular-nums font-medium ${pnlColor(h.unrealized)}`}>{pct(h.unrealizedPct)}</span>
              <span className={`block text-[11px] tabular-nums ${pnlColor(h.unrealized)}`}>{dollars(h.unrealized)}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function HoldingRow({ h, cur, expanded, onToggle, onOpen }: {
  h: HoldingInsight; cur: string; expanded: boolean; onToggle: () => void; onOpen: () => void;
}) {
  return (
    <>
      <tr className="border-t border-hairline hover:bg-white/8 transition cursor-pointer" onClick={onToggle}>
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <Monogram ticker={h.ticker} color={h.color} size={28} />
            <span>
              <span className="block font-medium text-ink leading-tight">{h.ticker}</span>
              <span className="block text-[11px] text-ink-tertiary truncate max-w-[140px]">{h.name ?? '-'}</span>
            </span>
          </div>
        </td>
        <td className="px-2 py-2.5 text-ink-secondary text-[13px] hidden md:table-cell">{h.sector}</td>
        <td className="px-2 py-2.5 text-right tabular-nums text-ink-secondary">{ratio(h.beta)}</td>
        <td className="px-2 py-2.5 text-right tabular-nums text-ink-secondary">{ratio(h.peRatio, 1)}</td>
        <td className="px-2 py-2.5 text-right tabular-nums text-ink-secondary hidden sm:table-cell">{percentOf(h.dividendYield)}</td>
        <td className="px-4 py-2.5">
          {h.rangePosition == null ? (
            <span className="text-ink-tertiary text-sm block text-right">-</span>
          ) : (
            <div className="flex items-center gap-2 justify-end">
              <div className="w-20 h-1.5 rounded-full relative" style={{ background: 'color-mix(in srgb, var(--ink) 10%, transparent)' }}>
                <span
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                  style={{ left: `calc(${Math.min(100, Math.max(0, h.rangePosition))}% - 4px)`, background: 'var(--brand)' }}
                />
              </div>
              <span className="text-[12px] tabular-nums text-ink-secondary w-9 text-right">{h.rangePosition.toFixed(0)}%</span>
            </div>
          )}
        </td>
      </tr>

      {expanded && (
        <tr className="border-t border-hairline">
          <td colSpan={6} className="px-4 py-4" style={{ background: 'color-mix(in srgb, var(--ink) 3%, transparent)' }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 mb-3">
              <Detail label="Position" value={money(h.marketValue, cur)} sub={`${h.quantity.toLocaleString('en-US', { maximumFractionDigits: 4 })} shares`} />
              <Detail label="Unrealized" value={dollars(h.unrealized)} sub={pct(h.unrealizedPct)} tone={h.unrealized} />
              <Detail label="52-week range" value={h.fiftyTwoWeekLow == null ? '-' : `${h.fiftyTwoWeekLow.toFixed(2)} - ${h.fiftyTwoWeekHigh?.toFixed(2)}`} />
              <Detail label="Analyst target" value={h.analystTargetPrice == null ? '-' : `$${h.analystTargetPrice.toFixed(2)}`} sub={h.upsideToTarget == null ? undefined : `${pct(h.upsideToTarget)} away`} tone={h.upsideToTarget} />
              <Detail label="Forward P/E" value={ratio(h.forwardPE, 1)} />
              <Detail label="Price / book" value={ratio(h.priceToBook, 1)} />
              <Detail label="Profit margin" value={percentOf(h.profitMargin)} />
              <Detail label="Return on equity" value={percentOf(h.returnOnEquity)} />
              <Detail label="Market cap" value={h.marketCap == null ? '-' : compact(h.marketCap)} />
              <Detail label="Annual dividend" value={h.annualDividend == null ? '-' : money(h.annualDividend, cur)} />
              <Detail label="Next earnings" value={h.nextEarnings ? new Date(h.nextEarnings.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'} />
              <Detail label="Account" value={h.account} />
            </div>
            <button onClick={(e) => { e.stopPropagation(); onOpen(); }} className="btn-ghost btn-sm">
              Full research on {h.ticker}
            </button>
          </td>
        </tr>
      )}
    </>
  );
}

function Detail({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: number | null }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-ink-tertiary mb-0.5">{label}</p>
      <p className={`text-[14px] font-medium tabular-nums ${tone != null ? pnlColor(tone) : 'text-ink'}`}>{value}</p>
      {sub && <p className="text-[11px] text-ink-tertiary">{sub}</p>}
    </div>
  );
}
