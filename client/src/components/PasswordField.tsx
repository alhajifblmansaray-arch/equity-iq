import { useState } from 'react';
import { Eye, EyeOff, Lock } from '../lib/icons';

interface PasswordFieldProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  id?: string;
  onEnter?: () => void;
}

/**
 * Password input with a reveal toggle.
 *
 * Typing a password you can't see is the main cause of failed sign-ins, so the
 * eye is always available. It defaults to hidden and never persists the revealed
 * state between mounts.
 */
export default function PasswordField({
  value, onChange, placeholder = '••••••••', autoComplete = 'current-password', disabled, id, onEnter,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-tertiary pointer-events-none" />
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter(); }}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        className="w-full pl-10 pr-11 py-3 rounded-2xl text-[15px] outline-none transition disabled:opacity-60"
        style={{
          background: 'color-mix(in srgb, var(--ink) 5%, transparent)',
          border: '1px solid var(--glass-border)',
          color: 'var(--ink)',
        }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-white/15 transition"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        title={visible ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {visible
          ? <EyeOff size={16} className="text-ink-secondary" />
          : <Eye size={16} className="text-ink-tertiary" />}
      </button>
    </div>
  );
}
