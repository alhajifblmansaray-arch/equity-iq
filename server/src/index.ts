import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';

import { connectDB } from './config/db';
import { configurePassport } from './config/passport';
import authRoutes from './routes/auth';
import researchRoutes from './routes/research';
import userRoutes from './routes/user';
import newsRoutes from './routes/news';
import calendarRoutes from './routes/calendar';
import alertRoutes from './routes/alerts';
import { startAlertChecker } from './services/alertChecker';

const PORT = Number(process.env.PORT) || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/equity-iq';

if (!process.env.SESSION_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET environment variable must be set in production.');
  }
  console.warn('⚠️  SESSION_SECRET not set — using insecure default. Set it in server/.env before deploying.');
}
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-production';

async function main(): Promise<void> {
  await connectDB(MONGODB_URI);

  const app = express();
  app.set('trust proxy', 1);

  app.use(
    cors({
      origin: CLIENT_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '256kb' }));

  app.use(
    session({
      name: 'equity.sid',
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({ mongoUrl: MONGODB_URI, ttl: 14 * 24 * 60 * 60 }),
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 14 * 24 * 60 * 60 * 1000,
      },
    })
  );

  configurePassport();
  app.use(passport.initialize());
  app.use(passport.session());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/research', researchRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/news', newsRoutes);
  app.use('/api/calendar', calendarRoutes);
  app.use('/api/alerts', alertRoutes);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  });

  app.listen(PORT, () => {
    console.log(`✓ EquityIQ API listening on http://localhost:${PORT}`);
    console.log(`  → client origin: ${CLIENT_ORIGIN}`);
    startAlertChecker();
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
