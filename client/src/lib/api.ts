import axios from 'axios';
import type { NormalizedBar, NormalizedQuote, ResearchReport, User } from '../types';

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
  intraday: (ticker: string, interval: IntradayInterval = '5min', outputsize = 200) =>
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
};

import type { PriceAlert } from '../types';
export const alerts = {
  list: () => api.get<{ alerts: PriceAlert[] }>('/alerts').then((r) => r.data.alerts),
  create: (ticker: string, condition: 'above' | 'below', price: number) =>
    api.post<{ alert: PriceAlert }>('/alerts', { ticker, condition, price }).then((r) => r.data.alert),
  remove: (id: string) => api.delete(`/alerts/${id}`).then(() => undefined),
  toggle: (id: string) =>
    api.post<{ alert: PriceAlert }>(`/alerts/${id}/toggle`).then((r) => r.data.alert),
};

export const newsApi = {
  market: () =>
    api.get<{ articles: import('../types').NormalizedNews[] }>('/news/market').then((r) => r.data),
};

export const watchlist = {
  get: () => api.get<{ watchlist: string[] }>('/user/watchlist').then((r) => r.data.watchlist),
  add: (ticker: string) =>
    api.post<{ watchlist: string[] }>('/user/watchlist', { ticker }).then((r) => r.data.watchlist),
  remove: (ticker: string) =>
    api.delete<{ watchlist: string[] }>(`/user/watchlist/${encodeURIComponent(ticker)}`).then((r) => r.data.watchlist),
};
