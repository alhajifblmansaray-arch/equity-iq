import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw } from '../lib/icons';
import { research } from '../lib/api';
import type { OptionsChainData, OptionsContract, ResearchReport } from '../types';
import { fmtPrice } from '../lib/helpers';

interface Props {
  data: ResearchReport;
}

export default function OptionsChainCard({ data }: Props) {
  const ticker = data.ticker;
  const [chain, setChain] = useState<OptionsChainData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selExpiry, setSelExpiry] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const d = await research.optionsChain(ticker);
      setChain(d);
      if (d && d.expiries.length > 0) setSelExpiry(d.expiries[0]);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'No options data available.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [ticker]); // eslint-disable-line react-hooks/exhaustive-deps

  const spot = chain?.spot ?? data.snapshot?.price ?? null;
  const contracts = chain && selExpiry
    ? chain.contracts.filter((c) => c.expiry === selExpiry)
    : [];
  const calls = contracts.filter((c) => c.type === 'call').sort((a, b) => a.strike - b.strike);
  const puts = contracts.filter((c) => c.type === 'put').sort((a, b) => a.strike - b.strike);

  const atm = (list: OptionsContract[]) => {
    if (!spot || !list.length) return null;
    return list.reduce((best, c) =>
      Math.abs(c.strike - spot) < Math.abs(best.strike - spot) ? c : best
    );
  };
  const atmCall = atm(calls);
  const atmPut = atm(puts);

  // Strikes that appear in both calls and puts for aligned table
  const allStrikes = Array.from(
    new Set([...calls.map((c) => c.strike), ...puts.map((c) => c.strike)])
  ).sort((a, b) => a - b);

  return (
    <div className="card animate-fadeUp">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="eyebrow mb-1">Options</div>
          <h3 className="section-title">Chain viewer</h3>
          {spot && (
            <p className="text-ink-secondary text-[14px] mt-1">
              Spot <span className="font-medium text-ink tabular-nums">${fmtPrice(spot)}</span>
              {chain && (
                <span className="text-ink-tertiary ml-2 text-[12px]">
                  · {chain.contracts.length} contracts · {chain.expiries.length} expiries
                </span>
              )}
            </p>
          )}
        </div>
        <button onClick={load} disabled={loading} className="btn-ghost text-sm flex-shrink-0">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading && !chain && (
        <div
          className="flex items-center gap-3 text-ink-secondary text-sm rounded-2xl px-5 py-6"
          style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
        >
          <Loader2 size={16} className="animate-spin text-forest flex-shrink-0" />
          Fetching options chain from Polygon…
        </div>
      )}

      {error && !chain && (
        <div
          className="flex items-start gap-2 text-brick text-sm rounded-2xl px-4 py-4"
          style={{ background: 'color-mix(in srgb, var(--brick) 10%, transparent)' }}
        >
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-medium">Options unavailable</div>
            <div className="text-[12px] opacity-80 mt-0.5">{error}</div>
            <div className="text-[11px] text-brick/70 mt-1">Requires Polygon.io API key with options access.</div>
          </div>
        </div>
      )}

      {chain && (
        <>
          {/* PCR summary row */}
          {data.pulse.options && (
            <PcrRow flow={data.pulse.options} />
          )}

          {/* Expiry selector */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-5 pb-1">
            {chain.expiries.slice(0, 12).map((exp) => {
              const days = Math.max(0, Math.round((new Date(exp).getTime() - Date.now()) / 86_400_000));
              const isSel = selExpiry === exp;
              return (
                <button
                  key={exp}
                  onClick={() => setSelExpiry(exp)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-[12px] font-medium transition border ${
                    isSel ? 'text-ink' : 'text-ink-secondary hover:text-ink'
                  }`}
                  style={
                    isSel
                      ? {
                          background: 'var(--panel-bg)',
                          borderColor: 'var(--panel-border)',
                          boxShadow: 'var(--panel-shadow)',
                        }
                      : { borderColor: 'transparent' }
                  }
                >
                  {exp}
                  <span className="ml-1 text-ink-tertiary text-[11px]">{days}d</span>
                </button>
              );
            })}
          </div>

          {/* Chain table */}
          {allStrikes.length > 0 ? (
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
            >
              {/* Column headers */}
              <div
                className="grid text-[11px] font-semibold text-ink-tertiary px-4 py-2.5 uppercase tracking-wide"
                style={{
                  gridTemplateColumns: '1fr 70px 60px 56px 56px 72px 56px 70px 60px 56px 56px 72px',
                  background: 'var(--cream-tint)',
                }}
              >
                {['IV', 'Delta', 'Vol', 'OI', 'Bid/Ask', 'Strike', 'Bid/Ask', 'OI', 'Vol', 'Delta', 'IV', ''].map(
                  (h, i) =>
                    i === 5 ? (
                      <div key={i} className="text-center font-bold text-ink text-[12px]">
                        Strike
                      </div>
                    ) : i < 5 ? (
                      <div key={i} className={`text-right ${i === 0 ? 'text-forest' : ''}`}>{h}</div>
                    ) : (
                      <div key={i} className={`text-left ${i === 10 ? 'text-brick' : ''}`}>{h}</div>
                    )
                )}
              </div>

              <div className="max-h-[480px] overflow-y-auto">
                {allStrikes.map((strike) => {
                  const call = calls.find((c) => c.strike === strike);
                  const put = puts.find((p) => p.strike === strike);
                  const isAtm =
                    spot != null &&
                    Math.abs(strike - spot) === Math.min(...allStrikes.map((s) => Math.abs(s - spot!)));
                  return (
                    <StrikeRow
                      key={strike}
                      strike={strike}
                      call={call ?? null}
                      put={put ?? null}
                      isAtm={isAtm}
                      spot={spot}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center text-ink-tertiary text-sm py-8">
              No contracts for this expiry.
            </div>
          )}

          {/* ATM straddle estimate */}
          {atmCall && atmPut && (
            <StraddleRow call={atmCall} put={atmPut} spot={spot} />
          )}
        </>
      )}

      <p className="text-[11px] text-ink-tertiary mt-4 leading-relaxed">
        Options data via Polygon.io. IV, delta, and greeks shown where available. Snapshot slice — full chain requires Polygon Starter or higher.
      </p>
    </div>
  );
}

/* ─── Put/call ratio summary ─────────────────────────────────────────────── */

function PcrRow({ flow }: { flow: NonNullable<ResearchReport['pulse']['options']> }) {
  const pcrOI = flow.putCallRatioOI;
  const pcrVol = flow.putCallRatioVol;
  const avgIV = flow.avgImpliedVol;
  const pcrColor = (v: number | null) =>
    v == null ? 'var(--ink-tertiary)' : v > 1.2 ? 'var(--brick)' : v < 0.7 ? 'var(--forest)' : 'var(--amber)';
  const pcrLabel = (v: number | null) =>
    v == null ? 'n/a' : v > 1.2 ? 'Bearish skew' : v < 0.7 ? 'Bullish skew' : 'Neutral';

  return (
    <div
      className="grid grid-cols-3 gap-3 rounded-2xl p-4 mb-5"
      style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
    >
      {[
        { label: 'P/C ratio OI', value: pcrOI?.toFixed(2) ?? 'n/a', note: pcrLabel(pcrOI), color: pcrColor(pcrOI) },
        { label: 'P/C ratio Vol', value: pcrVol?.toFixed(2) ?? 'n/a', note: pcrLabel(pcrVol), color: pcrColor(pcrVol) },
        { label: 'Avg IV', value: avgIV != null ? `${(avgIV * 100).toFixed(1)}%` : 'n/a', note: 'implied vol', color: 'var(--dusty)' },
      ].map(({ label, value, note, color }) => (
        <div key={label}>
          <div className="eyebrow mb-1">{label}</div>
          <div className="font-serif text-2xl tabular-nums" style={{ color, letterSpacing: '-0.02em' }}>
            {value}
          </div>
          <div className="text-[11px] text-ink-tertiary mt-0.5">{note}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── ATM straddle price estimate ────────────────────────────────────────── */

function StraddleRow({
  call,
  put,
  spot,
}: {
  call: OptionsContract;
  put: OptionsContract;
  spot: number | null;
}) {
  const cMid =
    call.bid != null && call.ask != null
      ? (call.bid + call.ask) / 2
      : call.lastPrice;
  const pMid =
    put.bid != null && put.ask != null
      ? (put.bid + put.ask) / 2
      : put.lastPrice;
  if (!cMid || !pMid || !spot) return null;
  const straddleCost = cMid + pMid;
  const movePct = (straddleCost / spot) * 100;

  return (
    <div
      className="flex items-center gap-4 rounded-2xl px-4 py-3 mt-4"
      style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
    >
      <div className="text-[11px] text-ink-tertiary font-medium uppercase tracking-wide">
        ATM Straddle ({call.expiry})
      </div>
      <div className="text-sm font-semibold tabular-nums ml-auto">
        ${fmtPrice(straddleCost)}
      </div>
      <div className="text-sm text-ink-secondary tabular-nums">
        ±{movePct.toFixed(1)}% implied move
      </div>
    </div>
  );
}

/* ─── Single strike row ──────────────────────────────────────────────────── */

function StrikeRow({
  strike,
  call,
  put,
  isAtm,
  spot,
}: {
  strike: number;
  call: OptionsContract | null;
  put: OptionsContract | null;
  isAtm: boolean;
  spot: number | null;
}) {
  const inMoneyCall = spot != null && strike < spot;
  const inMoneyPut = spot != null && strike > spot;

  return (
    <div
      className={`grid text-[12px] tabular-nums px-4 py-2 transition hover:bg-white/40 ${
        isAtm ? 'border-y border-dashed' : ''
      }`}
      style={{
        gridTemplateColumns: '1fr 70px 60px 56px 56px 72px 56px 70px 60px 56px 56px 72px',
        borderColor: isAtm ? 'var(--panel-border)' : undefined,
        background: inMoneyCall && !inMoneyPut ? 'rgba(46,93,67,0.04)' : undefined,
      }}
    >
      {/* Call side */}
      <ContractCell c={call} field="iv" align="right" inMoney={inMoneyCall} />
      <ContractCell c={call} field="delta" align="right" inMoney={inMoneyCall} />
      <ContractCell c={call} field="volume" align="right" inMoney={inMoneyCall} />
      <ContractCell c={call} field="openInterest" align="right" inMoney={inMoneyCall} />
      <ContractCell c={call} field="bidask" align="right" inMoney={inMoneyCall} />

      {/* Strike */}
      <div
        className={`text-center font-semibold py-0.5 rounded-md ${
          isAtm ? 'text-ink' : 'text-ink-secondary'
        }`}
        style={isAtm ? { background: 'var(--amber)', color: '#fff', fontSize: '11px' } : {}}
      >
        {fmtPrice(strike)}
      </div>

      {/* Put side */}
      <ContractCell c={put} field="bidask" align="left" inMoney={inMoneyPut} />
      <ContractCell c={put} field="openInterest" align="left" inMoney={inMoneyPut} />
      <ContractCell c={put} field="volume" align="left" inMoney={inMoneyPut} />
      <ContractCell c={put} field="delta" align="left" inMoney={inMoneyPut} />
      <ContractCell c={put} field="iv" align="left" inMoney={inMoneyPut} />
      <div />
    </div>
  );
}

type CellField = 'iv' | 'delta' | 'volume' | 'openInterest' | 'bidask';

function ContractCell({
  c,
  field,
  align,
  inMoney,
}: {
  c: OptionsContract | null;
  field: CellField;
  align: 'left' | 'right';
  inMoney: boolean;
}) {
  if (!c) return <div className={`text-${align} text-ink-tertiary`}>—</div>;

  let text = '—';
  if (field === 'iv') text = c.impliedVol != null ? `${(c.impliedVol * 100).toFixed(0)}%` : '—';
  else if (field === 'delta') text = c.delta != null ? c.delta.toFixed(2) : '—';
  else if (field === 'volume') text = c.volume > 0 ? c.volume.toLocaleString() : '0';
  else if (field === 'openInterest') text = c.openInterest > 0 ? c.openInterest.toLocaleString() : '0';
  else if (field === 'bidask') {
    if (c.bid != null && c.ask != null) text = `${fmtPrice(c.bid)}/${fmtPrice(c.ask)}`;
    else if (c.lastPrice != null) text = fmtPrice(c.lastPrice);
  }

  const isHighlight = field === 'openInterest' && c.openInterest > 1000;

  return (
    <div
      className={`text-${align} ${inMoney ? 'text-ink font-medium' : 'text-ink-secondary'} ${
        isHighlight ? 'text-amber font-semibold' : ''
      }`}
    >
      {text}
    </div>
  );
}
