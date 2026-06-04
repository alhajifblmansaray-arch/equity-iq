import { useEffect, useRef, useState } from 'react';

export interface LiveTick {
  price: number;
  volume: number;
  timestamp: number;
  ticker: string;
}

interface LivePriceState {
  tick: LiveTick | null;
  connected: boolean;
  lastUpdate: number | null;
}

/**
 * Opens a Server-Sent-Events stream to /api/research/:ticker/stream and
 * surfaces each trade tick to the caller. Reconnect is handled by the browser
 * automatically; we tear down only when the ticker changes or component
 * unmounts.
 */
export function useLivePrice(ticker: string | null): LivePriceState {
  const [tick, setTick] = useState<LiveTick | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!ticker) return;
    const url = `/api/research/${encodeURIComponent(ticker.toUpperCase())}/stream`;
    let es: EventSource;
    try {
      es = new EventSource(url, { withCredentials: true });
    } catch {
      return;
    }
    esRef.current = es;

    es.onopen = () => setConnected(true);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as LiveTick;
        if (data.ticker !== ticker.toUpperCase()) return;
        setTick(data);
        setLastUpdate(Date.now());
      } catch {
        /* ignore */
      }
    };
    es.onerror = () => {
      setConnected(false);
      // Browser will auto-reconnect; we don't tear down here.
    };

    return () => {
      try {
        es.close();
      } catch {
        /* ignore */
      }
      esRef.current = null;
      setConnected(false);
      setTick(null);
      setLastUpdate(null);
    };
  }, [ticker]);

  return { tick, connected, lastUpdate };
}
