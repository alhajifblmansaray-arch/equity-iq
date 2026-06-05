import { ExternalLink, Flame, Landmark, MessageCircle, Radio, TrendingDown, TrendingUp, Users } from 'lucide-react';
import type {
  CongressionalTrade,
  InsiderTrade,
  OptionsFlow,
  RedditSentiment,
  ResearchReport,
  StockTwitsSentiment,
} from '../types';
import { fmtCompact, fmtDate, fmtRelative } from '../lib/helpers';

interface Props {
  data: ResearchReport;
}

export default function PulseCard({ data }: Props) {
  const p = data.pulse;
  const hasAny =
    p && (p.stockTwits || p.reddit || (p.insider && p.insider.length) || (p.congressional && p.congressional.length) || p.options);
  if (!hasAny) return null;

  return (
    <div className="card animate-fadeUp animate-delay-7">
      <div className="flex items-center gap-1.5 mb-1">
        <Flame size={13} className="text-brick" />
        <span className="eyebrow">Pulse</span>
      </div>
      <h3 className="section-title mb-1">Street · Hill · Inside</h3>
      <p className="text-ink-secondary text-[13px] leading-relaxed mb-6">
        Real-time signals you can't read off a chart: retail chatter, insider transactions, congressional
        trades, and options positioning.
      </p>

      {/* Sentiment row */}
      {(p?.stockTwits || p?.reddit) && (
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {p?.stockTwits && <StockTwitsTile data={p.stockTwits} />}
          {p?.reddit && <RedditTile data={p.reddit} ticker={data.ticker} />}
        </div>
      )}

      {/* Insider + Congressional */}
      {(p?.insider?.length || p?.congressional?.length) && (
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {p?.insider && p.insider.length > 0 && <InsiderTile trades={p.insider} />}
          {p?.congressional && p.congressional.length > 0 && <CongressTile trades={p.congressional} />}
        </div>
      )}

      {/* Options flow */}
      {p?.options && <OptionsTile flow={p.options} />}

      <p className="text-[11px] text-ink-tertiary mt-5">
        Sources: StockTwits · Reddit · Quiver Quant · Polygon. Not investment advice.
      </p>
    </div>
  );
}

function StockTwitsTile({ data }: { data: StockTwitsSentiment }) {
  const bullPct = Math.round(data.bullishPct);
  const bearPct = 100 - bullPct;
  const skew = bullPct >= 65 ? 'bull' : bullPct <= 35 ? 'bear' : 'neutral';
  const skewLabel =
    skew === 'bull' ? 'Crowd is bullish' : skew === 'bear' ? 'Crowd is bearish' : 'Mixed crowd';
  const skewColor =
    skew === 'bull' ? 'var(--forest)' : skew === 'bear' ? 'var(--brick)' : 'var(--amber)';
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--cream-tint)' }}>
      <div className="flex items-center gap-1.5 mb-2">
        <MessageCircle size={12} className="text-ink-tertiary" />
        <span className="eyebrow">StockTwits · last messages</span>
      </div>
      <div className="font-serif text-2xl tracking-tight1" style={{ color: skewColor }}>
        {skewLabel}
      </div>
      <div className="text-[13px] text-ink-secondary mt-1">
        {data.total} messages · {data.bullish} bullish · {data.bearish} bearish
      </div>
      <div className="mt-3 flex h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface)' }}>
        <div className="transition-all" style={{ width: `${bullPct}%`, background: 'var(--forest)' }} />
        <div className="transition-all" style={{ width: `${bearPct}%`, background: 'var(--brick)' }} />
      </div>
      <div className="flex justify-between text-[10px] uppercase tracking-eyebrow text-ink-tertiary mt-1">
        <span>{bullPct}% bull</span>
        <span>{bearPct}% bear</span>
      </div>
      {data.messages.length > 0 && (
        <div className="hairline-divider my-4" />
      )}
      {data.messages.slice(0, 3).map((m) => (
        <div key={m.id} className="text-[12px] mb-2">
          <span
            className="inline-flex items-center gap-1 mr-1.5 px-1.5 py-0.5 rounded-full text-[9px] uppercase tracking-eyebrow"
            style={{
              background:
                m.sentiment === 'bullish'
                  ? 'color-mix(in srgb, var(--forest) 14%, transparent)'
                  : m.sentiment === 'bearish'
                  ? 'color-mix(in srgb, var(--brick) 14%, transparent)'
                  : 'var(--surface)',
              color:
                m.sentiment === 'bullish'
                  ? 'var(--forest)'
                  : m.sentiment === 'bearish'
                  ? 'var(--brick)'
                  : 'var(--ink-tertiary)',
            }}
          >
            {m.sentiment === 'bullish' ? 'BULL' : m.sentiment === 'bearish' ? 'BEAR' : 'NEUTRAL'}
          </span>
          <span className="text-ink-secondary leading-relaxed line-clamp-2">{m.body}</span>
        </div>
      ))}
    </div>
  );
}

