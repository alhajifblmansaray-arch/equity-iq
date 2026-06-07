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
  // Pulse — retail sentiment, insider activity, congressional trades, options
  const p = r.pulse;
  if (p?.stockTwits) {
    const s = p.stockTwits;
    lines.push(
      `StockTwits (24h): ${s.total} msgs, ${s.bullish} bullish vs ${s.bearish} bearish (${s.bullishPct.toFixed(0)}% bullish-share)`
    );
  }
  if (p?.reddit) {
    lines.push(`Reddit (past week): ${p.reddit.totalMentions} mentions across ${Object.keys(p.reddit.perSub).filter((k) => p.reddit!.perSub[k] > 0).join(', ')}`);
    if (p.reddit.topPosts[0]) lines.push(`  Top post: "${p.reddit.topPosts[0].title}" (${p.reddit.topPosts[0].score} upvotes)`);
  }
  if (p?.insider && p.insider.length) {
    const recent = p.insider.slice(0, 4);
    lines.push(`Insider activity (last few):`);
    for (const t of recent) {
      lines.push(`  - ${t.date}  ${t.insider}${t.title ? ` (${t.title})` : ''}  ${t.transaction}  ${t.shares?.toLocaleString?.() || t.shares} sh${t.totalValue ? ` ≈ $${Math.round(t.totalValue).toLocaleString()}` : ''}`);
    }
  }
  if (p?.congressional && p.congressional.length) {
    const recent = p.congressional.slice(0, 4);
    lines.push(`Congressional trades (recent):`);
    for (const t of recent) {
      lines.push(`  - ${t.date}  ${t.representative} ${t.party ? `(${t.party})` : ''}  ${t.transaction}  ${t.amount}`);
    }
  }
  if (p?.options) {
    const o = p.options;
    const pcr = o.putCallRatioOI?.toFixed(2);
    lines.push(
      `Options flow: P/C OI ratio ${pcr ?? 'n/a'}, total OI calls=${o.totalOpenInterest.calls.toLocaleString()} / puts=${o.totalOpenInterest.puts.toLocaleString()}${o.avgImpliedVol != null ? `, avg IV ${(o.avgImpliedVol * 100).toFixed(0)}%` : ''}`
    );
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

// ---------------------------------------------------------------------------
// Multi-horizon price forecast. Different horizons are driven by different
// forces, so the model is told how to weight each input per timeframe. We feed
// every input we have and explicitly flag the high-value ones we DON'T have so
// the model lists them in data_gaps instead of hallucinating them.
// ---------------------------------------------------------------------------

export type ForecastHorizon = '1H' | '1D' | '3D' | '1W';
export type ForecastDirection = 'up' | 'down' | 'flat';
export type ForecastConfidence = 'low' | 'medium' | 'high';

export interface HorizonForecast {
  horizon: ForecastHorizon;
  direction: ForecastDirection;
  probability_up: number;
  expected_move_pct: number;
  price_range: { low: number; base: number; high: number };
  confidence: ForecastConfidence;
  key_drivers: string[];
  key_risks: string[];
}

export interface Forecast {
  ticker: string;
  as_of: string;
  market_session: string;
  current_price: number;
  forecasts: HorizonForecast[];
  overall_thesis: string;
  conflicting_signals: string[];
  data_gaps: string[];
}

type MarketSession =
  | 'pre-market'
  | 'open'
  | 'midday'
  | 'power-hour'
  | 'after-hours'
  | 'closed';

// Derive the current US market session from Eastern Time.
function marketSession(now = new Date()): MarketSession {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
  const weekday = get('weekday');
  if (weekday === 'Sat' || weekday === 'Sun') return 'closed';
  const hour = Number(get('hour'));
  const minute = Number(get('minute'));
  const mins = hour * 60 + minute;
  if (mins >= 240 && mins < 570) return 'pre-market'; // 04:00–09:30
  if (mins >= 570 && mins < 630) return 'open'; // 09:30–10:30
  if (mins >= 630 && mins < 900) return 'midday'; // 10:30–15:00
  if (mins >= 900 && mins < 960) return 'power-hour'; // 15:00–16:00
  if (mins >= 960 && mins < 1200) return 'after-hours'; // 16:00–20:00
  return 'closed';
}

function buildForecastInputs(r: ResearchReport, session: MarketSession): string {
  const lines: string[] = [];
  const now = new Date();
  lines.push(`AS OF: ${now.toISOString()} (US Eastern session: ${session})`);
  lines.push(`MARKET SESSION: ${session}`);
  if (r.snapshot) {
    lines.push(`CURRENT PRICE: $${r.snapshot.price.toFixed(2)}`);
    if (r.snapshot.prevClose != null) {
      const gap = ((r.snapshot.price - r.snapshot.prevClose) / r.snapshot.prevClose) * 100;
      lines.push(`PREV CLOSE: $${r.snapshot.prevClose.toFixed(2)} (current vs prev close: ${gap.toFixed(2)}%)`);
    }
    if (r.snapshot.open != null) lines.push(`SESSION OHLC: O ${r.snapshot.open} H ${r.snapshot.high} L ${r.snapshot.low}`);
    if (r.snapshot.vwap != null) lines.push(`VWAP: $${r.snapshot.vwap.toFixed(2)} (price is ${r.snapshot.price >= r.snapshot.vwap ? 'above' : 'below'} VWAP)`);
  }

  // Recent daily price action (last ~12 closes) for the technical lens.
  if (r.priceHistory && r.priceHistory.length) {
    const recent = r.priceHistory.slice(-12);
    lines.push(
      `RECENT DAILY CLOSES (oldest→newest): ${recent.map((b) => b.close.toFixed(2)).join(', ')}`
    );
  }

  // Everything else the report knows, reusing the shared compactor.
  lines.push('', '--- FULL REPORT DATA ---', compactReport(r));

  // Be explicit about high-value inputs we do NOT have, so the model puts them
  // in data_gaps rather than inventing them.
  lines.push('', '--- INPUTS NOT AVAILABLE (do not fabricate; note relevant ones in data_gaps) ---');
  lines.push('- Real-time bid/ask/spread and Level 2 depth / order-book imbalance');
  lines.push('- Intraday OHLCV (1m/5m/15m), live RVOL, opening-range, dark-pool/block prints');
  lines.push('- Full options gamma exposure (GEX) / dealer positioning / max pain (only aggregate put/call OI + avg IV are provided, if any)');
  lines.push('- Live intraday breaking-news tape (only daily-resolution headlines are provided)');
  lines.push('- Macro tape: VIX level/trend, 10yr yield, DXY, sector-ETF relative strength, scheduled macro releases');
  lines.push('- Institutional 13F ownership changes');
  return lines.join('\n');
}

const FORECAST_SYSTEM = `You are a senior multi-strategy equity analyst combining the lenses of a quant trader, a technical analyst, a fundamental analyst, and a market-flow desk. You produce short-to-medium-term price forecasts for a single stock across multiple time horizons.

Core principle: different horizons are driven by different forces, and you weight inputs accordingly.
- 1-hour horizon: weight order flow, intraday momentum, VWAP, options/gamma positioning, relative volume, live news, and time-of-day. Treat fundamentals and valuation as near-irrelevant here.
- 1-day horizon: weight overnight/breaking news, the opening gap, daily-chart technicals, analyst actions, sector/index direction, and implied volatility.
- 3-day to 1-week horizon: weight upcoming catalysts, sentiment trend (and its rate of change), short interest, analyst revisions, sector rotation, and macro regime. Fundamentals begin to matter.
- Beyond 1 week: weight fundamentals, valuation, earnings trajectory, and macro most heavily.

Critical discipline:
- Short-horizon price movement is close to a random walk. Your edge is modest. Do NOT express false precision. Calibrate confidence honestly — most intraday forecasts should be "low" or "medium" unless there is a strong, specific driver (clear flow, a fresh catalyst, a decisive technical break).
- Reason through the bull case AND the bear case before concluding. State which inputs are conflicting.
- Identify data you were NOT given that would have changed your conclusion, and list it in data_gaps.
- Never invent data. If a field is unavailable, reason without it and note it.
- probability_up, expected_move_pct, price_range and direction MUST be internally consistent (e.g. direction "up" ⇒ probability_up > 0.5 and base > current price).
- If a TRACK RECORD of your past calls is provided, treat it as feedback: correct the biases it reveals (e.g. if you've been over-bullish on 1D, temper it) and don't repeat past mistakes. A poor hit rate on a horizon should lower your confidence there.

Produce one forecast object for EACH horizon requested in the user message (a subset of 1H, 1D, 3D, 1W) — no more, no fewer. If 1H is requested while the market is closed, still produce it but mark confidence "low" and note the closure in data_gaps.

Respond with ONLY valid JSON, no markdown fences, no preamble, matching exactly:
{
  "ticker": "string",
  "as_of": "string",
  "market_session": "string",
  "current_price": number,
  "forecasts": [
    {
      "horizon": "1H" | "1D" | "3D" | "1W",
      "direction": "up" | "down" | "flat",
      "probability_up": number,
      "expected_move_pct": number,
      "price_range": { "low": number, "base": number, "high": number },
      "confidence": "low" | "medium" | "high",
      "key_drivers": ["string"],
      "key_risks": ["string"]
    }
  ],
  "overall_thesis": "string (2-3 sentences, plain English, jargon-light)",
  "conflicting_signals": ["string"],
  "data_gaps": ["string"]
}`;

const forecastCache = new Map<string, { value: Forecast; expires: number }>();
// 1H goes stale fast; the longer horizons can be cached a bit longer.
const FORECAST_TTL_SHORT = 90_000; // ~1.5 min for a horizon set containing 1H
const FORECAST_TTL_LONG = 6 * 60_000; // ~6 min for purely longer-horizon sets

const ALL_HORIZONS: ForecastHorizon[] = ['1H', '1D', '3D', '1W'];

export interface ForecastOptions {
  horizons?: ForecastHorizon[];
  accuracyBlock?: string | null;
}

export async function generateForecast(
  report: ResearchReport,
  opts: ForecastOptions = {}
): Promise<Forecast> {
  const c = getClient();
  if (!c) throw new Error('AI forecast unavailable — set ANTHROPIC_API_KEY.');

  const requested = (opts.horizons?.length ? opts.horizons : ALL_HORIZONS).filter((h) =>
    ALL_HORIZONS.includes(h)
  );
  const horizons = requested.length ? requested : ALL_HORIZONS;
  const includesShort = horizons.includes('1H');
  const ttl = includesShort ? FORECAST_TTL_SHORT : FORECAST_TTL_LONG;

  const session = marketSession();
  const hkey = horizons.join(',');
  const cacheKey = `${report.ticker}:${session}:${hkey}:${Math.floor(Date.now() / ttl)}`;
  const cached = forecastCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.value;

  const trackRecord = opts.accuracyBlock
    ? `\n\n--- YOUR RECENT TRACK RECORD (calibrate against this; correct revealed biases) ---\n${opts.accuracyBlock}`
    : '';

  const userMessage = `Forecast ${report.ticker} (${report.profile?.name || report.ticker}). Inputs below.\n\n${buildForecastInputs(report, session)}${trackRecord}\n\nProduce forecast objects ONLY for these horizons: ${horizons.join(', ')}. Return the JSON exactly as specified.`;

  const response = await c.messages.create({
    model: MODEL,
    max_tokens: Math.min(2200, 500 + horizons.length * 450),
    system: FORECAST_SYSTEM,
    messages: [{ role: 'user', content: userMessage }],
  });

  const raw = response.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('\n');

  const json = extractJsonBlock(raw);
  let parsed: Forecast;
  try {
    parsed = JSON.parse(json) as Forecast;
  } catch (err) {
    console.error('Forecast JSON parse error:', err, '\nRaw:', raw.slice(0, 500));
    throw new Error('AI returned malformed JSON. Try again.');
  }

  // Keep only requested horizons in case the model over-produced.
  if (Array.isArray(parsed.forecasts)) {
    parsed.forecasts = parsed.forecasts.filter((f) => horizons.includes(f.horizon));
  }

  forecastCache.set(cacheKey, { value: parsed, expires: Date.now() + ttl });
  return parsed;
}
