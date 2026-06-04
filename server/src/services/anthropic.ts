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

// ---------------------------------------------------------------------------
// Conversational follow-up — user asks anything about the ticker, we preload
// the full research as system context so the model never has to guess.
// ---------------------------------------------------------------------------

const CHAT_SYSTEM = `You are a sharp equity analyst available for follow-up questions about a specific stock. You have its full research report below.

Rules:
- Stay tight: 2-6 sentences per answer unless the user explicitly asks for more.
- Ground every claim in the report's data or widely-known facts. If a question can't be answered from the data, say so — don't invent numbers.
- Never recommend buying or selling. Frame in conditional terms ("if X happens, then…").
- Plain English. No jargon dumps. Bullet points only when the user asks for a list.
- The user can see the report on their screen, so don't restate obvious metrics — interpret them.`;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  reply: string;
  model: string;
}

export async function chatAboutTicker(
  report: ResearchReport,
  history: ChatMessage[]
): Promise<ChatResult> {
  const c = getClient();
  if (!c) {
    return {
      reply:
        'AI chat is unavailable — the server has no ANTHROPIC_API_KEY configured. Add one in server/.env.',
      model: 'none',
    };
  }
  // Cap history at the last 10 messages to keep token use predictable.
  const trimmed = history.slice(-10);
  const systemBlock = `${CHAT_SYSTEM}\n\n=== Research data for ${report.ticker} ===\n${compactReport(report)}`;

  const response = await c.messages.create({
    model: MODEL,
    max_tokens: 600,
    system: systemBlock,
    messages: trimmed.map((m) => ({ role: m.role, content: m.content })),
  });

  const reply = response.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('\n')
    .trim();

  return { reply, model: response.model };
}

// ---------------------------------------------------------------------------
// Outlook — structured forward-looking JSON. Heavily constrained prompt so the
// model can't fabricate dates, customers, or specific TAM figures it doesn't
// know. Where it doesn't know, it says so.
// ---------------------------------------------------------------------------

export type Confidence = 'low' | 'moderate' | 'high';
export type Direction = 'up' | 'down' | 'flat';
export type Impact = 'high' | 'medium' | 'low';

export interface Outlook {
  industry: {
    name: string;
    tamUsd?: number;
    growthPctAnnual?: number;
    horizonYears?: number;
    subAreas: string[];
    summary: string;
  };
  positioning: {
    rank: 'leader' | 'established' | 'challenger' | 'niche' | 'early';
    moats: string[];
    rationale: string;
  };
  catalysts: Array<{
    label: string;
    when: string;
    impact: Impact;
    direction: 'bullish' | 'bearish' | 'neutral';
    note: string;
  }>;
  sentiment: {
    news: number; // 1..5
    technical: number;
    institutional?: number | null;
    social?: number | null;
    note: string;
  };
  predictions: {
    day: { direction: Direction; magnitudePct: number; confidence: Confidence; basis: string };
    week: { direction: Direction; magnitudePct: number; confidence: Confidence; basis: string };
    month: { direction: Direction; magnitudePct: number; confidence: Confidence; basis: string };
    year: { direction: Direction; magnitudePct: number; confidence: Confidence; basis: string };
  };
  summary: string;
}

const OUTLOOK_SYSTEM = `You are a forward-looking equity analyst writing a structured Outlook for ${'${TICKER}'} for a research app.

The user trusts you to be rigorous and not hallucinate. Constraints:
1. Ground EVERY claim in the provided report data or widely-known facts about the sector. NEVER invent specific upcoming dates, customers, products, regulatory filings, or numbers that aren't in the data.
2. For industry TAM and annual growth, only quote a figure if it's a widely-cited estimate you're confident about. Otherwise omit those fields. Be honest about uncertainty.
3. For catalysts, only list items that:
   (a) appear in the supplied news headlines,
   (b) are the next earnings date (if provided), or
   (c) are clearly-recurring macro events (e.g. Fed meeting, CPI print). Don't fabricate specific corporate events.
4. Predictions are model output, not forecasts. Reasonable magnitude ranges:
     day  ±0.3-3%       week ±1-6%
     month ±2-15%      year ±5-50%
   Higher confidence requires more aligned signals (technical + fundamental + news pointing the same way).
5. Sentiment ratings 1 (very bearish) - 5 (very bullish). News and technical sentiment MUST be derivable from the data. Institutional/social may be null if you can't ground them.

You MUST return ONLY valid JSON matching this exact schema, no markdown code fences, no commentary:

{
  "industry": {
    "name": "Short industry name (≤40 chars)",
    "tamUsd": optional number (USD raw, e.g. 21000000000000 for $21T),
    "growthPctAnnual": optional number,
    "horizonYears": optional number,
    "subAreas": ["…", "…", "…"],
    "summary": "1-2 sentence industry context"
  },
  "positioning": {
    "rank": "leader" | "established" | "challenger" | "niche" | "early",
    "moats": ["…", "…", "…"],
    "rationale": "1 sentence"
  },
  "catalysts": [
    { "label": "…", "when": "…", "impact": "high"|"medium"|"low", "direction": "bullish"|"bearish"|"neutral", "note": "1 sentence" }
  ],
  "sentiment": {
    "news": 1-5,
    "technical": 1-5,
    "institutional": 1-5 OR null,
    "social": 1-5 OR null,
    "note": "1 sentence justifying the ratings"
  },
  "predictions": {
    "day":   { "direction": "up"|"down"|"flat", "magnitudePct": number, "confidence": "low"|"moderate"|"high", "basis": "1 sentence" },
    "week":  { same shape },
    "month": { same shape },
    "year":  { same shape }
  },
  "summary": "2-3 sentence overall forward view"
}`;

const outlookCache = new Map<string, { value: Outlook; expires: number }>();
const OUTLOOK_TTL = 15 * 60_000;

function extractJsonBlock(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return text;
  return text.slice(start, end + 1);
}

export async function generateOutlook(report: ResearchReport): Promise<Outlook> {
  const c = getClient();
  if (!c) throw new Error('AI outlook unavailable — set ANTHROPIC_API_KEY.');

  const cached = outlookCache.get(report.ticker);
  if (cached && cached.expires > Date.now()) return cached.value;

  const userMessage = `Here is the research data for ${report.ticker}:\n\n${compactReport(report)}\n\nProduce the Outlook JSON described in your instructions. Today's date: ${new Date().toISOString().slice(0, 10)}.`;

  const response = await c.messages.create({
    model: MODEL,
    max_tokens: 1400,
    system: OUTLOOK_SYSTEM.replace('${TICKER}', report.ticker),
    messages: [{ role: 'user', content: userMessage }],
  });

  const raw = response.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('\n');

  const json = extractJsonBlock(raw);
  let parsed: Outlook;
  try {
    parsed = JSON.parse(json) as Outlook;
  } catch (err) {
    console.error('Outlook JSON parse error:', err, '\nRaw:', raw.slice(0, 500));
    throw new Error('AI returned malformed JSON. Try again.');
  }

  outlookCache.set(report.ticker, { value: parsed, expires: Date.now() + OUTLOOK_TTL });
  return parsed;
}
