import { Alert } from '../models/Alert';
import { twelveDataQuote, twelveDataHistory } from './twelveData';
import { finnhubQuote } from './finnhub';
import { yahooQuote, yahooHistory } from './yahoo';
import type { NormalizedBar } from './yahoo';

const POLL_INTERVAL = 5 * 60 * 1000;

async function priceFor(ticker: string): Promise<number | null> {
  const q = (await twelveDataQuote(ticker)) || (await finnhubQuote(ticker)) || (await yahooQuote(ticker));
  return q?.price ?? null;
}

async function historyFor(ticker: string): Promise<NormalizedBar[] | null> {
  return (await twelveDataHistory(ticker, 60)) || (await yahooHistory(ticker, 60));
}

/* ── Technical helpers (inline so alertChecker has no circular dep) ─────── */

function computeRsi(bars: NormalizedBar[], period = 14): number | null {
  if (bars.length < period + 1) return null;
  let gain = 0; let loss = 0;
  for (let i = bars.length - period; i < bars.length; i++) {
    const d = bars[i].close - bars[i - 1].close;
    if (d >= 0) gain += d; else loss -= d;
  }
  const avgLoss = loss / period;
  if (avgLoss === 0) return 100;
  const rs = (gain / period) / avgLoss;
  return 100 - 100 / (1 + rs);
}

function emaArr(vals: number[], w: number): number[] {
  const k = 2 / (w + 1); let prev = vals[0];
  return vals.map((v, i) => { prev = i === 0 ? v : v * k + prev * (1 - k); return prev; });
}

function computeMacdHistogram(bars: NormalizedBar[]): number | null {
  if (bars.length < 35) return null;
  const closes = bars.map((b) => b.close);
  const ema12 = emaArr(closes, 12); const ema26 = emaArr(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signal = emaArr(macdLine.slice(-50), 9);
  const last = macdLine[macdLine.length - 1];
  const sig = signal[signal.length - 1];
  return last - sig;  // positive = MACD above signal (bullish)
}

/* ── Main tick ───────────────────────────────────────────────────────────── */

async function tick(): Promise<void> {
  try {
    const active = await Alert.find({ active: true });
    if (!active.length) return;

    const byTicker = new Map<string, typeof active>();
    for (const a of active) {
      const arr = byTicker.get(a.ticker) || [];
      arr.push(a); byTicker.set(a.ticker, arr);
    }

    for (const [ticker, group] of byTicker.entries()) {
      // Determine what data we need for this group
      const needsPrice = group.some((a) => a.alertType === 'price' || !a.alertType);
      const needsHistory = group.some((a) =>
        ['rsi_above','rsi_below','macd_bullish','macd_bearish','vol_spike'].includes(a.alertType || '')
      );

      const price   = needsPrice   ? await priceFor(ticker)   : null;
      const bars    = needsHistory  ? await historyFor(ticker) : null;
      const rsi     = bars ? computeRsi(bars) : null;
      const macdH   = bars ? computeMacdHistogram(bars) : null;

      for (const a of group) {
        const type = a.alertType || 'price';
        let triggered = false;

        if (type === 'price' && price != null) {
          triggered = (a.condition === 'above' && price >= a.price) ||
                      (a.condition === 'below' && price <= a.price);
        } else if (type === 'rsi_above' && rsi != null) {
          triggered = rsi >= a.threshold;
        } else if (type === 'rsi_below' && rsi != null) {
          triggered = rsi <= a.threshold;
        } else if (type === 'macd_bullish' && macdH != null) {
          triggered = macdH > 0;
        } else if (type === 'macd_bearish' && macdH != null) {
          triggered = macdH < 0;
        } else if (type === 'vol_spike' && bars && bars.length >= 20) {
          const todayVol = bars[bars.length - 1].volume;
          const avgVol = bars.slice(-20, -1).reduce((s, b) => s + b.volume, 0) / 19;
          triggered = avgVol > 0 && todayVol >= avgVol * 2;
        }

        if (triggered) {
          a.active = false;
          a.triggeredAt = new Date();
          await a.save();
          console.log(`  ⚡ alert triggered: ${ticker} ${type} (${a.alertType === 'price' ? `$${a.price}` : a.threshold})`);
        }
      }
    }
  } catch (err) {
    console.error('Alert checker error:', err);
  }
}

export function startAlertChecker(): void {
  console.log(`✓ Alert checker running every ${POLL_INTERVAL / 1000}s`);
  setTimeout(() => { tick(); setInterval(tick, POLL_INTERVAL); }, 30_000);
}