function RedditTile({ data, ticker }: { data: RedditSentiment; ticker: string }) {
  const subs = Object.entries(data.perSub).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--cream-tint)' }}>
      <div className="flex items-center gap-1.5 mb-2">
        <Radio size={12} className="text-ink-tertiary" />
        <span className="eyebrow">Reddit · past week</span>
      </div>
      <div className="font-serif text-2xl tracking-tight1">{data.totalMentions} mentions</div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {subs.slice(0, 4).map(([s, n]) => (
          <span
            key={s}
            className="text-[11px] px-2 py-0.5 rounded-full"
            style={{ background: 'var(--surface)', color: 'var(--ink-secondary)' }}
          >
            r/{s} · {n}
          </span>
        ))}
      </div>
      {data.topPosts.length > 0 && (
        <>
          <div className="hairline-divider my-4" />
          <div className="text-[10px] uppercase tracking-eyebrow text-ink-tertiary mb-2">Top posts</div>
          <ul className="space-y-2">
            {data.topPosts.slice(0, 3).map((p) => (
              <li key={p.id}>
                <a
                  href={p.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block text-[13px]"
                >
                  <div className="text-ink leading-snug group-hover:text-forest transition line-clamp-2">
                    {p.title}
                  </div>
                  <div className="text-[11px] text-ink-tertiary mt-0.5">
                    r/{p.subreddit} · ▲ {p.score.toLocaleString()} · {p.comments.toLocaleString()} comments
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
      <a
        href={`https://www.reddit.com/r/wallstreetbets/search?q=${ticker}&restrict_sr=on`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[11px] text-ink-tertiary hover:text-ink mt-3 transition"
      >
        More on Reddit <ExternalLink size={10} />
      </a>
    </div>
  );
}

function InsiderTile({ trades }: { trades: InsiderTrade[] }) {
  const buys = trades.filter((t) => t.transaction === 'buy').length;
  const sells = trades.filter((t) => t.transaction === 'sell').length;
  const net = buys - sells;
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--cream-tint)' }}>
      <div className="flex items-center gap-1.5 mb-2">
        <Users size={12} className="text-ink-tertiary" />
        <span className="eyebrow">Insider activity</span>
      </div>
      <div className="flex items-baseline gap-4 mb-3">
        <span>
          <span className="font-serif text-2xl tracking-tight1 text-forest">{buys}</span>
          <span className="text-[11px] ml-1 text-ink-tertiary">buys</span>
        </span>
        <span>
          <span className="font-serif text-2xl tracking-tight1 text-brick">{sells}</span>
          <span className="text-[11px] ml-1 text-ink-tertiary">sells</span>
        </span>
        <span
          className="ml-auto pill text-[10px]"
          style={
            net > 0
              ? { background: 'color-mix(in srgb, var(--forest) 14%, transparent)', color: 'var(--forest)' }
              : net < 0
              ? { background: 'color-mix(in srgb, var(--brick) 14%, transparent)', color: 'var(--brick)' }
              : { background: 'var(--surface)', color: 'var(--ink-tertiary)' }
          }
        >
          {net > 0 ? `+${net} net buys` : net < 0 ? `${net} net sells` : 'flat'}
        </span>
      </div>
      <ul className="space-y-2">
        {trades.slice(0, 5).map((t, i) => (
          <li key={i} className="flex items-center gap-3 text-[12px]">
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background:
                  t.transaction === 'buy'
                    ? 'color-mix(in srgb, var(--forest) 14%, transparent)'
                    : t.transaction === 'sell'
                    ? 'color-mix(in srgb, var(--brick) 14%, transparent)'
                    : 'var(--surface)',
              }}
            >
              {t.transaction === 'buy' ? (
                <TrendingUp size={11} className="text-forest" />
              ) : t.transaction === 'sell' ? (
                <TrendingDown size={11} className="text-brick" />
              ) : (
                <span className="text-ink-tertiary text-[10px]">?</span>
              )}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate text-ink">{t.insider}</div>
              {t.title && <div className="text-[10px] text-ink-tertiary truncate">{t.title}</div>}
            </div>
            <div className="text-right tabular-nums text-[11px] text-ink-secondary">
              <div>{t.shares?.toLocaleString?.() || t.shares} sh</div>
              {t.totalValue && (
                <div className="text-ink-tertiary">${fmtCompact(t.totalValue)}</div>
              )}
            </div>
            <div className="text-[10px] text-ink-tertiary tabular-nums w-16 text-right">
              {fmtRelative(t.date)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CongressTile({ trades }: { trades: CongressionalTrade[] }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--cream-tint)' }}>
      <div className="flex items-center gap-1.5 mb-2">
        <Landmark size={12} className="text-ink-tertiary" />
        <span className="eyebrow">Congressional trades</span>
      </div>
      <ul className="space-y-2">
        {trades.slice(0, 6).map((t, i) => {
          const isBuy = /purchase|buy/i.test(t.transaction);
          return (
            <li key={i} className="flex items-start gap-2 text-[12px]">
              <span
                className="px-1.5 py-0.5 rounded-full text-[9px] uppercase tracking-eyebrow font-medium flex-shrink-0"
                style={
                  isBuy
                    ? { background: 'color-mix(in srgb, var(--forest) 14%, transparent)', color: 'var(--forest)' }
                    : { background: 'color-mix(in srgb, var(--brick) 14%, transparent)', color: 'var(--brick)' }
                }
              >
                {isBuy ? 'BUY' : 'SELL'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-ink leading-tight truncate">
                  {t.representative}
                  {t.party && <span className="text-ink-tertiary"> · {t.party}</span>}
                </div>
                <div className="text-[10px] text-ink-tertiary">{t.amount} · {fmtDate(t.date)}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function OptionsTile({ flow }: { flow: OptionsFlow }) {
  const pcr = flow.putCallRatioOI;
  let pcrLabel = '—';
  let pcrColor = 'var(--ink-tertiary)';
  if (pcr != null) {
    pcrLabel = pcr.toFixed(2);
    pcrColor = pcr >= 1.2 ? 'var(--brick)' : pcr <= 0.7 ? 'var(--forest)' : 'var(--amber)';
  }
  const skew =
    pcr == null ? 'unknown' : pcr >= 1.2 ? 'bearish skew' : pcr <= 0.7 ? 'bullish skew' : 'balanced';
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--cream-tint)' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="eyebrow">Options flow</span>
        </div>
        <span className="text-[10px] text-ink-tertiary">{flow.sampleSize} contracts sampled</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat
          label="Put/Call OI"
          value={pcrLabel}
          sub={skew}
          color={pcrColor}
        />
        <Stat
          label="Calls OI"
          value={fmtCompact(flow.totalOpenInterest.calls)}
          sub={`vol ${fmtCompact(flow.totalVolume.calls)}`}
        />
        <Stat
          label="Puts OI"
          value={fmtCompact(flow.totalOpenInterest.puts)}
          sub={`vol ${fmtCompact(flow.totalVolume.puts)}`}
        />
        <Stat
          label="Avg IV"
          value={flow.avgImpliedVol != null ? `${(flow.avgImpliedVol * 100).toFixed(0)}%` : '—'}
          sub="implied volatility"
        />
      </div>

      {flow.topOI.length > 0 && (
        <>
          <div className="hairline-divider my-4" />
          <div className="text-[10px] uppercase tracking-eyebrow text-ink-tertiary mb-2">Most open interest</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {flow.topOI.slice(0, 6).map((c, i) => (
              <div
                key={i}
                className="rounded-xl px-2.5 py-1.5 text-[11px]"
                style={{ background: 'var(--surface)' }}
              >
                <span
                  className="inline-block px-1.5 py-0.5 rounded-full text-[9px] uppercase tracking-eyebrow mr-1.5"
                  style={
                    c.type === 'call'
                      ? { background: 'color-mix(in srgb, var(--forest) 14%, transparent)', color: 'var(--forest)' }
                      : { background: 'color-mix(in srgb, var(--brick) 14%, transparent)', color: 'var(--brick)' }
                  }
                >
                  {c.type}
                </span>
                <span className="font-medium tabular-nums">${c.strike}</span>
                <span className="text-ink-tertiary"> · {fmtDate(c.expiry)}</span>
                <div className="text-ink-tertiary mt-0.5 tabular-nums">OI {fmtCompact(c.openInterest)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div>
      <div className="eyebrow mb-1">{label}</div>
      <div
        className="font-serif text-2xl tracking-tight1 tabular-nums"
        style={color ? { color } : undefined}
      >
        {value}
      </div>
      {sub && <div className="text-[11px] text-ink-tertiary mt-0.5">{sub}</div>}
    </div>
  );
}
