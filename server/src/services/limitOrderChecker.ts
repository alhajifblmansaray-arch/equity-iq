import { SimulatorLimitOrder } from '../models/SimulatorLimitOrder';
import { SimulatorPortfolio } from '../models/SimulatorPortfolio';
import { SimulatorSnapshot } from '../models/SimulatorSnapshot';
import { SimulatorTrade } from '../models/SimulatorTrade';
import { finnhubQuote } from './finnhub';
import { twelveDataQuote } from './twelveData';
import { yahooQuote } from './yahoo';

async function livePrice(ticker: string): Promise<number | null> {
  const q =
    (await twelveDataQuote(ticker)) ||
    (await finnhubQuote(ticker)) ||
    (await yahooQuote(ticker));
  return q?.price ?? null;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function snapshot(userId: string, cash: number, investedValue: number) {
  await SimulatorSnapshot.findOneAndUpdate(
    { user: userId, date: today() },
    { totalValue: cash + investedValue, cash, investedValue },
    { upsert: true, new: true }
  ).catch(() => {});
}

export async function checkLimitOrders() {
  try {
    const pending = await SimulatorLimitOrder.find({
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });

    if (pending.length === 0) return;

    // Fetch one price per unique ticker
    const tickers = [...new Set(pending.map((o) => o.ticker))];
    const prices: Record<string, number | null> = {};
    await Promise.all(tickers.map(async (t) => { prices[t] = await livePrice(t); }));

    for (const order of pending) {
      const price = prices[order.ticker];
      if (price == null) continue;

      // Determine trigger condition
      // limit-buy: execute when price ≤ limitPrice
      // stop-buy:  execute when price ≥ limitPrice (breakout)
      // limit-sell: execute when price ≥ limitPrice (profit target)
      // stop-sell:  execute when price ≤ limitPrice (stop-loss)
      let triggered = false;
      if (order.action === 'buy') {
        triggered = order.orderType === 'limit' ? price <= order.limitPrice : price >= order.limitPrice;
      } else {
        triggered = order.orderType === 'limit' ? price >= order.limitPrice : price <= order.limitPrice;
      }
      if (!triggered) continue;

      const portfolio = await SimulatorPortfolio.findOne({ user: order.user });
      if (!portfolio) continue;

      const orderLabel = order.orderType === 'stop'
        ? (order.action === 'buy' ? 'Stop-buy' : 'Stop-loss')
        : (order.action === 'buy' ? 'Limit buy' : 'Limit sell');
      const noteTag = `[${orderLabel} @ $${order.limitPrice.toFixed(2)}]${order.note ? ' ' + order.note : ''}`;

      if (order.action === 'buy') {
        const cost = price * order.shares;
        if (portfolio.cash < cost) {
          order.status = 'cancelled';
          await order.save();
          continue;
        }
        const existing = portfolio.holdings.find((h) => h.ticker === order.ticker);
        if (existing) {
          const totalShares = existing.shares + order.shares;
          existing.avgCost = (existing.avgCost * existing.shares + price * order.shares) / totalShares;
          existing.shares = totalShares;
        } else {
          portfolio.holdings.push({ ticker: order.ticker, shares: order.shares, avgCost: price });
        }
        portfolio.cash -= cost;
        await portfolio.save();

        await SimulatorTrade.create({
          user: order.user,
          ticker: order.ticker,
          action: 'buy',
          shares: order.shares,
          price,
          total: cost,
          pnl: null,
          pnlPct: null,
          aiDebrief: null,
          note: noteTag,
          season: portfolio.season,
        });
      } else {
        // sell
        const holding = portfolio.holdings.find(
          (h) => h.ticker === order.ticker && h.shares > 0
        );
        if (!holding || holding.shares < order.shares) {
          order.status = 'cancelled';
          await order.save();
          continue;
        }
        const proceeds = price * order.shares;
        const costBasis = holding.avgCost * order.shares;
        const pnl = proceeds - costBasis;
        const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

        holding.shares -= order.shares;
        if (holding.shares === 0) {
          portfolio.holdings = portfolio.holdings.filter((h) => h.ticker !== order.ticker);
        }
        portfolio.cash += proceeds;
        await portfolio.save();

        await SimulatorTrade.create({
          user: order.user,
          ticker: order.ticker,
          action: 'sell',
          shares: order.shares,
          price,
          total: proceeds,
          pnl,
          pnlPct,
          aiDebrief: null,
          note: noteTag,
          season: portfolio.season,
        });
      }

      order.status = 'filled';
      order.filledPrice = price;
      order.filledAt = new Date();
      await order.save();

      const investedValue = portfolio.holdings.reduce((s, h) => s + h.avgCost * Math.abs(h.shares), 0);
      snapshot(String(order.user), portfolio.cash, investedValue);
    }

    // Expire overdue pending orders
    await SimulatorLimitOrder.updateMany(
      { status: 'pending', expiresAt: { $lte: new Date() } },
      { status: 'cancelled' }
    );
  } catch (err) {
    console.error('limitOrderChecker:', err);
  }
}

export function startLimitOrderChecker(intervalMs = 5 * 60_000) {
  console.log('  ✓ Limit order checker started (5 min interval)');
  setInterval(checkLimitOrders, intervalMs);
}
