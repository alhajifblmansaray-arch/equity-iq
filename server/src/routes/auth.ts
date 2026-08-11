import crypto from 'crypto';
import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { User, IUser } from '../models/User';
import { googleEnabled } from '../config/passport';
import { sendMail, passwordResetEmail } from '../services/mailer';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  name: z.string().min(1).max(80),
});

function sanitize(user: IUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl || null,
    goal: user.goal || null,
    mode: user.mode || 'beginner',
    badges: user.badges || [],
    lessonStreak: user.lessonStreak || 0,
    watchlist: user.watchlist,
    createdAt: user.createdAt,
  };
}

router.get('/me', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    res.json({ user: sanitize(req.user as IUser), googleEnabled: googleEnabled() });
    return;
  }
  res.json({ user: null, googleEnabled: googleEnabled() });
});

router.post('/signup', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input.' });
    return;
  }
  const { email, password, name } = parsed.data;
  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }
    const passwordHash = await User.hashPassword(password);
    const user = await User.create({ email: email.toLowerCase(), name, passwordHash });
    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json({ user: sanitize(user) });
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', authLimiter, (req, res, next) => {
  passport.authenticate('local', (err: Error | null, user: IUser | false, info: { message?: string } | undefined) => {
    if (err) return next(err);
    if (!user) {
      res.status(401).json({ error: info?.message || 'Invalid email or password.' });
      return;
    }
    req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      res.json({ user: sanitize(user) });
    });
  })(req, res, next);
});

/* ── Password reset ─────────────────────────────────────────────────────────── */

// Deliberately stricter than login: this endpoint sends mail on demand.
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many reset requests. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// POST /forgot-password — always reports success so the response can't be used
// to discover which email addresses have accounts.
router.post('/forgot-password', resetLimiter, async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      res.status(400).json({ error: 'Enter a valid email address.' });
      return;
    }

    const user = await User.findOne({ email });
    const generic = { ok: true, message: 'If that email has an account, a reset link is on its way.' };

    // Google-only accounts have no password to reset.
    if (!user || !user.passwordHash) { res.json(generic); return; }

    const raw = crypto.randomBytes(32).toString('hex');
    user.resetTokenHash = hashToken(raw);
    user.resetTokenExpires = new Date(Date.now() + RESET_TTL_MS);
    await user.save();

    const origin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
    const link = `${origin}/reset-password?token=${raw}`;
    const { subject, html, text } = passwordResetEmail(user.name, link);
    const result = await sendMail(user.email, subject, html, text);

    if (!result.delivered) {
      console.warn(`Password reset for ${user.email} was not delivered (${result.provider}): ${result.error ?? 'no provider configured'}`);
    }

    // In development, hand the link back so the flow is testable without a mail provider.
    const devLink = process.env.NODE_ENV !== 'production' && !result.delivered ? link : undefined;
    res.json({ ...generic, ...(devLink ? { devLink } : {}) });
  } catch (err) { next(err); }
});

// POST /reset-password — consumes the token and sets the new password.
router.post('/reset-password', authLimiter, async (req, res, next) => {
  try {
    const token = String(req.body?.token || '');
    const password = String(req.body?.password || '');

    if (!token) { res.status(400).json({ error: 'Reset link is missing its token.' }); return; }
    if (password.length < 8) { res.status(400).json({ error: 'Password must be at least 8 characters.' }); return; }

    const user = await User.findOne({
      resetTokenHash: hashToken(token),
      resetTokenExpires: { $gt: new Date() },
    });
    if (!user) { res.status(400).json({ error: 'That reset link is invalid or has expired.' }); return; }

    user.passwordHash = await User.hashPassword(password);
    user.resetTokenHash = undefined;
    user.resetTokenExpires = undefined;
    await user.save();

    // Sign them straight in — they've just proven control of the mailbox.
    req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      res.json({ user: sanitize(user) });
    });
  } catch (err) { next(err); }
});

// GET /reset-password/:token — lets the page tell a good link from a dead one
// before asking for a new password.
router.get('/reset-password/:token', async (req, res, next) => {
  try {
    const user = await User.findOne({
      resetTokenHash: hashToken(req.params.token),
      resetTokenExpires: { $gt: new Date() },
    });
    res.json({ valid: Boolean(user), email: user?.email ?? null });
  } catch (err) { next(err); }
});

router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie('equity.sid');
      res.json({ ok: true });
    });
  });
});

if (googleEnabled()) {
  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

  router.get(
    '/google/callback',
    passport.authenticate('google', {
      failureRedirect: `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/login?error=google`,
    }),
    (req, res) => {
      res.redirect(`${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/portfolio`);
    }
  );
}

export default router;
