import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Mail } from '../lib/icons';
import Logo from '../components/Logo';
import { auth } from '../lib/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await auth.forgotPassword(email.trim());
      setSent(true);
      // Only present outside production, when no mail provider is configured.
      setDevLink(res.devLink ?? null);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not send the reset link.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 md:px-10 h-16 flex items-center justify-between">
        <Logo size="md" />
        <Link to="/login" className="text-sm text-ink-secondary hover:text-ink">
          Remembered it? <span className="font-medium text-ink">Sign in</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-fadeUp">
          <div className="text-center mb-8">
            <h1 className="font-serif text-4xl tracking-tight2 mb-3">Forgot your password?</h1>
            <p className="text-ink-secondary">We'll email you a link to choose a new one.</p>
          </div>

          <div className="card">
            {sent ? (
              <div className="text-center py-2">
                <div
                  className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{ background: 'color-mix(in srgb, var(--forest) 15%, transparent)' }}
                >
                  <Mail size={22} className="text-forest" />
                </div>
                <p className="font-medium text-ink mb-1">Check your inbox</p>
                <p className="text-sm text-ink-secondary leading-relaxed">
                  If <span className="text-ink">{email}</span> has an account, a reset link is on its way.
                  It expires in an hour.
                </p>

                {devLink && (
                  <div
                    className="mt-5 p-3 rounded-2xl text-left"
                    style={{ background: 'color-mix(in srgb, var(--amber) 12%, transparent)' }}
                  >
                    <p className="text-[11px] uppercase tracking-wide text-ink-tertiary mb-1">
                      Development - no mail provider configured
                    </p>
                    <a href={devLink} className="text-[12px] text-ink underline break-all">{devLink}</a>
                  </div>
                )}

                <Link to="/login" className="btn-ghost btn-sm mt-5">Back to sign in</Link>
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
                    <span className="eyebrow block mb-2">Email</span>
                    <div className="relative">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-tertiary" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        autoFocus
                        required
                        className="w-full pl-11 pr-4 py-3 rounded-2xl bg-cream-tint border border-transparent focus:border-ink-tertiary focus:bg-white transition text-[15px]"
                      />
                    </div>
                  </label>

                  <button type="submit" disabled={submitting} className="btn-primary w-full text-base py-3 disabled:opacity-50">
                    {submitting ? 'Sending…' : 'Send reset link'}
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
