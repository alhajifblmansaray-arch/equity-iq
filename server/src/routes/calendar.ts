import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { finnhubEarnings, finnhubMarketEarnings } from '../services/finnhub';

const router = Router();

router.get('/earnings', requireAuth, async (req, res, next) => {
  const days = Math.min(60, Math.max(1, Number(req.query.days) || 14));
  try {
    const events = await finnhubMarketEarnings(days);
    res.json({ events: events || [] });
  } catch (err) {
    next(err);
  }
});

router.get('/earnings/:ticker', requireAuth, async (req, res, next) => {
  const ticker = String(req.params.ticker || '').toUpperCase().trim();
  if (!/^[A-Z][A-Z0-9.\-]{0,9}$/.test(ticker)) {
    res.status(400).json({ error: 'Invalid ticker.' });
    return;
  }
  try {
    const events = await finnhubEarnings(ticker);
    res.json({ ticker, events: events || [] });
  } catch (err) {
    next(err);
  }
});

export default router;
