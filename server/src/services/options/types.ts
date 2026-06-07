// Swappable options-data layer. Adapters fetch ATM IV / straddle for the
// expiries that matter to our forecast horizons and compute the implied move.
// Start free (Yahoo), flip to a paid source (Massive) by setting OPTIONS_PROVIDER.

export interface ExpiryImplied {
  expiry: string; // YYYY-MM-DD
  daysToExpiry: number;
  atmStrike: number;
  atmIV: number | null; // decimal, e.g. 0.45 = 45%
  straddlePrice: number | null; // ATM call mid + put mid
  impliedMovePct: number | null; // expected move to this expiry, % of spot
  method: 'straddle' | 'iv';
}

export interface OptionsImplied {
  source: string; // 'yahoo' | 'tradier' | 'massive'
  spot: number;
  asOf: string;
  frontAtmIV: number | null; // nearest-expiry ATM IV (decimal)
  impliedMove1DPct: number | null; // derived 1-session move = frontAtmIV * sqrt(1/252)
  ivRank?: number | null; // 0..100 if the source provides it
  expiries: ExpiryImplied[];
}

export interface OptionsAdapter {
  name: string;
  enabled(): boolean;
  getImplied(ticker: string): Promise<OptionsImplied | null>;
}
