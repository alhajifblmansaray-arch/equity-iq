export type UserGoal = 'learn' | 'save' | 'understand' | 'trade';
export type UserMode = 'beginner' | 'intermediate' | 'advanced';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  goal?: UserGoal | null;
  mode: UserMode;
  badges: string[];
  lessonStreak: number;
  watchlist: string[];
  createdAt: string;
}

/* ── Learning ─────────────────────────────────────────────────────────────── */

export interface Track {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
}

export interface LessonSummary {
  id: string;
  trackId: string;
  title: string;
  subtitle: string;
  emoji: string;
  readingMinutes: number;
  type: 'lesson' | 'case-study';
  completed: boolean;
}

export interface LessonKeyTerm {
  term: string;
  definition: string;
}

export interface LessonQuiz {
  question: string;
  options: string[];
  correct: number;
}

export interface Lesson {
  id: string;
  trackId: string;
  title: string;
  subtitle: string;
  emoji: string;
  readingMinutes: number;
  type?: 'lesson' | 'case-study';
  body: string[];
  eli10?: string[];
  keyTerms: LessonKeyTerm[];
  quiz: LessonQuiz;
}

export interface LearnProgress {
  streak: number;
  lastLessonAt: string | null;
  completedCount: number;
  totalCount: number;
  badges: string[];
}

/* ── Simulator ────────────────────────────────────────────────────────────── */

export interface SimHolding {
  ticker: string;
  shares: number;
  avgCost: number;
  currentPrice: number | null;
  marketValue: number | null;
  costBasis: number;
  pnl: number | null;
  pnlPct: number | null;
  isShort: boolean;
}

export interface SimPortfolio {
  cash: number;
  startingBalance: number;
  totalValue: number;
  totalPnl: number;
  totalPnlPct: number;
  holdings: SimHolding[];
  season: string;
  resetAt: string;
}

export interface SimSnapshot {
  date: string; // YYYY-MM-DD
  totalValue: number;
  cash: number;
  investedValue: number;
}

export interface SimTrade {
  _id: string;
  ticker: string;
  action: 'buy' | 'sell' | 'short' | 'cover';
  shares: number;
  price: number;
  total: number;
  pnl: number | null;
  pnlPct: number | null;
  aiDebrief: string | null;
  note: string | null;
  createdAt: string;
}

export type LimitOrderAction = 'buy' | 'sell';
export type LimitOrderType = 'limit' | 'stop';
export type LimitOrderStatus = 'pending' | 'filled' | 'cancelled';

export interface SimLimitOrder {
  _id: string;
  ticker: string;
  action: LimitOrderAction;
  orderType: LimitOrderType;
  shares: number;
  limitPrice: number;
  status: LimitOrderStatus;
  filledPrice?: number;
  filledAt?: string;
  note?: string;
  expiresAt: string;
  createdAt: string;
}

export interface LeaderboardTrade {
  _id: string;
  ticker: string;
  action: 'sell' | 'cover';
  shares: number;
  price: number;
  pnl: number | null;
  pnlPct: number | null;
  createdAt: string;
  userName: string;
  userAvatarUrl: string | null;
}

export interface CoachAdvice {
  strengths: string[];
  improvements: string[];
  observation: string;
  action: string;
}

/* ── Weekly Challenge ─────────────────────────────────────────────────────── */

export interface WeeklyChallenge {
  week: string;
  ticker: string;
  startPrice: number;
  endPrice: number | null;
  resolved: boolean;
  userPick: { direction: 'up' | 'down'; result: 'correct' | 'incorrect' | null } | null;
  community: { total: number; upPct: number | null; downPct: number | null };
}

export interface ChallengeHistory {
  week: string;
  ticker: string;
  startPrice: number;
  endPrice: number | null;
  direction: 'up' | 'down' | null;
  result: 'correct' | 'incorrect' | null;
}

export interface NormalizedBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface NormalizedQuote {
  price: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  prevClose?: number;
  vwap?: number;
  change?: number;
  changePct?: number;
  marketCap?: number;
  source: 'massive' | 'finnhub' | 'yahoo' | 'derived' | 'live';
  asOf: string;
  currency?: string;
  name?: string;
}

export interface NormalizedNews {
  id: string;
  title: string;
  description?: string;
  url: string;
  publisher?: string;
  publishedAt: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  imageUrl?: string;
}

