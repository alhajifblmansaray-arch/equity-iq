import type { OptionsAdapter, OptionsImplied } from './types';
import { yahooOptionsAdapter } from './yahooOptions';
import { tradierOptionsAdapter } from './tradierOptions';
import { alphaVantageOptionsAdapter } from './alphaVantageOptions';
import { marketdataOptionsAdapter } from './marketdataOptions';
import { massiveOptionsAdapter } from './massiveOptions';

export type { OptionsImplied, ExpiryImplied, OptionsAdapter } from './types';

const ADAPTERS: Record<string, OptionsAdapter> = {
  yahoo: yahooOptionsAdapter,
  tradier: tradierOptionsAdapter,
  alphavantage: alphaVantageOptionsAdapter,
  marketdata: marketdataOptionsAdapter,
  massive: massiveOptionsAdapter,
};

// Adapters to try, in order: the env-selected one first, then the free ones as
// fallback. marketdata.app works internationally + from cloud IPs (needs a free
// token); Alpha Vantage reuses an existing key but gates/limits options on free
// tier; Tradier needs a token (US-only signup); Yahoo 429s from data-center IPs.
function adapterChain(): OptionsAdapter[] {
  const want = (process.env.OPTIONS_PROVIDER || 'marketdata').toLowerCase();
  const order = [want, 'marketdata', 'alphavantage', 'tradier', 'yahoo'];
  const seen = new Set<string>();
  const chain: OptionsAdapter[] = [];
  for (const name of order) {
    const a = ADAPTERS[name];
    if (a && !seen.has(name) && a.enabled()) {
      chain.push(a);
      seen.add(name);
    }
  }
  return chain.length ? chain : [yahooOptionsAdapter];
}

export async function getOptionsImplied(ticker: string): Promise<OptionsImplied | null> {
  for (const adapter of adapterChain()) {
    try {
      const res = await adapter.getImplied(ticker);
      if (res && res.expiries.length) return res;
    } catch (err) {
      console.error(`getOptionsImplied(${adapter.name}) error:`, err);
    }
  }
  return null;
}

// Compact, prompt-ready summary of the implied-move data for the forecast inputs.
export function formatOptionsImpliedForPrompt(o: OptionsImplied | null): string | null {
  if (!o || !o.expiries.length) return null;
  const lines: string[] = [];
  lines.push(`Options-implied moves (source: ${o.source}, spot $${o.spot.toFixed(2)}):`);
  if (o.frontAtmIV != null) lines.push(`  Front ATM IV: ${(o.frontAtmIV * 100).toFixed(1)}%`);
  if (o.impliedMove1DPct != null) lines.push(`  Derived 1-session implied move: ±${o.impliedMove1DPct.toFixed(2)}%`);
  if (o.ivRank != null) lines.push(`  IV rank: ${o.ivRank.toFixed(0)}/100`);
  for (const e of o.expiries) {
    const iv = e.atmIV != null ? `${(e.atmIV * 100).toFixed(1)}% IV` : 'IV n/a';
    const straddle = e.straddlePrice != null ? `$${e.straddlePrice.toFixed(2)} straddle` : 'straddle n/a';
    const move = e.impliedMovePct != null ? `±${e.impliedMovePct.toFixed(2)}% to expiry` : 'move n/a';
    lines.push(`  ${e.expiry} (${e.daysToExpiry}d, ATM $${e.atmStrike}): ${iv}, ${straddle} → ${move} [${e.method}]`);
  }
  return lines.join('\n');
}
