import { EventEmitter } from 'events';
import WebSocket from 'ws';

// Finnhub WebSocket client. One process-wide connection, refcounted
// subscriptions. Free tier delivers US stock trade ticks during market hours.
//   wss://ws.finnhub.io?token=KEY
// Messages:
//   { type: 'trade', data: [ { s: 'AAPL', p: 192.5, t: 1717... , v: 100 }, ... ] }

export interface TradeTick {
  ticker: string;
  price: number;
  volume: number;
  timestamp: number; // ms
}

class FinnhubStream extends EventEmitter {
  private ws: WebSocket | null = null;
  private connecting = false;
  private connected = false;
  private subs = new Map<string, number>(); // ticker -> refcount
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;

  enabled(): boolean {
    return !!process.env.FINNHUB_API_KEY;
  }

  isConnected(): boolean {
    return this.connected;
  }

  start(): void {
    if (this.ws || this.connecting) return;
    const key = process.env.FINNHUB_API_KEY;
    if (!key) return;
    this.connecting = true;
    const ws = new WebSocket(`wss://ws.finnhub.io?token=${key}`);
    this.ws = ws;

    ws.on('open', () => {
      this.connected = true;
      this.connecting = false;
      this.reconnectAttempts = 0;
      console.log(`✓ Finnhub stream connected (${this.subs.size} ticker(s) subscribed)`);
      for (const ticker of this.subs.keys()) {
        ws.send(JSON.stringify({ type: 'subscribe', symbol: ticker }));
      }
    });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'trade' && Array.isArray(msg.data)) {
          for (const t of msg.data) {
            if (!t?.s || typeof t.p !== 'number') continue;
            const tick: TradeTick = {
              ticker: String(t.s).toUpperCase(),
              price: t.p,
              volume: t.v ?? 0,
              timestamp: t.t ?? Date.now(),
            };
            this.emit('trade', tick);
            this.emit(`trade:${tick.ticker}`, tick);
          }
        } else if (msg.type === 'ping') {
          // ignore
        } else if (msg.type === 'error') {
          console.warn('Finnhub stream error:', msg.msg || msg);
        }
      } catch {
        // ignore parse errors
      }
    });

    ws.on('close', () => {
      this.connected = false;
      this.connecting = false;
      this.ws = null;
      if (this.subs.size === 0) return; // nothing to maintain
      const attempt = ++this.reconnectAttempts;
      const delay = Math.min(30_000, 1_000 * Math.pow(2, Math.min(attempt, 5)));
      console.log(`Finnhub stream disconnected; retrying in ${delay / 1000}s`);
      this.reconnectTimer = setTimeout(() => this.start(), delay);
    });

    ws.on('error', (err) => {
      console.warn('Finnhub stream socket error:', (err as Error).message);
    });
  }

  subscribe(ticker: string): void {
    const t = ticker.toUpperCase();
    const next = (this.subs.get(t) || 0) + 1;
    this.subs.set(t, next);
    if (next === 1 && this.connected && this.ws) {
      this.ws.send(JSON.stringify({ type: 'subscribe', symbol: t }));
    }
    if (!this.ws && !this.connecting) this.start();
  }

  unsubscribe(ticker: string): void {
    const t = ticker.toUpperCase();
    const next = (this.subs.get(t) || 0) - 1;
    if (next <= 0) {
      this.subs.delete(t);
      if (this.connected && this.ws) {
        try {
          this.ws.send(JSON.stringify({ type: 'unsubscribe', symbol: t }));
        } catch {
          /* ignore */
        }
      }
    } else {
      this.subs.set(t, next);
    }
  }

  shutdown(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        /* ignore */
      }
    }
    this.ws = null;
    this.connected = false;
    this.subs.clear();
  }
}

export const finnhubStream = new FinnhubStream();
