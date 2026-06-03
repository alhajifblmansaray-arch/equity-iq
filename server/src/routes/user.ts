import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { User, IUser } from '../models/User';

const router = Router();

router.use(requireAuth);

router.get('/watchlist', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    res.json({ watchlist: user.watchlist });
  } catch (err) {
    next(err);
  }
});

router.post('/watchlist', async (req, res, next) => {
  try {
    const ticker = String(req.body?.ticker || '').toUpperCase().trim();
    if (!/^[A-Z][A-Z0-9.\-]{0,9}$/.test(ticker)) {
      res.status(400).json({ error: 'Invalid ticker.' });
      return;
    }
    const user = req.user as IUser;
    if (!user.watchlist.includes(ticker)) {
      user.watchlist.push(ticker);
      await user.save();
    }
    res.json({ watchlist: user.watchlist });
  } catch (err) {
    next(err);
  }
});

router.delete('/watchlist/:ticker', async (req, res, next) => {
  try {
    const ticker = String(req.params.ticker || '').toUpperCase().trim();
    const user = req.user as IUser;
    user.watchlist = user.watchlist.filter((t) => t !== ticker);
    await user.save();
    res.json({ watchlist: user.watchlist });
  } catch (err) {
    next(err);
  }
});

export default router;