export interface ResearchReport {
  ticker: string;
  timestamp: string;
  meta: {
    sections: Record<string, boolean>;
    providers: string[];
  };
  profile: {
    name?: string;
    sector?: string;
    industry?: string;
    exchange?: string;
    summary?: string;
    logo?: string;
    website?: string;
    marketCap?: number;
  } | null;
  snapshot: NormalizedQuote | null;
  priceHistory: NormalizedBar[] | null;
  technicals: {
    rsi?: number;
    macd?: { macd: number; signal: number; histogram: number };
    sma50?: number;
    sma200?: number;
    volatility?: number;
  };
  valuation: {
    peRatio?: number;
    forwardPE?: number;
    pegRatio?: number;
    evToEbitda?: number;
    priceToBook?: number;
    priceToSales?: number;
    dividendYield?: number;
    eps?: number;
    beta?: number;
    profitMargin?: number;
    operatingMargin?: number;
    returnOnEquity?: number;
    fiftyTwoWeekHigh?: number;
    fiftyTwoWeekLow?: number;
    analystTargetPrice?: number;
  } | null;
  earnings: {
    reports: Array<{
      fiscalDateEnding: string;
      reportedEPS?: number;
      estimatedEPS?: number;
      surprisePct?: number;
    }>;
  } | null;
  shortInterest: {
    shortPercent?: number;
    sharesShort?: number;
    daysToCover?: number;
    reportedAt?: string;
  } | null;
  news: NormalizedNews[];
  nextEarnings: { date: string; estimate?: number; hour?: string } | null;
  pulse: {
    stockTwits: StockTwitsSentiment | null;
    reddit: RedditSentiment | null;
    insider: InsiderTrade[] | null;
    congressional: CongressionalTrade[] | null;
    options: OptionsFlow | null;
  };
  optionsImplied?: OptionsImplied | null;
}

export interface ExpiryImplied {
  expiry: string;
  daysToExpiry: number;
  atmStrike: number;
  atmIV: number | null;
  straddlePrice: number | null;
  impliedMovePct: number | null;
  method: 'straddle' | 'iv';
}

export interface OptionsImplied {
  source: string;
  spot: number;
  asOf: string;
  frontAtmIV: number | null;
  impliedMove1DPct: number | null;
  ivRank?: number | null;
  expiries: ExpiryImplied[];
}

export interface StockTwitsMessage {
  id: string;
  user: string;
  body: string;
  sentiment: 'bullish' | 'bearish' | null;
  createdAt: string;
  url?: string;
}

export interface StockTwitsSentiment {
  source: 'stocktwits';
  total: number;
  bullish: number;
  bearish: number;
  neutral: number;
  bullishPct: number;
  messages: StockTwitsMessage[];
}

export interface RedditPost {
  id: string;
  title: string;
  subreddit: string;
  score: number;
  comments: number;
  createdAt: string;
  url: string;
  permalink: string;
  selftext?: string;
}

export interface RedditSentiment {
  source: 'reddit';
  totalMentions: number;
  perSub: Record<string, number>;
  topPosts: RedditPost[];
}

export interface InsiderTrade {
  date: string;
  insider: string;
  title?: string;
  transaction: 'buy' | 'sell' | 'other';
  shares: number;
  pricePerShare?: number;
  totalValue?: number;
}

export interface CongressionalTrade {
  date: string;
  representative: string;
  party?: string;
  chamber?: string;
  transaction: string;
  amount: string;
  reportDate?: string;
}

export interface OptionsFlow {
  source: 'polygon';
  putCallRatioOI: number | null;
  putCallRatioVol: number | null;
  totalOpenInterest: { calls: number; puts: number };
  totalVolume: { calls: number; puts: number };
  avgImpliedVol: number | null;
  topOI: Array<{
    type: 'call' | 'put';
    strike: number;
    expiry: string;
    openInterest: number;
    volume: number;
    impliedVol?: number;
  }>;
  sampleSize: number;
}

export interface EarningsEvent {
  date: string;
  symbol: string;
  estimate?: number;
  actual?: number;
  hour?: string;
  quarter?: number;
  year?: number;
  revenueEstimate?: number;
  revenueActual?: number;
}

export type AlertType = 'price' | 'rsi_above' | 'rsi_below' | 'macd_bullish' | 'macd_bearish' | 'vol_spike';

