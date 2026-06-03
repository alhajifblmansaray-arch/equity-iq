import axios from 'axios';
import type { ResearchReport, User } from '../types';

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

export const research = {
  get: (ticker: string) =>
    api.get<ResearchReport>(`/research/${encodeURIComponent(ticker.toUpperCase())}`).then((r) => r.data),
};

export const watchlist = {
  get: () => api.get<{ watchlist: string[] }>('/user/watchlist').then((r) => r.data.watchlist),
  add: (ticker: string) =>
    api.post<{ watchlist: string[] }>('/user/watchlist', { ticker }).then((r) => r.data.watchlist),
  remove: (ticker: string) =>
    api.delete<{ watchlist: string[] }>(`/user/watchlist/${encodeURIComponent(ticker)}`).then((r) => r.data.watchlist),
};
