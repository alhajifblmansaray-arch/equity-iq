import type { OptionsAdapter, OptionsImplied } from './types';

// Paid options data via Massive. Stub for now — flip OPTIONS_PROVIDER=massive and
// implement getImplied() (fetch the options snapshot, find ATM IV + straddle per
// expiry, compute implied move) when you're ready to pay. The forecast layer is
// already wired to consume whatever an adapter returns, so only this file changes.

export const massiveOptionsAdapter: OptionsAdapter = {
  name: 'massive',
  enabled: () => !!process.env.MASSIVE_API_KEY,
  async getImplied(_ticker: string): Promise<OptionsImplied | null> {
    // TODO: implement against Massive's options snapshot endpoint:
    //   1. GET the options chain / snapshot for `_ticker`
    //   2. For the nearest expiry and the first expiry >= ~7d, find the ATM
    //      call+put (strike closest to spot), read IV and mid prices
    //   3. straddle = callMid + putMid; impliedMovePct = straddle / spot * 100
    //   4. return OptionsImplied { source: 'massive', spot, frontAtmIV,
    //      impliedMove1DPct, ivRank, expiries[] }
    return null;
  },
};
