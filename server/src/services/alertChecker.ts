import { Alert } from '../models/Alert';
import { twelveDataQuote } from './twelveData';
import { finnhubQuote } from './finnhub';
import { yahooQuote } from './yahoo';

// Polls active alerts every 5 minutes. Marks any that have crossed their
// threshold as triggered (active=false, triggeredAt=now). The client surfaces
// these on the /alerts page and shows a badge in the sidebar.

const POLL_INTERVAL = 5 * 60 * 1000;

async function priceFor(ticker: string): Promise<number | null> {
  const q = (await twelveDataQuote(ticker)) || (await finnhubQuote(ticker)) || (await yahooQuote(ticker));
  return q?.price ?? null;
}

async function tick(): Promise<void> {
  try {
    const alerts = await Alert.find({ active: true });
    if (alerts.length === 0) return;

    // Group by ticker to avoid duplicate quote fetches per cycle.
    const byTicker = new Map<string, typeof alerts>();
    for (const a of alerts) {
      const arr = byTicker.get(a.ticker) || [];
      arr.push(a);
      byTicker.set(a.ticker, arr);
    }

    for (const [ticker, group] of byTicker.entries()) {
      const price = await priceFor(ticker);
      if (price == null) continue;
      for (const a of group) {
        const triggered =
          (a.condition === 'above' && price >= a.price) ||
          (a.condition === 'below' && price <= a.price);
        if (triggered) {
          a.active = false;
          a.triggeredAt = new Date();
          await a.save();
          console.log(`  ⚡ alert triggered: ${ticker} ${a.condition} $${a.price} (now $${price.toFixed(2)})`);
        }
      }
    }
  } catch (err) {
    console.error('Alert checker error:', err);
  }
}

export function startAlertChecker(): void {
  console.log(`✓ Alert checker running every ${POLL_INTERVAL / 1000}s`);
  // First tick after 30s so the server can warm up first.
  setTimeout(() => {
    tick();
    setInterval(tick, POLL_INTERVAL);
  }, 30_000);
}
