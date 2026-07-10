import axios from 'axios';
import type {
  AlertType,
  ChallengeHistory,
  ForecastAccuracy,
  LearnProgress,
  LessonSummary,
  Lesson,
  Track,
  NormalizedBar,
  NormalizedQuote,
  OptionsChainData,
  QuickScan,
  ResearchReport,
  SimPortfolio,
  SimSnapshot,
  SimTrade,
  User,
  UserGoal,
  UserMode,
  WeeklyChallenge,
} from '../types';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

export interface AuthState {
  user: User | null;
  googleEnabled: boolean;
}

export const auth = {
  me: () => api.get<AuthState>('/auth/me').then((r) => r.data),
  login: (email: string, password: string) =>
    api.post<{ user: User }>('/auth/login', { email, password }).then((r) => r.data.user),
  signup: (email: string, password: string, name: string) =>
    api.post<{ user: User }>('/auth/signup', { email, password, name }).then((r) => r.data.user),
  logout: () => api.post('/auth/logout').then(() => undefined),
};

export type IntradayInterval = '1min' | '5min' | '15min' | '30min' | '1h';

export interface IntradayResponse {
  ticker: string;
  interval: IntradayInterval | '1day';
  bars: NormalizedBar[];
  quote: NormalizedQuote | null;
  fellBack?: boolean;
}

export const research = {
  get: (ticker: string) =>
    api.get<ResearchReport>(`/research/${encodeURIComponent(ticker.toUpperCase())}`).then((r) => r.data),
  quote: (ticker: string) =>
    api
      .get<{ ticker: string; quote: NormalizedQuote }>(`/research/${encodeURIComponent(ticker.toUpperCase())}/quote`)
      .then((r) => r.data),
  spark: (ticker: string, days = 10) =>
    api
      .get<{ ticker: string; closes: number[] }>(
        `/research/${encodeURIComponent(ticker.toUpperCase())}/spark`,
        { params: { days } }
      )
      .then((r) => r.data),
  intraday: (ticker: string, interval: IntradayInterval | '1day' = '5min', outputsize = 200) =>
    api
      .get<IntradayResponse>(`/research/${encodeURIComponent(ticker.toUpperCase())}/intraday`, {
        params: { interval, outputsize },
      })
      .then((r) => r.data),
  news: (ticker: string, limit = 25, days = 30) =>
    api
      .get<{ ticker: string; articles: import('../types').NormalizedNews[] }>(
        `/research/${encodeURIComponent(ticker.toUpperCase())}/news`,
        { params: { limit, days } }
      )
      .then((r) => r.data),
  thesis: (ticker: string) =>
    api
      .post<{ ticker: string; text: string; model: string; cached: boolean }>(
        `/research/${encodeURIComponent(ticker.toUpperCase())}/thesis`
      )
      .then((r) => r.data),
  chat: (ticker: string, messages: Array<{ role: 'user' | 'assistant'; content: string }>) =>
    api
      .post<{ ticker: string; reply: string; model: string }>(
        `/research/${encodeURIComponent(ticker.toUpperCase())}/chat`,
        { messages }
      )
      .then((r) => r.data),
  outlook: (ticker: string) =>
    api
      .post<{ ticker: string; outlook: import('../types').Outlook }>(
        `/research/${encodeURIComponent(ticker.toUpperCase())}/outlook`
      )
      .then((r) => r.data),
  forecast: (ticker: string, horizons?: import('../types').ForecastHorizon[]) =>
    api
      .post<{ ticker: string; forecast: import('../types').Forecast }>(
        `/research/${encodeURIComponent(ticker.toUpperCase())}/forecast`,
        horizons ? { horizons } : {}
      )
      .then((r) => r.data),
  quick: (ticker: string) =>
    api
      .get<QuickScan>(`/research/${encodeURIComponent(ticker.toUpperCase())}/quick`)
      .then((r) => r.data),
  optionsChain: (ticker: string) =>
    api
      .get<OptionsChainData>(`/research/${encodeURIComponent(ticker.toUpperCase())}/options-chain`)
      .then((r) => r.data),
  forecastAccuracy: (ticker: string) =>
    api
      .get<ForecastAccuracy>(`/research/${encodeURIComponent(ticker.toUpperCase())}/forecast-accuracy`)
      .then((r) => r.data),
  profile: (ticker: string) =>
    api
      .get<{
        ticker: string;
        name: string | null;
        description: string | null;
        sector: string | null;
        industry: string | null;
        exchange: string | null;
        website: string | null;
        logo: string | null;
        employees: number | null;
        ipo: string | null;
        marketCap: number | null;
      }>(`/research/${encodeURIComponent(ticker.toUpperCase())}/profile`)
      .then((r) => r.data),
};

import type { PriceAlert } from '../types';
export const alerts = {
  list: () => api.get<{ alerts: PriceAlert[] }>('/alerts').then((r) => r.data.alerts),
  create: (payload: {
    ticker: string;
    alertType?: AlertType;
    condition?: 'above' | 'below';
    price?: number;
    threshold?: number;
  }) => api.post<{ alert: PriceAlert }>('/alerts', payload).then((r) => r.data.alert),
  remove: (id: string) => api.delete(`/alerts/${id}`).then(() => undefined),
  toggle: (id: string) =>
    api.post<{ alert: PriceAlert }>(`/alerts/${id}/toggle`).then((r) => r.data.alert),
};

