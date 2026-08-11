import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowUp, BarChart2, CheckCircle2, Clock, Trophy, X } from '../lib/icons';
import { challenge as challengeApi } from '../lib/api';
import { research } from '../lib/api';
import type { ChallengeHistory, WeeklyChallenge } from '../types';
import { fmtPrice } from '../lib/helpers';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

export default function ChallengePage() {
  const [current, setCurrent] = useState<WeeklyChallenge | null>(null);
  const [history, setHistory] = useState<ChallengeHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [livePrice, setLivePrice] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, h] = await Promise.all([challengeApi.get(), challengeApi.history()]);
      setCurrent(c);
      setHistory(h);
      // Fetch live price for current ticker
      if (c?.ticker) {
        research.quick(c.ticker).then((q) => setLivePrice(q.price)).catch(() => {});
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function pick(direction: 'up' | 'down') {
    if (!current || current.userPick) return;
    setSubmitting(true);
    try {
      await challengeApi.pick(direction);
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  // Calculate current move for live price vs start
  const liveChange =
    livePrice != null && current
      ? ((livePrice - current.startPrice) / current.startPrice) * 100
      : null;

  const correctCount = history.filter((h) => h.result === 'correct').length;
  const totalResolved = history.filter((h) => h.result !== null).length;

  return (
    <div className="max-w-3xl mx-auto px-6 md:px-10 py-10">
      <header className="mb-8 animate-fadeUp">
        <div className="flex items-center gap-2 mb-2">
          <Trophy size={14} className="text-amber" />
          <span className="eyebrow">Challenge</span>
        </div>
        <h1 className="font-serif text-4xl md:text-5xl tracking-tight2">Stock of the Week</h1>
        <p className="text-ink-secondary mt-2 text-[15px]">
          Every Monday, a new stock. Will it go up or down by Friday? No money involved - just your prediction.
        </p>
      </header>

      {/* Your record */}
      {totalResolved > 0 && (
        <div
          className="card mb-6 animate-fadeUp animate-delay-1 grid grid-cols-3 gap-4"
        >
          <div>
            <div className="eyebrow mb-1">Your accuracy</div>
            <div className="font-serif text-3xl tracking-tight1">
              {Math.round((correctCount / totalResolved) * 100)}%
            </div>
          </div>
          <div>
            <div className="eyebrow mb-1">Correct picks</div>
            <div className="font-serif text-3xl tracking-tight1 text-forest">{correctCount}</div>
          </div>
          <div>
            <div className="eyebrow mb-1">Total played</div>
            <div className="font-serif text-3xl tracking-tight1">{totalResolved}</div>
          </div>
        </div>
      )}

      {/* Current challenge */}
      {loading ? (
        <div className="card skel h-64" />
      ) : current ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="card mb-6"
        >
          <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
            <div>
              <div className="eyebrow mb-1">This week</div>
              <div className="font-serif text-5xl tracking-tight2">{current.ticker}</div>
              <div className="text-ink-secondary text-sm mt-1">
                Started at <span className="tabular-nums font-medium">${fmtPrice(current.startPrice)}</span>
              </div>
            </div>
            <div className="text-right">
              {livePrice != null && (
                <>
                  <div className="eyebrow mb-1">Live price</div>
                  <div className="font-serif text-2xl tabular-nums">${fmtPrice(livePrice)}</div>
                  {liveChange != null && (
                    <div className={`text-sm font-medium mt-0.5 ${liveChange >= 0 ? 'text-forest' : 'text-brick'}`}>
                      {liveChange >= 0 ? '↑' : '↓'} {Math.abs(liveChange).toFixed(2)}% this week
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Community sentiment bar */}
          {current.community.total > 0 && (
            <div className="mb-5">
              <div className="eyebrow mb-2">Community ({current.community.total} picks)</div>
              <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                <div
                  className="rounded-l-full transition-all"
                  style={{ width: `${current.community.upPct ?? 50}%`, background: 'var(--forest)' }}
                />
                <div
                  className="rounded-r-full transition-all"
                  style={{ width: `${current.community.downPct ?? 50}%`, background: 'var(--brick)' }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-ink-tertiary mt-1">
                <span className="text-forest">{current.community.upPct ?? '--'}% picked UP</span>
                <span className="text-brick">{current.community.downPct ?? '--'}% picked DOWN</span>
              </div>
            </div>
          )}

          {/* Pick or result */}
          {current.userPick ? (
            <div
              className="rounded-2xl px-5 py-4 flex items-center gap-3"
              style={{
                background: current.userPick.direction === 'up'
                  ? 'color-mix(in srgb, var(--forest) 10%, transparent)'
                  : 'color-mix(in srgb, var(--brick) 10%, transparent)',
              }}
            >
              {current.userPick.direction === 'up'
                ? <ArrowUp size={20} className="text-forest flex-shrink-0" />
                : <ArrowDown size={20} className="text-brick flex-shrink-0" />}
              <div>
                <div className="font-medium">
                  You picked <strong>{current.userPick.direction.toUpperCase()}</strong>
                </div>
                <div className="text-sm text-ink-secondary">
                  {current.resolved
                    ? current.userPick.result === 'correct'
                      ? '✓ Correct!'
                      : '✗ Incorrect this week'
                    : 'Results revealed Friday at market close'}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="font-medium mb-3">Will {current.ticker} be higher or lower on Friday?</div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => pick('up')}
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-[15px] transition border-2 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'color-mix(in srgb, var(--forest) 10%, transparent)',
                    borderColor: 'var(--forest)',
                    color: 'var(--forest)',
                  }}
                >
                  <ArrowUp size={20} /> Going UP
                </button>
                <button
                  onClick={() => pick('down')}
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-[15px] transition border-2 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'color-mix(in srgb, var(--brick) 10%, transparent)',
                    borderColor: 'var(--brick)',
                    color: 'var(--brick)',
                  }}
                >
                  <ArrowDown size={20} /> Going DOWN
                </button>
              </div>
              <p className="text-[12px] text-ink-tertiary mt-3 text-center">
                No money involved. This is just for learning and fun.
              </p>
            </div>
          )}
        </motion.div>
      ) : null}

      {/* History */}
      {history.length > 0 && (
        <div className="animate-fadeUp">
          <div className="eyebrow mb-3">Past challenges</div>
          <div className="grid gap-2">
            {history.map((h, i) => {
              const move = h.endPrice != null
                ? ((h.endPrice - h.startPrice) / h.startPrice) * 100
                : null;
              return (
                <motion.div
                  key={h.week}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: EASE, delay: i * 0.05 }}
                  className="card flex items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-serif text-xl tracking-tight1">{h.ticker}</span>
                      <span className="text-[11px] text-ink-tertiary">{h.week}</span>
                    </div>
                    <div className="text-sm text-ink-secondary mt-0.5">
                      {h.startPrice != null && <span>${fmtPrice(h.startPrice)}</span>}
                      {h.endPrice != null && <span> → ${fmtPrice(h.endPrice)}</span>}
                      {move != null && (
                        <span className={move >= 0 ? 'text-forest' : 'text-brick'}>
                          {' '}({move >= 0 ? '+' : ''}{move.toFixed(1)}%)
                        </span>
                      )}
                    </div>
                  </div>
                  {h.direction && (
                    <div className="flex items-center gap-1.5">
                      {h.direction === 'up'
                        ? <ArrowUp size={14} style={{ color: 'var(--forest)' }} />
                        : <ArrowDown size={14} style={{ color: 'var(--brick)' }} />}
                      <span className="text-[12px] text-ink-secondary">You picked {h.direction}</span>
                    </div>
                  )}
                  {h.result && (
                    <span
                      className={`pill text-[11px] ${h.result === 'correct' ? 'pill-forest' : 'pill-brick'}`}
                    >
                      {h.result === 'correct' ? '✓ Correct' : '✗ Incorrect'}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