export interface PriceAlert {
  id: string;
  ticker: string;
  alertType: AlertType;
  condition: 'above' | 'below';
  price: number;
  threshold: number;
  active: boolean;
  triggeredAt?: string;
  createdAt: string;
}

export interface QuickScan {
  ticker: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  rsi: number | null;
  macd: { macd: number; signal: number; histogram: number } | null;
  sma50: number | null;
  sma200: number | null;
}

export interface OptionsContract {
  type: 'call' | 'put';
  strike: number;
  expiry: string;
  daysToExpiry: number;
  openInterest: number;
  volume: number;
  impliedVol: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  bid: number | null;
  ask: number | null;
  lastPrice: number | null;
}

export interface OptionsChainData {
  ticker: string;
  spot: number | null;
  asOf: string;
  expiries: string[];
  contracts: OptionsContract[];
}

export interface HorizonAccuracy {
  horizon: string;
  n: number;
  directionHitRate: number; // 0..1
  withinRangeRate: number;  // 0..1
  avgBiasPct: number;
}

export interface ForecastAccuracy {
  ticker: string;
  accuracy: HorizonAccuracy[];
}

export type Confidence = 'low' | 'moderate' | 'high';
export type Direction = 'up' | 'down' | 'flat';
export type Impact = 'high' | 'medium' | 'low';

export interface Prediction {
  direction: Direction;
  magnitudePct: number;
  confidence: Confidence;
  basis: string;
}

export type ForecastHorizon = '1H' | '1D' | '3D' | '1W';
export type ForecastDirection = 'up' | 'down' | 'flat';
export type ForecastConfidence = 'low' | 'medium' | 'high';

export type EdgeVsOptions = 'positive' | 'negative' | 'none' | 'unknown';
export type TradeAction =
  | 'long_call'
  | 'long_put'
  | 'call_debit_spread'
  | 'put_debit_spread'
  | 'sell_premium'
  | 'no_trade';

export interface TradeRecommendation {
  action: TradeAction;
  structure_note: string;
  suggested_expiry: string;
  conviction: 'low' | 'medium' | 'high';
  max_risk_budget_pct: number;
  breakeven_vs_target: string;
  reason: string;
}

export interface HorizonForecast {
  horizon: ForecastHorizon;
  direction: ForecastDirection;
  probability_up: number;
  expected_move_pct: number;
  expected_move_basis?: string;
  implied_move_pct?: number | null;
  edge_vs_options?: EdgeVsOptions;
  price_range: { low: number; base: number; high: number };
  confidence: ForecastConfidence;
  key_drivers: string[];
  key_risks: string[];
  trade_recommendation?: TradeRecommendation;
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
  calibration_note?: string;
}

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
    news: number;
    technical: number;
    institutional?: number | null;
    social?: number | null;
    note: string;
  };
  predictions: {
    day: Prediction;
    week: Prediction;
    month: Prediction;
    year: Prediction;
  };
  summary: string;
}

/* ── Trade Journal ─────────────────────────────────────────────────────────── */

export type TradeDirection = 'long' | 'short';
export type TradeAssetType = 'stock' | 'option' | 'etf' | 'crypto';
export type TradeStatus = 'open' | 'closed';
export type SetupTag =
  | 'breakout' | 'earnings_play' | 'dip_buy' | 'momentum'
  | 'mean_reversion' | 'options_income' | 'swing' | 'scalp' | 'macro';
export type CatalystTag =
  | 'earnings' | 'news' | 'technical_level' | 'macro'
  | 'insider_activity' | 'social_sentiment' | 'analyst_upgrade' | 'sector_rotation';
export type MistakeTag =
  | 'fomo_entry' | 'revenge_trade' | 'ignored_stop' | 'oversized_position'
  | 'no_thesis' | 'held_too_long' | 'sold_too_early' | 'chased_entry';
export type EmotionalState = 'calm' | 'confident' | 'anxious' | 'uncertain' | 'impatient' | 'euphoric';

