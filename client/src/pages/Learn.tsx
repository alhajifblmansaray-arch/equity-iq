import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Flame,
  Search,
  Sparkles,
  Trophy,
  X,
  Zap,
} from '../lib/icons';
import { learn as learnApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import type { Lesson, LessonSummary, LearnProgress, Track } from '../types';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const BADGE_META: Record<string, { label: string; emoji: string }> = {
  'first-lesson': { label: 'First lesson', emoji: '🌱' },
  'five-lessons': { label: '5 lessons done', emoji: '📚' },
  'ten-lessons': { label: '10 lessons done', emoji: '🎓' },
  'scholar': { label: 'Scholar', emoji: '🧠' },
  'graduate': { label: 'Graduated!', emoji: '🏆' },
  'week-streak': { label: '7-day streak', emoji: '🔥' },
  'first-challenge': { label: 'First challenge pick', emoji: '🎯' },
  'first-trade': { label: 'First paper trade', emoji: '💼' },
};

const TRACK_COLORS: Record<string, string> = {
  forest: 'var(--forest)',
  amber: 'var(--amber)',
  dusty: 'var(--dusty)',
  brick: 'var(--brick)',
  navy: '#2a3a5c',
};

export default function LearnPage() {
  const { user, refresh } = useAuth();
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [progress, setProgress] = useState<LearnProgress | null>(null);
  const [openLesson, setOpenLesson] = useState<Lesson | null>(null);
  const [openCompleted, setOpenCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTrack, setActiveTrack] = useState<string>('all');
  const [search, setSearch] = useState('');

  const loadAll = useCallback(async () => {
    const [lData, pData] = await Promise.all([
      learnApi.lessons().catch(() => null),
      learnApi.progress().catch(() => null),
    ]);
    if (lData) {
      setLessons(lData.lessons);
      if (lData.tracks) setTracks(lData.tracks);
    }
    if (pData) setProgress(pData);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function openLessonById(id: string) {
    const { lesson, completed } = await learnApi.lesson(id);
    setOpenLesson(lesson);
    setOpenCompleted(completed);
  }

  async function markComplete(id: string) {
    const result = await learnApi.complete(id);
    setOpenCompleted(true);
    setLessons((prev) => prev.map((l) => l.id === id ? { ...l, completed: true } : l));
    if (progress) {
      setProgress((p) => p ? { ...p, streak: result.streak, completedCount: result.completedCount } : p);
    }
    await refresh();
  }

  const filteredLessons = useMemo(() => {
    let list = lessons;
    if (activeTrack !== 'all') list = list.filter((l) => l.trackId === activeTrack);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((l) => l.title.toLowerCase().includes(q) || l.subtitle.toLowerCase().includes(q));
    }
    return list;
  }, [lessons, activeTrack, search]);

  const completedCount = lessons.filter((l) => l.completed).length;
  const totalCount = lessons.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Track progress breakdown
  const trackProgress = useMemo(() =>
    tracks.map((t) => {
      const tLessons = lessons.filter((l) => l.trackId === t.id);
      const tDone = tLessons.filter((l) => l.completed).length;
      return { ...t, done: tDone, total: tLessons.length };
    }),
  [tracks, lessons]);

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-10">
      <header className="mb-8 animate-fadeUp">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen size={14} className="text-forest" />
          <span className="eyebrow">Learn</span>
        </div>
        <h1 className="font-serif text-4xl md:text-5xl tracking-tight2">Trading Academy</h1>
        <p className="text-ink-secondary mt-2 text-[15px]">
          {totalCount}+ plain-English lessons across 5 tracks. No jargon, no fluff.
        </p>
      </header>

      {/* Progress bar + streak */}
      <div className="card mb-6 animate-fadeUp animate-delay-1">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-[13px] mb-2">
              <span className="font-medium">{completedCount} of {totalCount} lessons completed</span>
              <span className="text-ink-tertiary">{progressPct}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--hairline)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'var(--forest)' }}
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 1, ease: EASE, delay: 0.3 }}
              />
            </div>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center">
                <Flame size={16} className="text-amber" />
                <span className="font-serif text-2xl tracking-tight1">{progress?.streak ?? 0}</span>
              </div>
              <div className="text-[11px] text-ink-tertiary">day streak</div>
            </div>
            {progressPct === 100 && (
              <span className="pill pill-forest gap-1">
                <Trophy size={11} /> Graduated
              </span>
            )}
          </div>
        </div>

        {/* Badges */}
        {user?.badges && user.badges.length > 0 && (
          <div className="mt-4 pt-4 border-t border-hairline">
            <div className="eyebrow mb-2">Your badges</div>
            <div className="flex flex-wrap gap-2">
              {user.badges.map((b) => {
                const meta = BADGE_META[b];
                return (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium"
                    style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
                  >
                    <span>{meta?.emoji ?? '🏅'}</span>
                    <span>{meta?.label ?? b}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Track progress cards */}
      {trackProgress.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6 animate-fadeUp animate-delay-1">
          {trackProgress.map((t) => {
            const color = TRACK_COLORS[t.color] || 'var(--forest)';
            const pct = t.total > 0 ? Math.round((t.done / t.total) * 100) : 0;
            const isActive = activeTrack === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTrack(isActive ? 'all' : t.id)}
                className="card text-left transition hover:shadow-cardHover"
                style={{
                  borderColor: isActive ? color : 'transparent',
                  borderWidth: 2,
                  borderStyle: 'solid',
                }}
              >
                <div className="text-2xl mb-2">{t.emoji}</div>
                <div className="text-[12px] font-semibold leading-tight mb-1">{t.title}</div>
                <div className="text-[10px] text-ink-tertiary mb-2">{t.done}/{t.total}</div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--hairline)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Track filter tabs + search */}
      <div className="flex items-center gap-3 mb-5 animate-fadeUp animate-delay-1 flex-wrap">
        <button
          onClick={() => setActiveTrack('all')}
          className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition ${activeTrack === 'all' ? 'glass-chip text-ink' : 'glass-chip-hover text-ink-secondary'}`}
        >
          All lessons
        </button>
        {tracks.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTrack(activeTrack === t.id ? 'all' : t.id)}
            className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition ${activeTrack === t.id ? 'glass-chip text-ink' : 'glass-chip-hover text-ink-secondary'}`}
          >
            {t.emoji} {t.title}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] transition" style={{ background: 'var(--cream-tint)', border: '1px solid var(--hairline)' }}>
          <Search size={13} className="text-ink-tertiary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lessons…"
            className="bg-transparent outline-none text-[13px] w-36"
          />
        </div>
      </div>

      {/* Lesson list */}
      {loading ? (
        <div className="grid gap-3">
          {[1,2,3,4,5,6].map((i) => <div key={i} className="card skel h-20" />)}
        </div>
      ) : filteredLessons.length === 0 ? (
        <div className="card py-12 text-center">
          <div className="text-3xl mb-3">📭</div>
          <p className="text-ink-secondary text-[15px]">No lessons match your search.</p>
          <button onClick={() => { setSearch(''); setActiveTrack('all'); }} className="text-forest text-sm mt-2 hover:underline">Clear filters</button>
        </div>
      ) : (
        <div className="grid gap-2">
          {filteredLessons.map((l, i) => {
            const trackInfo = tracks.find((t) => t.id === l.trackId);
            const color = TRACK_COLORS[trackInfo?.color || 'forest'];
            return (
              <motion.button
                key={l.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE, delay: i * 0.03 }}
                onClick={() => openLessonById(l.id)}
                className="card flex items-center gap-4 text-left hover:shadow-cardHover transition w-full"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                  style={{
                    background: l.completed
                      ? 'color-mix(in srgb, var(--forest) 15%, var(--cream-tint))'
                      : `color-mix(in srgb, ${color} 8%, var(--cream-tint))`,
                  }}
                >
                  {l.completed ? '✓' : l.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-[14px]">{l.title}</span>
                    {l.type === 'case-study' && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'color-mix(in srgb, var(--amber) 15%, transparent)', color: 'var(--amber)' }}>
                        Case Study
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-ink-secondary truncate">{l.subtitle}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {trackInfo && (
                      <span className="text-[10px] font-medium" style={{ color }}>{trackInfo.emoji} {trackInfo.title}</span>
                    )}
                    <span className="text-[10px] text-ink-tertiary">· {l.readingMinutes} min</span>
                  </div>
                </div>
                {l.completed ? (
                  <CheckCircle2 size={17} className="text-forest flex-shrink-0" weight="fill" />
                ) : (
                  <ChevronRight size={15} className="text-ink-tertiary flex-shrink-0" />
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Lesson modal */}
      <AnimatePresence>
        {openLesson && (
          <LessonModal
            lesson={openLesson}
            completed={openCompleted}
            trackColor={TRACK_COLORS[tracks.find((t) => t.id === openLesson.trackId)?.color || 'forest']}
            onClose={() => setOpenLesson(null)}
            onComplete={() => markComplete(openLesson.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Lesson modal ───────────────────────────────────────────────────────── */

function LessonModal({
  lesson,
  completed,
  trackColor,
  onClose,
  onComplete,
}: {
  lesson: Lesson;
  completed: boolean;
  trackColor: string;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [eli10, setEli10] = useState(false);
  const quizCorrect = quizAnswer === lesson.quiz.correct;

  const bodyText = eli10 && lesson.eli10 ? lesson.eli10 : lesson.body;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6 h-[100dvh]"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="w-full md:max-w-2xl max-h-[88dvh] md:max-h-[92vh] overflow-y-auto overscroll-contain rounded-t-3xl md:rounded-3xl"
        style={{
          background: 'var(--glass-sidebar-sheen), var(--glass-sidebar-bg)',
          backdropFilter: 'blur(40px) saturate(180%)',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--glass-shadow)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 md:p-8 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-6">
            <div>
              <div className="text-4xl mb-2">{lesson.emoji}</div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="font-serif text-2xl md:text-3xl tracking-tight1">{lesson.title}</h2>
                {lesson.type === 'case-study' && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'color-mix(in srgb, var(--amber) 15%, transparent)', color: 'var(--amber)' }}>
                    Case Study
                  </span>
                )}
              </div>
              <p className="text-ink-secondary text-[14px]">{lesson.subtitle}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-cream-tint transition text-ink-tertiary flex-shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* ELI10 toggle */}
          {lesson.eli10 && lesson.eli10.length > 0 && (
            <div className="flex items-center gap-2 mb-5">
              <button
                onClick={() => setEli10(false)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition ${!eli10 ? 'glass-chip text-ink' : 'text-ink-tertiary hover:text-ink'}`}
              >
                Standard
              </button>
              <button
                onClick={() => setEli10(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition ${eli10 ? 'glass-chip text-ink' : 'text-ink-tertiary hover:text-ink'}`}
              >
                <Zap size={11} weight={eli10 ? 'fill' : 'regular'} />
                ELI10
              </button>
              {eli10 && <span className="text-[11px] text-ink-tertiary">Explain Like I'm 10</span>}
            </div>
          )}

          {/* Body */}
          <div className="space-y-4 mb-6">
            {bodyText.map((para, i) => (
              <p key={i} className="text-[15px] leading-relaxed text-ink-secondary">{para}</p>
            ))}
          </div>

          {/* Key terms */}
          {lesson.keyTerms.length > 0 && (
            <div
              className="rounded-2xl p-5 mb-6"
              style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
            >
              <div className="eyebrow mb-3">Key terms</div>
              <div className="space-y-3">
                {lesson.keyTerms.map((kt) => (
                  <div key={kt.term}>
                    <span className="font-semibold text-[14px]">{kt.term}</span>
                    <span className="text-ink-secondary text-[14px]"> - {kt.definition}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quiz */}
          <div
            className="rounded-2xl p-5 mb-6"
            style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
          >
            <div className="flex items-center gap-1.5 mb-3">
              <Sparkles size={13} className="text-amber" />
              <span className="eyebrow text-amber">Quick check</span>
            </div>
            <p className="font-medium text-[15px] mb-3">{lesson.quiz.question}</p>
            <div className="space-y-2">
              {lesson.quiz.options.map((opt, i) => {
                const isSelected = quizAnswer === i;
                const isCorrect = i === lesson.quiz.correct;
                const showResult = quizSubmitted;
                let bg = 'var(--cream-tint)';
                let border = 'transparent';
                if (showResult && isCorrect) { bg = 'color-mix(in srgb, var(--forest) 12%, var(--cream-tint))'; border = 'var(--forest)'; }
                else if (showResult && isSelected && !isCorrect) { bg = 'color-mix(in srgb, var(--brick) 12%, var(--cream-tint))'; border = 'var(--brick)'; }
                else if (isSelected) { border = 'var(--ink-tertiary)'; }

                return (
                  <button
                    key={i}
                    disabled={quizSubmitted}
                    onClick={() => setQuizAnswer(i)}
                    className="w-full text-left px-4 py-3 rounded-2xl text-[14px] transition border"
                    style={{ background: bg, borderColor: border }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {!quizSubmitted && quizAnswer !== null && (
              <button
                onClick={() => setQuizSubmitted(true)}
                className="btn-forest mt-3 text-sm"
              >
                Check answer
              </button>
            )}
            {quizSubmitted && (
              <p className={`mt-3 text-sm font-medium ${quizCorrect ? 'text-forest' : 'text-brick'}`}>
                {quizCorrect ? '✓ Correct! Great work.' : `✗ Not quite - the right answer is: "${lesson.quiz.options[lesson.quiz.correct]}"`}
              </p>
            )}
          </div>

          {/* Mark complete */}
          {completed ? (
            <div className="flex items-center gap-2 text-forest text-sm font-medium justify-center py-2">
              <CheckCircle2 size={16} weight="fill" /> Lesson completed
            </div>
          ) : (
            <button
              onClick={() => { onComplete(); }}
              className="btn-forest w-full justify-center"
            >
              <CheckCircle2 size={15} /> Mark as complete
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
