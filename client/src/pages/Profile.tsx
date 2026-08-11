import { ChangeEvent, FormEvent, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Award,
  BookOpen,
  Camera,
  Check,
  Flame,
  Loader2,
  Save,
  User as UserIcon,
} from '../lib/icons';
import { profile as profileApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import type { UserGoal, UserMode } from '../types';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const GOAL_OPTIONS: Array<{ id: UserGoal; label: string; desc: string; emoji: string }> = [
  { id: 'learn', label: 'Learn investing', desc: 'I want to understand how the stock market works', emoji: '📚' },
  { id: 'save', label: 'Grow my savings', desc: 'I want to invest money for the future', emoji: '💰' },
  { id: 'understand', label: 'Follow the news', desc: 'I want to understand what market news means', emoji: '📰' },
  { id: 'trade', label: 'Become a trader', desc: 'I want to actively trade stocks and options', emoji: '📈' },
];

const MODE_OPTIONS: Array<{ id: UserMode; label: string; desc: string }> = [
  { id: 'beginner', label: 'Beginner', desc: 'Plain English explanations, simplified metrics, no jargon' },
  { id: 'intermediate', label: 'Intermediate', desc: 'Full data with some explanations, standard charts' },
  { id: 'advanced', label: 'Advanced', desc: 'Full professional data suite, no hand-holding' },
];

const BADGE_META: Record<string, { label: string; emoji: string; desc: string }> = {
  'first-lesson': { label: 'First Lesson', emoji: '🌱', desc: 'Completed your first lesson' },
  'five-lessons': { label: 'Five Lessons', emoji: '📚', desc: 'Completed 5 lessons' },
  'ten-lessons': { label: '10 Lessons', emoji: '🎓', desc: 'Completed 10 lessons' },
  'graduate': { label: 'Graduate', emoji: '🏆', desc: 'Completed all 12 lessons' },
  'week-streak': { label: 'Week Streak', emoji: '🔥', desc: '7-day learning streak' },
  'first-challenge': { label: 'First Pick', emoji: '🎯', desc: 'Made your first weekly challenge pick' },
  'first-trade': { label: 'First Trade', emoji: '💼', desc: 'Made your first paper trade' },
};

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [goal, setGoal] = useState<UserGoal | null>(user?.goal ?? null);
  const [mode, setMode] = useState<UserMode>(user?.mode || 'beginner');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setAvatarBusy(true);
    try {
      await profileApi.uploadAvatar(file);
      await refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await profileApi.update({ name, goal: goal ?? undefined, mode });
      await refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  const avatarSrc = avatarPreview || user?.avatarUrl;
  const initials = (user?.name || 'U').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="max-w-2xl mx-auto px-6 md:px-10 py-10">
      <header className="mb-8 animate-fadeUp">
        <div className="flex items-center gap-2 mb-2">
          <UserIcon size={14} className="text-forest" />
          <span className="eyebrow">Profile</span>
        </div>
        <h1 className="font-serif text-4xl md:text-5xl tracking-tight2">Your account</h1>
      </header>

      {/* Avatar */}
      <div className="card mb-5 animate-fadeUp animate-delay-1">
        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <div
              className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-2xl font-semibold"
              style={{ background: 'var(--forest)', color: 'var(--cream)' }}
            >
              {avatarSrc ? (
                <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={avatarBusy}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center transition hover:scale-110"
              style={{ background: 'var(--forest)', color: 'var(--cream)' }}
              title="Change photo"
            >
              {avatarBusy ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <div className="font-serif text-2xl tracking-tight1">{user?.name}</div>
            <div className="text-ink-secondary text-sm">{user?.email}</div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-[12px] text-forest mt-1 hover:underline"
            >
              Change profile picture
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Name */}
        <div className="card animate-fadeUp animate-delay-1">
          <div className="eyebrow mb-3">Display name</div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            className="w-full px-4 py-3 rounded-2xl bg-cream-tint border border-transparent focus:border-ink-tertiary focus:bg-white transition text-[15px]"
          />
        </div>

        {/* Experience mode */}
        <div className="card animate-fadeUp animate-delay-1">
          <div className="eyebrow mb-1">Experience level</div>
          <p className="text-[13px] text-ink-secondary mb-4">
            This controls how data is presented - beginner mode uses plain language, advanced shows everything.
          </p>
          <div className="space-y-2">
            {MODE_OPTIONS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition border"
                style={{
                  background: mode === m.id ? 'color-mix(in srgb, var(--forest) 8%, var(--panel-bg))' : 'var(--cream-tint)',
                  borderColor: mode === m.id ? 'var(--forest)' : 'transparent',
                }}
              >
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{
                    borderColor: mode === m.id ? 'var(--forest)' : 'var(--hairline)',
                    background: mode === m.id ? 'var(--forest)' : 'transparent',
                  }}
                >
                  {mode === m.id && <Check size={11} style={{ color: 'var(--cream)' }} />}
                </div>
                <div>
                  <div className="text-[14px] font-medium">{m.label}</div>
                  <div className="text-[12px] text-ink-tertiary">{m.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Goal */}
        <div className="card animate-fadeUp animate-delay-2">
          <div className="eyebrow mb-1">Your goal</div>
          <p className="text-[13px] text-ink-secondary mb-4">
            We'll tailor suggestions and content to what matters most to you.
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {GOAL_OPTIONS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGoal(g.id)}
                className="flex items-start gap-3 px-4 py-3 rounded-2xl text-left transition border"
                style={{
                  background: goal === g.id ? 'color-mix(in srgb, var(--forest) 8%, var(--panel-bg))' : 'var(--cream-tint)',
                  borderColor: goal === g.id ? 'var(--forest)' : 'transparent',
                }}
              >
                <span className="text-xl flex-shrink-0">{g.emoji}</span>
                <div>
                  <div className="text-[13px] font-medium">{g.label}</div>
                  <div className="text-[11px] text-ink-tertiary leading-relaxed">{g.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-forest w-full justify-center disabled:opacity-50"
        >
          {saving ? (
            <><Loader2 size={14} className="animate-spin" /> Saving…</>
          ) : saved ? (
            <><Check size={14} /> Saved!</>
          ) : (
            <><Save size={14} /> Save changes</>
          )}
        </button>
      </form>

      {/* Stats */}
      <div className="card mt-5 animate-fadeUp">
        <div className="eyebrow mb-4">Your stats</div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Flame size={13} className="text-amber" />
              <span className="text-[11px] text-ink-tertiary">Lesson streak</span>
            </div>
            <div className="font-serif text-3xl tracking-tight1">{user?.lessonStreak ?? 0}</div>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1">
              <BookOpen size={13} className="text-forest" />
              <span className="text-[11px] text-ink-tertiary">Badges earned</span>
            </div>
            <div className="font-serif text-3xl tracking-tight1">{user?.badges?.length ?? 0}</div>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Award size={13} className="text-dusty" />
              <span className="text-[11px] text-ink-tertiary">Member since</span>
            </div>
            <div className="font-serif text-xl tracking-tight1">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                : '-'}
            </div>
          </div>
        </div>

        {/* Badges */}
        {user?.badges && user.badges.length > 0 && (
          <div className="mt-5 pt-4 border-t border-hairline">
            <div className="eyebrow mb-3">Badges</div>
            <div className="grid sm:grid-cols-2 gap-2">
              {user.badges.map((b) => {
                const meta = BADGE_META[b] || { label: b, emoji: '🏅', desc: '' };
                return (
                  <div
                    key={b}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-2xl"
                    style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
                  >
                    <span className="text-2xl">{meta.emoji}</span>
                    <div>
                      <div className="text-[13px] font-medium">{meta.label}</div>
                      <div className="text-[11px] text-ink-tertiary">{meta.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