export const newsApi = {
  market: () =>
    api.get<{ articles: import('../types').NormalizedNews[] }>('/news/market').then((r) => r.data),
};

export const simulator = {
  get: () => api.get<SimPortfolio>('/simulator').then((r) => r.data),
  buy: (ticker: string, shares: number, note?: string) =>
    api.post('/simulator/buy', { ticker, shares, note }).then((r) => r.data),
  sell: (ticker: string, shares: number, note?: string) =>
    api.post('/simulator/sell', { ticker, shares, note }).then((r) => r.data),
  short: (ticker: string, shares: number, note?: string) =>
    api.post('/simulator/short', { ticker, shares, note }).then((r) => r.data),
  cover: (ticker: string, shares: number, note?: string) =>
    api.post('/simulator/cover', { ticker, shares, note }).then((r) => r.data),
  trades: () => api.get<{ trades: import('../types').SimTrade[] }>('/simulator/trades').then((r) => r.data.trades),
  reset: () => api.post('/simulator/reset').then((r) => r.data),
  snapshots: () => api.get<{ snapshots: SimSnapshot[] }>('/simulator/snapshots').then((r) => r.data.snapshots),
  sectors: () => api.get<{ sectors: Record<string, string> }>('/simulator/sectors').then((r) => r.data.sectors),
  limits: () => api.get<{ orders: import('../types').SimLimitOrder[] }>('/simulator/limits').then((r) => r.data.orders),
  createLimit: (payload: { ticker: string; action: 'buy' | 'sell'; orderType: 'limit' | 'stop'; shares: number; limitPrice: number; note?: string }) =>
    api.post<{ ok: boolean; order: import('../types').SimLimitOrder }>('/simulator/limits', payload).then((r) => r.data),
  cancelLimit: (id: string) => api.delete(`/simulator/limits/${id}`).then(() => undefined),
  leaderboard: (limit = 20) =>
    api.get<{ trades: import('../types').LeaderboardTrade[] }>('/simulator/leaderboard', { params: { limit } }).then((r) => r.data.trades),
  coach: () => api.post<{ advice: import('../types').CoachAdvice }>('/simulator/coach').then((r) => r.data.advice),
};

export const learn = {
  lessons: () =>
    api.get<{ lessons: LessonSummary[]; tracks: Track[]; completedCount: number; totalCount: number }>('/learn/lessons').then((r) => r.data),
  lesson: (id: string) =>
    api.get<{ lesson: Lesson; completed: boolean }>(`/learn/lessons/${id}`).then((r) => r.data),
  complete: (id: string) =>
    api.post<{ ok: boolean; streak: number; completedCount: number; newBadge: string | null }>(`/learn/lessons/${id}/complete`).then((r) => r.data),
  progress: () => api.get<LearnProgress>('/learn/progress').then((r) => r.data),
};

export const challenge = {
  get: () => api.get<WeeklyChallenge>('/challenge').then((r) => r.data),
  pick: (direction: 'up' | 'down') =>
    api.post<{ ok: boolean; direction: string }>('/challenge/pick', { direction }).then((r) => r.data),
  history: () =>
    api.get<{ history: ChallengeHistory[] }>('/challenge/history').then((r) => r.data.history),
};

export const profile = {
  update: (data: { name?: string; goal?: UserGoal; mode?: UserMode }) =>
    api.patch<{ ok: boolean; user: User }>('/profile', data).then((r) => r.data),
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    return api.post<{ ok: boolean; avatarUrl: string }>('/profile/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
};

export const journal = {
  list: (params?: { status?: string; ticker?: string }) =>
    api.get<{ trades: import('../types').TradeEntry[] }>('/journal', { params }).then((r) => r.data.trades),
  stats: () =>
    api.get<import('../types').JournalStats>('/journal/stats').then((r) => r.data),
  create: (payload: Partial<import('../types').TradeEntry>) =>
    api.post<{ trade: import('../types').TradeEntry }>('/journal', payload).then((r) => r.data.trade),
  update: (id: string, payload: Partial<import('../types').TradeEntry>) =>
    api.patch<{ trade: import('../types').TradeEntry }>(`/journal/${id}`, payload).then((r) => r.data.trade),
  close: (id: string, payload: Partial<import('../types').TradeEntry>) =>
    api.patch<{ trade: import('../types').TradeEntry }>(`/journal/${id}/close`, payload).then((r) => r.data.trade),
  remove: (id: string) => api.delete(`/journal/${id}`).then(() => undefined),
};

export const watchlist = {
  get: () => api.get<{ watchlist: string[] }>('/user/watchlist').then((r) => r.data.watchlist),
  add: (ticker: string) =>
    api.post<{ watchlist: string[] }>('/user/watchlist', { ticker }).then((r) => r.data.watchlist),
  remove: (ticker: string) =>
    api.delete<{ watchlist: string[] }>(`/user/watchlist/${encodeURIComponent(ticker)}`).then((r) => r.data.watchlist),
};
