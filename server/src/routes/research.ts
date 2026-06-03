import { Router } from 'express';
import { buildResearchReport } from '../services/research';
import { requireAuth } from '../middleware/auth';

const router = Router();

const TICKER_RE = /^[A-Z][A-Z0-9.\-]{0,9}$/;

router.get('/:ticker', requireAuth, async (req, res, next) => {
  const ticker = String(req.params.ticker || '').toUpperCase().trim();
  if (!TICKER_RE.test(ticker)) {
    res.status(400).json({ error: 'Invalid ticker symbol.' });
    return;
  }
  try {
    const report = await buildResearchReport(ticker);
    if (!report.snapshot && !report.priceHistory) {
      res.status(404).json({ error: `No data found for ${ticker}.` });
      return;
    }
    res.json(report);
  } catch (err) {
    next(err);
  }
});

export default router;