export interface TradeEntry {
  id: string;
  ticker: string;
  direction: TradeDirection;
  assetType: TradeAssetType;
  status: TradeStatus;
  entryDate: string;
  thesis: string;
  setupTags: SetupTag[];
  catalystTags: CatalystTag[];
  emotionalStateEntry: EmotionalState;
  convictionLevel: number;
  stopLoss?: number;
  targetPrice?: number;
  // Stock fields
  stockDetails?: {
    entryPrice: number;
    exitPrice?: number;
    shares: number;
  };
  // Option fields — P&L uses premium × contracts × multiplier, NOT underlying price
  optionDetails?: {
    contractType: 'call' | 'put';
    strike: number;
    expiry: string;
    contracts: number;
    multiplier: number;
    entryPremium: number;
    exitPremium?: number;
    underlyingPriceAtEntry?: number; // reference only
    underlyingPriceAtExit?: number;
    ivEntry?: number;
    ivExit?: number;
    deltaEntry?: number;
    thetaEntry?: number;
    dteEntry?: number;
  };
  technicalSnapshotEntry?: {
    price: number;
    rsi?: number;
    sma50?: number;
    sma200?: number;
    macdHistogram?: number;
  };
  linkedResearchId?: string;
  linkedForecastId?: string;
  linkedAlertId?: string;
  agreedWithForecast?: boolean | null;
  exitDate?: string;
  fees?: number;
  emotionalStateExit?: EmotionalState;
  exitReason?: string;
  mistakeTags?: MistakeTag[];
  realizedPnl?: number;
  realizedPnlPct?: number;
  rMultiple?: number;
  holdingPeriodDays?: number;
  didFollowThesis?: boolean;
  reviewNotes?: string;
  createdAt: string;
}

export interface ParsedTrade {
  error?: string;
  ticker?: string | null;
  assetType?: TradeAssetType | null;
  direction?: TradeDirection | null;
  account?: string | null;
  entryDate?: string | null;
  exitDate?: string | null;
  fees?: number | null;
  stockDetails?: { entryPrice: number | null; exitPrice: number | null; shares: number | null } | null;
  optionDetails?: {
    contractType?: 'call' | 'put' | null;
    strike?: number | null;
    expiry?: string | null;
    contracts?: number | null;
    entryPremium?: number | null;
    exitPremium?: number | null;
    multiplier?: number;
    underlyingPriceAtEntry?: number | null;
    underlyingPriceAtExit?: number | null;
    ivEntry?: number | null;
    deltaEntry?: number | null;
    thetaEntry?: number | null;
    gammaEntry?: number | null;
    vegaEntry?: number | null;
  } | null;
  thesis?: string | null;
  setupTags?: string[];
  notes?: string | null;
  confidence?: 'high' | 'medium' | 'low';
}

export interface JournalStats {
  totalTrades: number;
  openTrades?: number;
  winRate: number;
  totalPnl: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number | null;
  bySetup: Record<string, { trades: number; wins: number; pnl: number }>;
  mistakeCount: Record<string, number>;
  forecastEdge: {
    agreedWinRate: number | null;
    fadedWinRate: number | null;
    agreedTotal: number;
    fadedTotal: number;
  };
}

/* ── Portfolio ────────────────────────────────────────────────────────────── */

export type Currency = 'CAD' | 'USD';
export type TransactionType = 'buy' | 'sell' | 'dividend' | 'deposit' | 'withdrawal';

export interface PortfolioHolding {
  id: string;
  ticker: string;
  quantity: number;
  avgCost: number;
  currency: Currency;
  account: string;
  color: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  marketValue: number | null;
  costBasis: number;
  todayReturn: number | null;
  allTimeReturn: number | null;
  allTimeReturnPct: number | null;
  allocation: number;
}

export interface PortfolioTransaction {
  id: string;
  date: string;
  type: TransactionType;
  ticker: string | null;
  quantity: number | null;
  price: number | null;
  amount: number;
  currency: Currency;
  note: string | null;
  color: string;
}

export interface PortfolioSummary {
  totalValue: number;
  investedValue: number;
  totalCost: number;
  todayChange: number;
  todayChangePct: number;
  allTimeReturn: number;
  allTimeReturnPct: number;
}

export interface SnaptradeStatus {
  isConnected: boolean;
  connectedAt?: string;
  lastSyncAt?: string;
}

export interface PortfolioData {
  accounts: string[];
  cash: number;
  cashCurrency: Currency;
  holdings: PortfolioHolding[];
  transactions: PortfolioTransaction[];
  history: number[];
  summary: PortfolioSummary;
  snaptrade?: SnaptradeStatus;
}
