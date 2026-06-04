import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { Alert, IAlert } from '../models/Alert';
import { IUser } from '../models/User';

const router = Router();

router.use(requireAuth);

function sanitize(a: IAlert) {
  return {
    id: a.id,
    ticker: a.ticker,
    condition: a.condition,
    price: a.price,
    active: a.active,
    triggeredAt: a.triggeredAt?.toISOString(),
    createdAt: a.createdAt.toISOString(),
  };
}

const createSchema = z.object({
  ticker: z.string().regex(/^[A-Z][A-Z0-9.\-]{0,9}$/i),
  condition: z.enum(['above', 'below']),
  price: z.number().positive().max(1_000_000),
});

router.get('/', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const alerts = await Alert.find({ user: user.id }).sort({ active: -1, createdAt: -1 });
    res.json({ alerts: alerts.map(sanitize) });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input.' });
    return;
  }
  try {
    const user = req.user as IUser;
    const alert = await Alert.create({
      user: user.id,
      ticker: parsed.data.ticker.toUpperCase(),
      condition: parsed.data.condition,
      price: parsed.data.price,
      active: true,
    });
    res.status(201).json({ alert: sanitize(alert) });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const alert = await Alert.findOneAndDelete({ _id: req.params.id, user: user.id });
    if (!alert) {
      res.status(404).json({ error: 'Alert not found.' });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/toggle', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const alert = await Alert.findOne({ _id: req.params.id, user: user.id });
    if (!alert) {
      res.status(404).json({ error: 'Alert not found.' });
      return;
    }
    alert.active = !alert.active;
    if (alert.active) alert.triggeredAt = undefined;
    await alert.save();
    res.json({ alert: sanitize(alert) });
  } catch (err) {
    next(err);
  }
});

export default router;
