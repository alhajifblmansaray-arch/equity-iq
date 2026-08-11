import type { ResearchReport } from '../types';

export function fmtNumber(n: number | undefined | null, decimals = 2): string {
  if (n == null || !Number.isFinite(n)) return '-';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtPrice(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return '-';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtCompact(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return '-';
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(2) + 'K';
  return n.toLocaleString();
}

export function fmtPct(n: number | undefined | null, decimals = 2): string {
  if (n == null || !Number.isFinite(n)) return '-';
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`;
}

export function fmtDate(iso: string | undefined | null): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

export function fmtRelative(iso: string | undefined | null): string {
  if (!iso) return '-';
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return fmtDate(iso);
}

export interface Verdict {
  verdict: 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG SELL';
  color: 'forest' | 'amber' | 'brick';
  pillClass: string;
  score: number;
  rationale: string;
  factors: Array<{ label: string; impact: number }>;
}

export function computeVerdict(data: ResearchReport): Verdict {
  let score = 50;
  const factors: Array<{ label: string; impact: number }> = [];

  const rsi = data.technicals.rsi;
  if (rsi != null) {
    if (rsi < 30) {
      score += 15;
      factors.push({ label: `RSI ${rsi.toFixed(1)} (oversold)`, impact: 15 });
    } else if (rsi > 70) {
      score -= 15;
      factors.push({ label: `RSI ${rsi.toFixed(1)} (overbought)`, impact: -15 });
    } else {
      factors.push({ label: `RSI ${rsi.toFixed(1)} (neutral)`, impact: 0 });
    }
  }

  const shortPct = data.shortInterest?.shortPercent;
  if (shortPct != null) {
    if (shortPct > 20) {
      score -= 8;
      factors.push({ label: `Short interest ${shortPct.toFixed(1)}% (high)`, impact: -8 });
    } else if (shortPct > 10) {
      score -= 3;
      factors.push({ label: `Short interest ${shortPct.toFixed(1)}% (moderate)`, impact: -3 });
    }
  }

  const macd = data.technicals.macd;
  if (macd) {
    if (macd.macd > 0) {
      score += 5;
      factors.push({ label: 'MACD above zero', impact: 5 });
    } else {
      score -= 5;
      factors.push({ label: 'MACD below zero', impact: -5 });
    }
  }

  const sma50 = data.technicals.sma50;
  const sma200 = data.technicals.sma200;
  if (sma50 != null && sma200 != null) {
    if (sma50 > sma200) {
      score += 8;
      factors.push({ label: 'Golden cross (SMA50 > SMA200)', impact: 8 });
    } else {
      score -= 8;
      factors.push({ label: 'Death cross (SMA50 < SMA200)', impact: -8 });
    }
  }

  const price = data.snapshot?.price;
  if (price != null && sma50 != null) {
    if (price > sma50) {
      score += 5;
      factors.push({ label: 'Price above SMA50', impact: 5 });
    } else {
      score -= 5;
      factors.push({ label: 'Price below SMA50', impact: -5 });
    }
  }

  if (data.priceHistory && data.priceHistory.length >= 2) {
    const first = data.priceHistory[0].close;
    const last = data.priceHistory[data.priceHistory.length - 1].close;
    const ret = ((last - first) / first) * 100;
    if (ret > 15) {
      score += 7;
      factors.push({ label: `${data.priceHistory.length}d return ${ret.toFixed(1)}%`, impact: 7 });
    } else if (ret < -15) {
      score -= 7;
      factors.push({ label: `${data.priceHistory.length}d return ${ret.toFixed(1)}%`, impact: -7 });
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let verdict: Verdict['verdict'];
  let color: Verdict['color'];
  let rationale: string;

  if (score >= 75) {
    verdict = 'STRONG BUY';
    color = 'forest';
    rationale = 'Multiple technical and fundamental signals are aligned bullish.';
  } else if (score >= 60) {
    verdict = 'BUY';
    color = 'forest';
    rationale = 'Trend and momentum lean positive with manageable risks.';
  } else if (score >= 45) {
    verdict = 'HOLD';
    color = 'amber';
    rationale = 'Signals are mixed - wait for clearer confirmation.';
  } else if (score >= 30) {
    verdict = 'SELL';
    color = 'brick';
    rationale = 'Trend and momentum lean negative; risk outweighs reward.';
  } else {
    verdict = 'STRONG SELL';
    color = 'brick';
    rationale = 'Multiple signals are aligned bearish - significant downside risk.';
  }

  const pillClass =
    color === 'forest' ? 'pill-forest' : color === 'amber' ? 'pill-amber' : 'pill-brick';

  return { verdict, color, pillClass, score, rationale, factors };
}

export interface BullBear {
  bull: string[];
  bear: string[];
}

export function generateBullBear(data: ResearchReport): BullBear {
  const bull: string[] = [];
  const bear: string[] = [];

  const { rsi, macd, sma50, sma200 } = data.technicals;
  if (rsi != null && rsi < 30) bull.push('RSI in oversold territory - possible reversal setup.');
  if (rsi != null && rsi > 70) bear.push('RSI in overbought territory - momentum may exhaust.');
  if (macd && macd.macd > 0 && macd.histogram > 0) bull.push('MACD positive with expanding histogram.');
  if (macd && macd.macd < 0 && macd.histogram < 0) bear.push('MACD negative with widening downside histogram.');
  if (sma50 != null && sma200 != null && sma50 > sma200) bull.push('Golden cross confirms a longer-term uptrend.');
  if (sma50 != null && sma200 != null && sma50 < sma200) bear.push('Death cross signals a longer-term downtrend.');

  const sp = data.shortInterest?.shortPercent;
  if (sp != null && sp > 15) bear.push(`Short interest at ${sp.toFixed(1)}% of float reflects bearish positioning.`);
  if (sp != null && sp > 25) bull.push('Crowded short positioning leaves room for a short squeeze.');

  if (data.valuation?.peRatio != null && data.valuation.peRatio < 15 && data.valuation.peRatio > 0)
    bull.push(`Trades at ${data.valuation.peRatio.toFixed(1)}× earnings - undemanding multiple.`);
  if (data.valuation?.peRatio != null && data.valuation.peRatio > 40)
    bear.push(`Rich valuation at ${data.valuation.peRatio.toFixed(1)}× earnings raises the bar.`);
  if (data.valuation?.analystTargetPrice != null && data.snapshot?.price != null) {
    const upside = ((data.valuation.analystTargetPrice - data.snapshot.price) / data.snapshot.price) * 100;
    if (upside > 10) bull.push(`Analyst target implies ${upside.toFixed(0)}% upside.`);
    if (upside < -10) bear.push(`Analyst target implies ${Math.abs(upside).toFixed(0)}% downside.`);
  }

  if (data.priceHistory && data.priceHistory.length >= 2) {
    const first = data.priceHistory[0].close;
    const last = data.priceHistory[data.priceHistory.length - 1].close;
    const ret = ((last - first) / first) * 100;
    if (ret > 20) bull.push(`Strong recent momentum - up ${ret.toFixed(1)}% over the window.`);
    if (ret < -20) bear.push(`Sharp drawdown - down ${Math.abs(ret).toFixed(1)}% over the window.`);
  }

  if (bull.length === 0) bull.push('No high-confidence bullish signals detected in current data.');
  if (bear.length === 0) bear.push('No high-confidence bearish signals detected in current data.');

  return { bull, bear };
}

export interface Risk {
  label: string;
  detail: string;
}

export function generateRisks(data: ResearchReport): Risk[] {
  const risks: Risk[] = [];
  const { rsi, sma50, sma200, volatility } = data.technicals;

  if (rsi != null && rsi > 70)
    risks.push({
      label: 'Technical overbought',
      detail: `RSI at ${rsi.toFixed(1)} suggests near-term mean reversion is possible.`,
    });
  if (rsi != null && rsi < 30)
    risks.push({
      label: 'Falling-knife dynamics',
      detail: `RSI at ${rsi.toFixed(1)} - selling pressure may not be exhausted.`,
    });

  const sp = data.shortInterest?.shortPercent;
  if (sp != null && sp > 15)
    risks.push({
      label: 'Short pressure',
      detail: `${sp.toFixed(1)}% of float is sold short - elevated event risk in both directions.`,
    });

  if (sma50 != null && sma200 != null && sma50 < sma200)
    risks.push({
      label: 'Bearish trend structure',
      detail: 'SMA50 below SMA200 - longer-term trend has rolled over.',
    });

  if (volatility != null && volatility > 0.6)
    risks.push({
      label: 'High realized volatility',
      detail: `Annualized volatility ~${(volatility * 100).toFixed(0)}% - size positions accordingly.`,
    });

  if (data.valuation?.peRatio != null && data.valuation.peRatio > 40)
    risks.push({
      label: 'Valuation re-rating risk',
      detail: `PE of ${data.valuation.peRatio.toFixed(1)} leaves little room for execution misses.`,
    });

  risks.push({
    label: 'Macro & rate sensitivity',
    detail: 'Equity multiples remain sensitive to rates, growth surprises, and liquidity conditions.',
  });

  return risks.slice(0, 5);
}

export function sentimentPill(s: 'positive' | 'negative' | 'neutral' | undefined): {
  label: string;
  cls: string;
} {
  if (s === 'positive') return { label: 'Bullish', cls: 'pill-forest' };
  if (s === 'negative') return { label: 'Bearish', cls: 'pill-brick' };
  return { label: 'Neutral', cls: 'pill-mute' };
}
