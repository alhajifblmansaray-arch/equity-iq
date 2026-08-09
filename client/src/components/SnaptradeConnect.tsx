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
  const [error, setError] = useState<string | null>(null);
  const [showTestMode, setShowTestMode] = useState(false);
  const [testCreds, setTestCreds] = useState({ userId: '', userSecret: '' });

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

  async function handleConnect() {
    setLoading(true);
    setError(null);
    try {
      const { authUrl } = await portfolio.snaptrade.initConnect();
      // Redirect to Snaptrade's OAuth portal
      window.location.href = authUrl;
    } catch (err) {
      console.error('Failed to initiate Snaptrade connection:', err);
      setError(err instanceof Error ? err.message : 'Failed to start connection');
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

  async function handleTestModeSubmit() {
    if (!testCreds.userId || !testCreds.userSecret) {
      setError('Please enter both User ID and Secret');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/portfolio/snaptrade/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          snaptradeUserId: testCreds.userId,
          snaptradeUserSecret: testCreds.userSecret,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Connection failed');
      }

      setShowTestMode(false);
      setTestCreds({ userId: '', userSecret: '' });
      await loadStatus();
      onConnected?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setLoading(false);
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
        Securely import your holdings, transactions, and cash balance. You'll be redirected to Snaptrade to authorize.
      </div>

      {error && (
        <div
          className="text-xs p-2 rounded mt-3"
          style={{
            background: 'color-mix(in srgb, var(--brick) 15%, transparent)',
            color: 'var(--brick)',
          }}
        >
          {error}
          {!status?.isConnected && (
            <button
              onClick={() => { setShowTestMode(true); setError(null); }}
              className="block mt-2 underline hover:no-underline"
            >
              Try entering credentials manually instead
            </button>
          )}
        </div>
      )}

      {/* Test Mode Modal */}
      {showTestMode && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setShowTestMode(false)}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-ink mb-2">Enter Snaptrade Credentials</h3>
            <p className="text-xs text-ink-tertiary mb-4">
              Get these from your Snaptrade developer dashboard or use test credentials.
            </p>

            <div className="space-y-2 mb-4">
              <div>
                <label className="text-xs text-ink-secondary">User ID</label>
                <input
                  type="text"
                  placeholder="e.g., your-user-id"
                  value={testCreds.userId}
                  onChange={(e) => setTestCreds({ ...testCreds, userId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm mt-1"
                  style={{
                    background: 'var(--ink) / 0.05',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--ink)',
                  }}
                />
              </div>
              <div>
                <label className="text-xs text-ink-secondary">User Secret</label>
                <input
                  type="password"
                  placeholder="e.g., your-secret-key"
                  value={testCreds.userSecret}
                  onChange={(e) => setTestCreds({ ...testCreds, userSecret: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm mt-1"
                  style={{
                    background: 'var(--ink) / 0.05',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--ink)',
                  }}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowTestMode(false)}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition"
                style={{
                  background: 'var(--ink) / 0.08',
                  color: 'var(--ink)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleTestModeSubmit}
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
