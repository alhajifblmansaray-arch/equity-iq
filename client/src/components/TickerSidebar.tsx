import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, Bell, TrendingUp } from '../lib/icons';
import { api } from '../lib/api';
import { useLivePrice } from '../hooks/useLivePrice';
import WatchlistButton from './WatchlistButton';
import Sparkline from './Sparkline';
import type { ResearchReport } from '../types';
import { fmtCompact, fmtPrice } from '../lib/helpers';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

interface Props {
  data: ResearchReport;
}

export default function TickerSidebar({ data }: Props) {
  const { tick } = useLivePrice(data.ticker);
  const [spark, setSpark] = useState<number[]>([]);

  useEffect(() => {
    api.get<{ ticker: string; closes: number[] }>(
      `/research/${encodeURIComponent(data.ticker)}/spark`,
      { params: { days: 10 } }
    )
      .then((r) => setSpark(r.data.closes))
      .catch(() => {});
  }, [data.ticker]);

  const snap = data.snapshot;
  const livePrice = tick?.price ?? snap?.price ?? null;
  const prevClose = snap?.prevClose ?? null;
  const change = livePrice != null && prevClose != null ? livePrice - prevClose : snap?.change ?? null;
  const changePct = change != null && prevClose != null && prevClose > 0 ? (change / prevClose) * 100 : snap?.changePct ?? null;
  const up = (change ?? 0) >= 0;

  const val = data.valuation;
  const nextEarnings = data.nextEarnings;

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="sticky top-6 space-y-3"
    >
      {/* Price card */}
      <div className="card">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <Link
              to={`/dashboard?ticker=${data.ticker}`}
              className="font-serif text-2xl tracking-tight1 hover:text-forest transition"
            >
              {data.ticker}
            </Link>
            {data.profile?.name && (
              <div className="text-[12px] text-ink-secondary mt-0.5 leading-snug">{data.profile.name}</div>
            )}
          </div>
          <WatchlistButton ticker={data.ticker} />
        </div>

        {livePrice != null && (
          <>
            <div className="font-serif text-3xl tracking-tight1 tabular-nums mb-1">
              ${fmtPrice(livePrice)}
            </div>
            {change != null && (
              <div className={`flex items-center gap-1.5 text-sm font-medium tabular-nums ${up ? 'text-forest' : 'text-brick'}`}>
                {up ? <ArrowUp size={13} weight="bold" /> : <ArrowDown size={13} weight="bold" />}
                {up ? '+' : ''}{fmtPrice(Math.abs(change))}
                <span className="text-ink-tertiary font-normal">({up ? '+' : ''}{changePct?.toFixed(2)}%)</span>
              </div>
            )}
          </>
        )}

        {spark.length > 1 && (
          <div className="mt-3">
            <Sparkline
              values={spark}
              width={220}
              height={44}
              color={up ? 'var(--forest)' : 'var(--brick)'}
              fill
            />
            <div className="text-[10px] text-ink-tertiary mt-0.5">10-day price history</div>
          </div>
        )}
      </div>

      {/* Key stats */}
      <div className="card">
        <div className="eyebrow mb-3">Key stats</div>
        <div className="space-y-2.5">
          {snap?.marketCap != null && (
            <StatRow label="Market cap" value={fmtCompact(snap.marketCap)} />
          )}
          {val?.peRatio != null && (
            <StatRow label="P/E ratio" value={val.peRatio.toFixed(1) + 'x'} />
          )}
          {val?.forwardPE != null && (
            <StatRow label="Fwd P/E" value={val.forwardPE.toFixed(1) + 'x'} />
          )}
          {snap?.volume != null && (
            <StatRow label="Volume" value={fmtCompact(snap.volume)} />
          )}
          {val?.fiftyTwoWeekHigh != null && val?.fiftyTwoWeekLow != null && (
            <div>
              <div className="flex items-center justify-between text-[12px] mb-1">
                <span className="text-ink-tertiary">52-week range</span>
              </div>
              <div className="flex items-center gap-1.5 text-[12px]">
                <span className="text-brick tabular-nums">${fmtPrice(val.fiftyTwoWeekLow)}</span>
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--hairline)' }}>
                  {livePrice != null && (
                    <div
                      className="h-full rounded-full bg-forest"
                      style={{
                        width: `${Math.min(100, Math.max(0, ((livePrice - val.fiftyTwoWeekLow!) / (val.fiftyTwoWeekHigh! - val.fiftyTwoWeekLow!)) * 100))}%`
                      }}
                    />
                  )}
                </div>
                <span className="text-forest tabular-nums">${fmtPrice(val.fiftyTwoWeekHigh)}</span>
              </div>
            </div>
          )}
          {val?.analystTargetPrice != null && livePrice != null && (
            <StatRow
              label="Analyst target"
              value={`$${fmtPrice(val.analystTargetPrice)}`}
              accent={val.analystTargetPrice > livePrice ? 'var(--forest)' : 'var(--brick)'}
              sub={`${val.analystTargetPrice > livePrice ? '+' : ''}${(((val.analystTargetPrice - livePrice) / livePrice) * 100).toFixed(1)}% upside`}
            />
          )}
          {val?.dividendYield != null && val.dividendYield > 0 && (
            <StatRow label="Div. yield" value={`${(val.dividendYield * 100).toFixed(2)}%`} />
          )}
          {val?.beta != null && (
            <StatRow label="Beta" value={val.beta.toFixed(2)} />
          )}
        </div>
      </div>

      {/* Next earnings */}
      {nextEarnings && (
        <div className="card">
          <div className="eyebrow mb-2">Next earnings</div>
          <div className="font-medium text-[14px]">{nextEarnings.date}</div>
          {nextEarnings.hour && (
            <div className="text-[12px] text-ink-secondary mt-0.5">
              {nextEarnings.hour === 'bmo' ? '🌅 Before market open' : '🌆 After market close'}
            </div>
          )}
          {nextEarnings.estimate != null && (
            <div className="text-[12px] text-ink-tertiary mt-1">
              EPS est. <span className="font-medium text-ink">${nextEarnings.estimate.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="card">
        <div className="eyebrow mb-3">Quick actions</div>
        <div className="space-y-2">
          <Link
            to={`/simulator`}
            state={{ ticker: data.ticker }}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-[13px] font-medium transition"
            style={{ background: 'color-mix(in srgb, var(--forest) 10%, var(--cream-tint))', color: 'var(--forest)' }}
          >
            <TrendingUp size={14} />
            Trade in simulator
          </Link>
          <Link
            to="/alerts"
            state={{ ticker: data.ticker }}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-[13px] font-medium transition"
            style={{ background: 'var(--cream-tint)', color: 'var(--ink-secondary)' }}
          >
            <Bell size={14} />
            Set price alert
          </Link>
        </div>
      </div>

      {data.profile?.sector && (
        <div className="text-[11px] text-ink-tertiary text-center">
          {data.profile.sector}{data.profile.industry ? ` · ${data.profile.industry}` : ''}
        </div>
      )}
    </motion.div>
  );
}

function StatRow({ label, value, accent, sub }: { label: string; value: string; accent?: string; sub?: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[12px] text-ink-tertiary">{label}</span>
      <div className="text-right">
        <span className="text-[12px] font-medium tabular-nums" style={accent ? { color: accent } : undefined}>{value}</span>
        {sub && <div className="text-[10px] text-ink-tertiary">{sub}</div>}
      </div>
    </div>
  );
}
