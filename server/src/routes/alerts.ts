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
    alertType: a.alertType ?? 'price',
    condition: a.condition,
    price: a.price,
    threshold: a.threshold ?? 0,
    active: a.active,
    triggeredAt: a.triggeredAt?.toISOString(),
    createdAt: a.createdAt.toISOString(),
  };
}

const createSchema = z.object({
  ticker:    z.string().regex(/^[A-Z][A-Z0-9.\-]{0,9}$/i),
  alertType: z.enum(['price','rsi_above','rsi_below','macd_bullish','macd_bearish','vol_spike']).default('price'),
  condition: z.enum(['above', 'below']).default('above'),
  price:     z.number().min(0).max(1_000_000).default(0),
  threshold: z.number().min(0).max(100).default(0),
});

router.get('/', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const alerts = await Alert.find({ user: user.id }).sort({ active: -1, createdAt: -1 });
    res.json({ alerts: alerts.map(sanitize) });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input.' });
    return;
  }
  const d = parsed.data;
  if (d.alertType === 'price' && (!d.price || d.price <= 0)) {
    res.status(400).json({ error: 'Price alerts require a positive price.' });
    return;
  }
  if ((d.alertType === 'rsi_above' || d.alertType === 'rsi_below') && (!d.threshold || d.threshold <= 0)) {
    res.status(400).json({ error: 'RSI alerts require a threshold (1–100).' });
    return;
  }
  try {
    const user = req.user as IUser;
    const alert = await Alert.create({
      user: user.id,
      ticker: d.ticker.toUpperCase(),
      alertType: d.alertType,
      condition: d.alertType === 'rsi_above' ? 'above' : d.alertType === 'rsi_below' ? 'below' : d.condition,
      price: d.price,
      threshold: d.threshold,
      active: true,
    });
    res.status(201).json({ alert: sanitize(alert) });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const alert = await Alert.findOneAndDelete({ _id: req.params.id, user: user.id });
    if (!alert) { res.status(404).json({ error: 'Alert not found.' }); return; }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post('/:id/toggle', async (req, res, next) => {
  try {
    const user = req.user as IUser;
    const alert = await Alert.findOne({ _id: req.params.id, user: user.id });
    if (!alert) { res.status(404).json({ error: 'Alert not found.' }); return; }
    alert.active = !alert.active;
    if (alert.active) alert.triggeredAt = undefined;
    await alert.save();
    res.json({ alert: sanitize(alert) });
  } catch (err) { next(err); }
});

export default router;
