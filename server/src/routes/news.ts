import { Router } from 'express';
import { finnhubMarketNews } from '../services/finnhub';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/market', requireAuth, async (_req, res, next) => {
  try {
    const articles = await finnhubMarketNews(15);
    res.json({ articles: articles || [] });
  } catch (err) {
    next(err);
  }
});

export default router;
