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
  interval: IntradayInterval;
  bars: NormalizedBar[];
  quote: NormalizedQuote | null;
}

export const research = {
  get: (ticker: string) =>
    api.get<ResearchReport>(`/research/${encodeURIComponent(ticker.toUpperCase())}`).then((r) => r.data),
  quote: (ticker: string) =>
    api
      .get<{ ticker: string; quote: NormalizedQuote }>(`/research/${encodeURIComponent(ticker.toUpperCase())}/quote`)
      .then((r) => r.data),
  intraday: (ticker: string, interval: IntradayInterval = '5min', outputsize = 200) =>
    api
      .get<IntradayResponse>(`/research/${encodeURIComponent(ticker.toUpperCase())}/intraday`, {
        params: { interval, outputsize },
      })
      .then((r) => r.data),
};

export const watchlist = {
  get: () => api.get<{ watchlist: string[] }>('/user/watchlist').then((r) => r.data.watchlist),
  add: (ticker: string) =>
    api.post<{ watchlist: string[] }>('/user/watchlist', { ticker }).then((r) => r.data.watchlist),
  remove: (ticker: string) =>
    api.delete<{ watchlist: string[] }>(`/user/watchlist/${encodeURIComponent(ticker)}`).then((r) => r.data.watchlist),
};
