import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { WeeklyChallenge } from '../models/WeeklyChallenge';
import { User, IUser } from '../models/User';
import { twelveDataQuote } from '../services/twelveData';
import { finnhubQuote } from '../services/finnhub';
import { yahooQuote } from '../services/yahoo';

const router = Router();
router.use(requireAuth);

// Rotating list of well-known tickers for the weekly challenge
const CHALLENGE_TICKERS = [
  'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'GOOGL', 'META', 'NFLX',
  'AMD', 'PLTR', 'SOFI', 'COIN', 'PYPL', 'SQ', 'SNAP', 'UBER',
  'LYFT', 'ROKU', 'RIVN', 'LCID', 'NIO', 'BABA', 'DIS', 'INTC',
];

function getWeekKey(date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // Monday
  return d.toISOString().slice(0, 10);
}

function getTickerForWeek(weekKey: string): string {
  // Deterministic: hash the week string to pick a ticker
  let hash = 0;
  for (let i = 0; i < weekKey.length; i++) {
    hash = (hash * 31 + weekKey.charCodeAt(i)) & 0xffffffff;
  }
  return CHALLENGE_TICKERS[Math.abs(hash) % CHALLENGE_TICKERS.length];
}

async function livePrice(ticker: string): Promise<number | null> {
  const q =
    (await twelveDataQuote(ticker)) ||
    (await finnhubQuote(ticker)) ||
    (await yahooQuote(ticker));
  return q?.price ?? null;
}

/* GET /api/challenge — current week's challenge */
router.get('/', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const week = getWeekKey();
    const ticker = getTickerForWeek(week);

    let challenge = await WeeklyChallenge.findOne({ week });

    if (!challenge) {
      const price = await livePrice(ticker);
      if (price == null)
        return void res.status(503).json({ error: 'Could not fetch price for this week\'s challenge.' });
      challenge = await WeeklyChallenge.create({
        week,
        ticker,
        startPrice: price,
        endPrice: null,
        picks: [],
        resolved: false,
      });
    }

    const userPick = challenge.picks.find(
      (p) => p.user.toString() === String(user.id)
    );

    // Community stats
    const totalPicks = challenge.picks.length;
    const upPicks = challenge.picks.filter((p) => p.direction === 'up').length;

    res.json({
      week,
      ticker: challenge.ticker,
      startPrice: challenge.startPrice,
      endPrice: challenge.endPrice,
      resolved: challenge.resolved,
      userPick: userPick
        ? { direction: userPick.direction, result: userPick.result }
        : null,
      community: {
        total: totalPicks,
        upPct: totalPicks > 0 ? Math.round((upPicks / totalPicks) * 100) : null,
        downPct: totalPicks > 0 ? Math.round(((totalPicks - upPicks) / totalPicks) * 100) : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

/* POST /api/challenge/pick */
router.post('/pick', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const direction = req.body.direction as 'up' | 'down';
    if (direction !== 'up' && direction !== 'down')
      return void res.status(400).json({ error: 'Direction must be "up" or "down".' });

    const week = getWeekKey();
    const challenge = await WeeklyChallenge.findOne({ week });
    if (!challenge)
      return void res.status(404).json({ error: 'No challenge found for this week.' });

    const existing = challenge.picks.find((p) => p.user.toString() === String(user.id));
    if (existing)
      return void res.status(400).json({ error: 'You already picked this week.' });

    const price = await livePrice(challenge.ticker);

    challenge.picks.push({
      user: user.id,
      direction,
      startPrice: price ?? challenge.startPrice,
      createdAt: new Date(),
      result: null,
    });
    await challenge.save();

    // Award first-pick badge
    if (!user.badges.includes('first-challenge')) {
      user.badges.push('first-challenge');
      await user.save();
    }

    res.json({ ok: true, direction });
  } catch (err) {
    next(err);
  }
});

/* GET /api/challenge/history — past 8 weeks */
router.get('/history', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const challenges = await WeeklyChallenge.find({ resolved: true })
      .sort({ week: -1 })
      .limit(8)
      .lean();

    const history = challenges.map((c) => {
      const pick = c.picks.find((p) => p.user.toString() === String(user.id));
      return {
        week: c.week,
        ticker: c.ticker,
        startPrice: c.startPrice,
        endPrice: c.endPrice,
        direction: pick?.direction ?? null,
        result: pick?.result ?? null,
      };
    });

    res.json({ history });
  } catch (err) {
    next(err);
  }
});

export default router;
