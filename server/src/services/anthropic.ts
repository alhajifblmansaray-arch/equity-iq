import Anthropic from '@anthropic-ai/sdk';
import type { ResearchReport } from './research';

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  client = new Anthropic({ apiKey });
  return client;
}

const SYSTEM_PROMPT = `You are an analyst writing a tight, plain-English investment thesis for a research app.

Output exactly three short paragraphs separated by a blank line, in this order:

1. **The setup** — Why is this priced where it is? Two sentences max. Reference 1-2 specific numbers from the data (RSI, P/E, recent return, etc.) so the reader trusts you read the report.

2. **The bull case** — What would have to be true for this to materially outperform? Be specific: what catalyst, what shift in fundamentals, what level on the chart? Two to three sentences.

3. **The fault line** — What's the most likely way this thesis breaks? Be honest. Two to three sentences.

Rules:
- No bullet points. No headings. No "Paragraph 1:". Just three paragraphs.
- Don't recommend buying or selling. Frame as "if this happens, then…" — never "you should buy."
- Reference the data; don't speculate beyond it.
- 180-260 words total.
- Sound human and direct. Avoid clichés like "in conclusion", "robust", "well-positioned."`;

function compactReport(r: ResearchReport): string {
  const lines: string[] = [];
  lines.push(`Ticker: ${r.ticker}`);
  if (r.profile?.name) lines.push(`Company: ${r.profile.name}${r.profile.sector ? ` (${r.profile.sector})` : ''}`);
  if (r.snapshot) {
    lines.push(`Price: $${r.snapshot.price.toFixed(2)} (${(r.snapshot.changePct ?? 0).toFixed(2)}% past day)`);
    if (r.snapshot.prevClose) lines.push(`Prev close: $${r.snapshot.prevClose.toFixed(2)}`);
  }
  if (r.priceHistory && r.priceHistory.length >= 2) {
    const first = r.priceHistory[0].close;
    const last = r.priceHistory[r.priceHistory.length - 1].close;
    const ret = ((last - first) / first) * 100;
    lines.push(`${r.priceHistory.length}-day return: ${ret.toFixed(1)}%`);
  }
  if (r.technicals.rsi != null) lines.push(`RSI(14): ${r.technicals.rsi.toFixed(1)}`);
  if (r.technicals.macd) lines.push(`MACD: ${r.technicals.macd.macd.toFixed(3)} (signal ${r.technicals.macd.signal.toFixed(3)}, hist ${r.technicals.macd.histogram.toFixed(3)})`);
  if (r.technicals.sma50 != null) lines.push(`SMA50: $${r.technicals.sma50.toFixed(2)}`);
  if (r.technicals.sma200 != null) lines.push(`SMA200: $${r.technicals.sma200.toFixed(2)}`);
  if (r.technicals.volatility != null) lines.push(`Annualized vol: ${(r.technicals.volatility * 100).toFixed(1)}%`);
  if (r.valuation) {
    const v = r.valuation;
    if (v.peRatio != null) lines.push(`P/E: ${v.peRatio.toFixed(2)}`);
    if (v.forwardPE != null) lines.push(`Forward P/E: ${v.forwardPE.toFixed(2)}`);
    if (v.pegRatio != null) lines.push(`PEG: ${v.pegRatio.toFixed(2)}`);
    if (v.evToEbitda != null) lines.push(`EV/EBITDA: ${v.evToEbitda.toFixed(2)}`);
    if (v.dividendYield != null) lines.push(`Dividend yield: ${(v.dividendYield * 100).toFixed(2)}%`);
    if (v.profitMargin != null) lines.push(`Profit margin: ${(v.profitMargin * 100).toFixed(1)}%`);
    if (v.beta != null) lines.push(`Beta: ${v.beta.toFixed(2)}`);
    if (v.analystTargetPrice != null) lines.push(`Analyst target: $${v.analystTargetPrice.toFixed(2)}`);
  }
  if (r.shortInterest?.shortPercent != null) {
    lines.push(`Short interest: ${r.shortInterest.shortPercent.toFixed(1)}% of float`);
  }
  if (r.nextEarnings) {
    lines.push(`Next earnings: ${r.nextEarnings.date}${r.nextEarnings.estimate != null ? ` (est EPS $${r.nextEarnings.estimate.toFixed(2)})` : ''}`);
  }
  if (r.news.length) {
    lines.push(`Recent headlines:`);
    for (const n of r.news.slice(0, 4)) lines.push(`  - ${n.title}${n.publisher ? ` (${n.publisher})` : ''}`);
  }
  return lines.join('\n');
}

export interface ThesisResult {
  text: string;
  model: string;
  cached: boolean;
}

export function isAnthropicEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';

// Tiny in-memory cache so repeated thesis requests for the same ticker within
// 10 minutes return the same text without re-billing.
interface CacheEntry { text: string; expires: number; }
const thesisCache = new Map<string, CacheEntry>();
const TTL = 10 * 60_000;

export async function generateThesis(report: ResearchReport): Promise<ThesisResult> {
  const c = getClient();
  if (!c) {
    return {
      text: 'AI thesis is unavailable — the server has no ANTHROPIC_API_KEY configured. Add one in server/.env to unlock this feature.',
      model: 'none',
      cached: false,
    };
  }

  const cacheKey = `${report.ticker}:${Math.floor(Date.now() / TTL)}`;
  const hit = thesisCache.get(cacheKey);
  if (hit && hit.expires > Date.now()) {
    return { text: hit.text, model: MODEL, cached: true };
  }

  const userMessage = `Here is the research data for ${report.ticker}:\n\n${compactReport(report)}\n\nWrite the three-paragraph thesis described in your instructions.`;

  const response = await c.messages.create({
    model: MODEL,
    max_tokens: 700,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('\n')
    .trim();

  thesisCache.set(cacheKey, { text, expires: Date.now() + TTL });
  return { text, model: response.model, cached: false };
}
