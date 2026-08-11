import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowRight } from '../lib/icons';
import Logo from '../components/Logo';
import PasswordField from '../components/PasswordField';
import { auth } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const nav = useNavigate();
  const { refresh } = useAuth();

  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Check the link before asking for a password — a dead link should say so up front.
  useEffect(() => {
    if (!token) { setChecking(false); return; }
    auth.checkResetToken(token)
      .then((r) => { setValid(r.valid); setEmail(r.email); })
      .catch(() => setValid(false))
      .finally(() => setChecking(false));
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Those passwords don’t match.'); return; }

    setSubmitting(true);
    try {
      await auth.resetPassword(token, password);
      await refresh();
      nav('/portfolio');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not reset your password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 md:px-10 h-16 flex items-center justify-between">
        <Link to="/"><Logo size="md" /></Link>
        <Link to="/login" className="text-sm text-ink-secondary hover:text-ink">
          <span className="font-medium text-ink">Sign in</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-fadeUp">
          <div className="text-center mb-8">
            <h1 className="font-serif text-4xl tracking-tight2 mb-3">Choose a new password</h1>
            {email && <p className="text-ink-secondary">for {email}</p>}
          </div>

          <div className="card">
            {checking ? (
              <p className="text-sm text-ink-secondary text-center py-4">Checking your link…</p>
            ) : !valid ? (
              <div className="text-center py-2">
                <div
                  className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{ background: 'rgba(192,78,64,0.12)' }}
                >
                  <AlertCircle size={22} className="text-brick" />
                </div>
                <p className="font-medium text-ink mb-1">This link has expired</p>
                <p className="text-sm text-ink-secondary leading-relaxed mb-5">
                  Reset links last an hour and can only be used once. Request a fresh one.
                </p>
                <Link to="/forgot-password" className="btn-forest btn-sm">Send a new link</Link>
              </div>
            ) : (
              <>
                {error && (
                  <div className="flex items-start gap-2 text-brick text-sm bg-[rgba(192,78,64,0.08)] rounded-2xl px-4 py-3 mb-5">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={onSubmit} className="space-y-4">
                  <label className="block">
                    <span className="eyebrow block mb-2">New password</span>
                    <PasswordField value={password} onChange={setPassword} placeholder="At least 8 characters" autoComplete="new-password" />
                  </label>
                  <label className="block">
                    <span className="eyebrow block mb-2">Confirm password</span>
                    <PasswordField value={confirm} onChange={setConfirm} placeholder="Type it again" autoComplete="new-password" />
                  </label>

                  <button type="submit" disabled={submitting} className="btn-primary w-full text-base py-3 disabled:opacity-50">
                    {submitting ? 'Saving…' : <>Set password and sign in <ArrowRight size={16} className="ml-1.5" /></>}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
