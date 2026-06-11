import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { User, IUser } from '../models/User';
import { googleEnabled } from '../config/passport';

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
      res.redirect(`${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/dashboard`);
    }
  );
}

export default router;
