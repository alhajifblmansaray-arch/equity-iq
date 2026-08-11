import { useState, useEffect } from 'react';
import { Plus, RefreshCw, Trash2 } from '../lib/icons';
import { portfolio } from '../lib/api';
import type { SnaptradeStatus } from '../types';

interface SnaptradeConnectProps {
  onConnected?: () => void;
}

/** Pull the server's message out of an axios error so failures are visible, not just logged. */
function messageOf(err: unknown): string {
  const e = err as { response?: { data?: { error?: string } }; message?: string };
  return e?.response?.data?.error || e?.message || 'Something went wrong.';
}

function relativeTime(iso?: string): string | null {
  if (!iso) return null;
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

/** Square monogram fallback when a brokerage has no logo on file. */
function BrokerMark({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  if (logoUrl) {
    return <img src={logoUrl} alt="" className="w-8 h-8 rounded-xl object-contain flex-shrink-0" style={{ background: '#fff' }} />;
  }
  return (
    <div
      className="w-8 h-8 rounded-xl flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0"
      style={{ background: 'var(--forest)' }}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function SnaptradeConnect({ onConnected }: SnaptradeConnectProps) {
  const [status, setStatus] = useState<SnaptradeStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadStatus(); }, []);

  async function loadStatus() {
    try { setStatus(await portfolio.snaptrade.status()); }
    catch (err) { setError(messageOf(err)); }
  }

  async function handleConnect() {
    setLoading(true);
    setError(null);
    try {
      const { portalUrl } = await portfolio.snaptrade.connect();
      window.location.href = portalUrl;
    } catch (err) {
      setError(messageOf(err));
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setError(null);
    try {
      await portfolio.snaptrade.sync();
      await loadStatus();
      onConnected?.();
    } catch (err) { setError(messageOf(err)); }
    finally { setSyncing(false); }
  }

  async function handleRemove(id: string, name: string) {
    if (!confirm(`Unlink ${name}? Holdings already imported stay in EquityIQ.`)) return;
    setError(null);
    try {
      await portfolio.snaptrade.removeConnection(id);
      await loadStatus();
      onConnected?.();
    } catch (err) { setError(messageOf(err)); }
  }

  const brokers = status?.brokers ?? [];
  const connected = brokers.length > 0;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-ink">{connected ? 'Connected brokers' : 'Connect a broker'}</p>
        {connected && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="p-1.5 rounded-full hover:bg-white/20 transition disabled:opacity-40"
            title={status?.lastSyncAt ? `Last synced ${relativeTime(status.lastSyncAt)}` : 'Sync now'}
            aria-label="Sync now"
          >
            <RefreshCw size={15} className={`text-ink-secondary ${syncing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {connected ? (
        <>
          <div className="space-y-2 mb-3">
            {brokers.map((b) => (
              <div key={b.id} className="flex items-center gap-3 group">
                <BrokerMark name={b.name} logoUrl={b.logoUrl} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-ink truncate">{b.name}</p>
                  <p className="text-[11px] text-ink-tertiary">
                    {b.disabled ? (
                      <span className="text-brick">Needs reconnecting</span>
                    ) : (
                      `${b.accounts} account${b.accounts === 1 ? '' : 's'} · connected`
                    )}
                  </p>
                </div>
                {!b.disabled && (
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--forest)' }} />
                )}
                <button
                  onClick={() => handleRemove(b.id, b.name)}
                  className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-white/20 transition"
                  aria-label={`Unlink ${b.name}`}
                >
                  <Trash2 size={13} className="text-ink-tertiary" />
                </button>
              </div>
            ))}
          </div>

          <button onClick={handleConnect} disabled={loading} className="btn-ghost btn-sm w-full">
            <Plus size={14} />
            {loading ? 'Opening…' : 'Connect another'}
          </button>

          {status?.lastSyncAt && (
            <p className="text-[11px] text-ink-tertiary mt-2 text-center">Synced {relativeTime(status.lastSyncAt)}</p>
          )}
        </>
      ) : (
        <>
          <p className="text-xs text-ink-secondary mb-3 leading-relaxed">
            Link your brokerage to import holdings, activity and balances automatically.
            Read-only - your broker password never reaches EquityIQ.
          </p>
          <button onClick={handleConnect} disabled={loading} className="btn-forest btn-sm w-full">
            <Plus size={14} />
            {loading ? 'Opening…' : 'Connect broker'}
          </button>
        </>
      )}

      {error && (
        <div
          className="text-xs mt-3 p-2 rounded-xl leading-relaxed"
          style={{ background: 'color-mix(in srgb, var(--brick) 12%, transparent)', color: 'var(--brick)' }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
