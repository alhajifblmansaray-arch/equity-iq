import { useState, useEffect } from 'react';
import { Plus, RefreshCw, LogOut } from '../lib/icons';
import { portfolio } from '../lib/api';

interface SnaptradeConnectProps {
  onConnected?: () => void;
  compact?: boolean;
}

export default function SnaptradeConnect({ onConnected, compact }: SnaptradeConnectProps) {
  const [status, setStatus] = useState<{ isConnected: boolean; lastSyncAt?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [credentials, setCredentials] = useState({ userId: '', userSecret: '' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    try {
      const s = await portfolio.snaptrade.status();
      setStatus(s);
    } catch (err) {
      console.error('Failed to load Snaptrade status:', err);
    }
  }

  function handleConnect() {
    setShowModal(true);
    setError(null);
    setCredentials({ userId: '', userSecret: '' });
  }

  async function handleSubmitCredentials() {
    if (!credentials.userId || !credentials.userSecret) {
      setError('Both userId and userSecret are required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await portfolio.snaptrade.handleCallback();
      // Call callback with credentials to store them server-side
      await fetch('/api/portfolio/snaptrade/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          snaptradeUserId: credentials.userId,
          snaptradeUserSecret: credentials.userSecret,
        }),
      }).then(r => {
        if (!r.ok) throw new Error('Failed to connect');
        return r.json();
      });

      setShowModal(false);
      await loadStatus();
      onConnected?.();
    } catch (err) {
      console.error('Failed to connect Snaptrade:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await portfolio.snaptrade.sync();
      await loadStatus();
      onConnected?.();
    } catch (err) {
      console.error('Failed to sync Snaptrade:', err);
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect Snaptrade? Your existing holdings will remain.')) return;
    try {
      await portfolio.snaptrade.disconnect();
      setStatus({ isConnected: false });
    } catch (err) {
      console.error('Failed to disconnect Snaptrade:', err);
    }
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {status?.isConnected ? (
          <>
            <span className="text-xs text-forest font-medium">Snaptrade connected</span>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="p-1.5 rounded-full hover:bg-cream-tint disabled:opacity-50 transition"
              title="Sync from Snaptrade"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            </button>
          </>
        ) : (
          <button
            onClick={handleConnect}
            disabled={loading}
            className="px-2 py-1 rounded text-xs font-medium text-forest hover:bg-cream-tint disabled:opacity-50 transition"
          >
            <Plus size={12} className="inline mr-1" />
            Connect broker
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-4 border"
      style={{
        background: 'var(--glass-bg)',
        borderColor: 'var(--glass-border)',
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-sm font-semibold text-ink">Connect Broker</div>
          <div className="text-xs text-ink-tertiary mt-1">
            {status?.isConnected
              ? 'Auto-sync your real portfolio'
              : 'Link your brokerage account'}
          </div>
        </div>
        {status?.isConnected && (
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: 'var(--forest)' }}
            title="Connected"
          />
        )}
      </div>

      {status?.lastSyncAt && (
        <div className="text-xs text-ink-tertiary mb-3">
          Last synced: {new Date(status.lastSyncAt).toLocaleString()}
        </div>
      )}

      <div className="flex gap-2">
        {status?.isConnected ? (
          <>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
              style={{
                background: 'var(--forest)',
                color: 'var(--cream)',
              }}
            >
              <RefreshCw size={14} className={`inline mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync now'}
            </button>
            <button
              onClick={handleDisconnect}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition"
              style={{
                background: 'color-mix(in srgb, var(--brick) 15%, transparent)',
                color: 'var(--brick)',
              }}
            >
              <LogOut size={14} className="inline mr-2" />
              Disconnect
            </button>
          </>
        ) : (
          <button
            onClick={handleConnect}
            disabled={loading}
            className="w-full px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
            style={{
              background: 'var(--forest)',
              color: 'var(--cream)',
            }}
          >
            <Plus size={14} className="inline mr-2" />
            {loading ? 'Connecting...' : 'Connect Snaptrade'}
          </button>
        )}
      </div>

      <div className="text-xs text-ink-tertiary mt-3 leading-relaxed">
        Securely import your holdings, transactions, and cash balance. We don't store your credentials.
      </div>

      {/* Modal for credential entry (test mode) */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-ink mb-4">Connect Snaptrade (Test Mode)</h3>
            <p className="text-sm text-ink-tertiary mb-4">
              Enter your Snaptrade test credentials. You can find these in your Snaptrade developer dashboard.
            </p>

            <div className="space-y-3 mb-4">
              <input
                type="text"
                placeholder="User ID"
                value={credentials.userId}
                onChange={(e) => setCredentials({ ...credentials, userId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: 'var(--ink) / 0.05',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--ink)',
                }}
              />
              <input
                type="password"
                placeholder="User Secret"
                value={credentials.userSecret}
                onChange={(e) => setCredentials({ ...credentials, userSecret: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: 'var(--ink) / 0.05',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--ink)',
                }}
              />
            </div>

            {error && (
              <div
                className="text-xs p-2 rounded mb-3"
                style={{
                  background: 'color-mix(in srgb, var(--brick) 15%, transparent)',
                  color: 'var(--brick)',
                }}
              >
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition"
                style={{
                  background: 'var(--ink) / 0.08',
                  color: 'var(--ink)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitCredentials}
                disabled={loading}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                style={{
                  background: 'var(--forest)',
                  color: 'var(--cream)',
                }}
              >
                {loading ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
