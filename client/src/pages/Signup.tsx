import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Mail, User as UserIcon } from '../lib/icons';
import Logo from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import PasswordField from '../components/PasswordField';

export default function Signup() {
  const { signup, googleEnabled } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    try {
      await signup(email, password, name);
      nav('/portfolio');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not create account.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 md:px-10 h-16 flex items-center justify-between">
        <Link to="/"><Logo size="md" /></Link>
        <Link to="/login" className="text-sm text-ink-secondary hover:text-ink">
          Already have an account? <span className="font-medium text-ink">Log in</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-fadeUp">
          <div className="text-center mb-8">
            <h1 className="font-serif text-4xl md:text-5xl tracking-tight2 mb-3">Create your account.</h1>
            <p className="text-ink-secondary">Free forever. No credit card.</p>
          </div>

          <div className="card">
            {error && (
              <div className="flex items-start gap-2 text-brick text-sm bg-[rgba(192,78,64,0.08)] rounded-2xl px-4 py-3 mb-5">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <Field icon={<UserIcon size={16} />} label="Name" type="text" value={name} onChange={setName} placeholder="Alex Morgan" autoFocus />
              <Field icon={<Mail size={16} />} label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
              <label className="block">
                <span className="eyebrow block mb-2">Password</span>
                <PasswordField
                  value={password}
                  onChange={setPassword}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
              </label>
              <button type="submit" disabled={submitting} className="btn-primary w-full text-base py-3 disabled:opacity-50">
                {submitting ? 'Creating account…' : <>Create account <ArrowRight size={16} className="ml-1.5" /></>}
              </button>
            </form>

            {googleEnabled && (
              <>
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-hairline" />
                  <span className="text-xs uppercase tracking-eyebrow text-ink-tertiary">or</span>
                  <div className="flex-1 h-px bg-hairline" />
                </div>
                <a href="/api/auth/google" className="btn-ghost w-full text-base py-3 gap-2">
                  <GoogleIcon /> Continue with Google
                </a>
              </>
            )}
          </div>

          <p className="text-center text-xs text-ink-tertiary mt-6">
            By signing up you agree to our terms. EquityIQ provides research, not investment advice.
          </p>
        </div>
      </main>
    </div>
  );
}

function Field({
  icon,
  label,
  type,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  icon: React.ReactNode;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="eyebrow block mb-2">{label}</span>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-tertiary">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-cream-tint border border-transparent focus:border-ink-tertiary focus:bg-white transition text-[15px]"
        />
      </div>
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18">
      <path d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
