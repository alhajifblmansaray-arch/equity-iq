import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen, ChevronDown, ChevronUp, Plus, Target, TrendingDown,
  TrendingUp, Trophy, X, CheckCircle2, AlertTriangle, BarChart2, Trash2, PenLine,
} from '../lib/icons';
import { journal as journalApi } from '../lib/api';
import type {
  TradeEntry, JournalStats, SetupTag, CatalystTag, MistakeTag, EmotionalState, ParsedTrade,
} from '../types';
import QuickLogModal from '../components/QuickLogModal';
import { fmtPrice } from '../lib/helpers';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

const SETUP_TAGS: SetupTag[] = [
  'breakout', 'earnings_play', 'dip_buy', 'momentum',
  'mean_reversion', 'options_income', 'swing', 'scalp', 'macro',
];
const CATALYST_TAGS: CatalystTag[] = [
  'earnings', 'news', 'technical_level', 'macro',
  'insider_activity', 'social_sentiment', 'analyst_upgrade', 'sector_rotation',
];
const MISTAKE_TAGS: MistakeTag[] = [
  'fomo_entry', 'revenge_trade', 'ignored_stop', 'oversized_position',
  'no_thesis', 'held_too_long', 'sold_too_early', 'chased_entry',
];
const EMOTIONAL_STATES: EmotionalState[] = [
  'calm', 'confident', 'anxious', 'uncertain', 'impatient', 'euphoric',
];

function tagLabel(t: string) {
  return t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function fmtPct(n: number, decimals = 1) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`;
}

function pnlColor(n: number) {
  return n > 0 ? 'text-forest' : n < 0 ? 'text-brick' : 'text-ink-secondary';
}

// ── Tag pill ──────────────────────────────────────────────────────────────────
function TagPill({
  label, active, onClick, color = 'default',
}: { label: string; active: boolean; onClick: () => void; color?: 'default' | 'red' | 'amber' }) {
  const cls = active
    ? color === 'red'
      ? 'bg-brick/20 border-brick/50 text-brick'
      : color === 'amber'
      ? 'bg-gold/20 border-gold/60 text-amber-700 dark:text-amber-400'
      : 'bg-forest/15 border-forest/40 text-forest'
    : 'border-glass-border text-ink-secondary hover:border-ink-secondary/40';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-0.5 rounded-full border text-xs font-medium transition-all ${cls}`}
    >
      {label}
    </button>
  );
}

// ── Conviction stars ──────────────────────────────────────────────────────────
function ConvictionPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`w-6 h-6 rounded-full text-xs font-bold border transition-all ${
            n <= value ? 'bg-gold/80 border-gold text-white' : 'border-glass-border text-ink-secondary'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

// ── Log trade form ────────────────────────────────────────────────────────────
interface LogFormProps {
  prefillTicker?: string;
  prefill?: ParsedTrade;
  onSave: (t: TradeEntry) => void;
  onClose: () => void;
}

function LogForm({ prefillTicker = '', prefill, onSave, onClose }: LogFormProps) {
  const p = prefill;
  const [ticker, setTicker] = useState((p?.ticker ?? prefillTicker).toUpperCase());
  const [direction, setDirection] = useState<'long' | 'short'>(p?.direction === 'short' ? 'short' : 'long');
  const [assetType, setAssetType] = useState<'stock' | 'option' | 'etf' | 'crypto'>(p?.assetType ?? 'stock');
  const [entryDate, setEntryDate] = useState(p?.entryDate ? new Date(p.entryDate).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));
  const [thesis, setThesis] = useState(p?.thesis ?? '');
  const [setupTags, setSetupTags] = useState<SetupTag[]>((p?.setupTags ?? []) as SetupTag[]);
  const [catalystTags, setCatalystTags] = useState<CatalystTag[]>([]);
  const [emotional, setEmotional] = useState<EmotionalState>('calm');
  const [conviction, setConviction] = useState(3);
  const [stopLoss, setStopLoss] = useState('');
  const [target, setTarget] = useState('');
  const [agreedWithForecast, setAgreedWithForecast] = useState<boolean | null>(null);

  // Stock fields
  const [entryPrice, setEntryPrice] = useState(p?.stockDetails?.entryPrice != null ? String(p.stockDetails.entryPrice) : '');
  const [shares, setShares] = useState(p?.stockDetails?.shares != null ? String(p.stockDetails.shares) : '');

  // Option fields
  const od = p?.optionDetails;
  const [contractType, setContractType] = useState<'call' | 'put'>(od?.contractType ?? 'call');
  const [strike, setStrike] = useState(od?.strike != null ? String(od.strike) : '');
  const [expiry, setExpiry] = useState(od?.expiry ?? '');
  const [contracts, setContracts] = useState(od?.contracts != null ? String(od.contracts) : '1');
  const [entryPremium, setEntryPremium] = useState(od?.entryPremium != null ? String(od.entryPremium) : '');
  const [underlyingAtEntry, setUnderlyingAtEntry] = useState(od?.underlyingPriceAtEntry != null ? String(od.underlyingPriceAtEntry) : '');

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const isOption = assetType === 'option';

  const toggleSetup = (t: SetupTag) =>
    setSetupTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  const toggleCatalyst = (t: CatalystTag) =>
    setCatalystTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ticker) { setErr('Ticker is required.'); return; }
    if (isOption && (!entryPremium || !contracts || !strike || !expiry)) {
      setErr('Premium, contracts, strike, and expiry are required for options.');
      return;
    }
    if (!isOption && (!entryPrice || !shares)) {
      setErr('Entry price and shares are required.');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      const trade = await journalApi.create({
        ticker: ticker.toUpperCase(),
        direction,
        assetType,
        entryDate,
        thesis,
        setupTags,
        catalystTags,
        emotionalStateEntry: emotional,
        convictionLevel: conviction,
        stopLoss: stopLoss ? Number(stopLoss) : undefined,
        targetPrice: target ? Number(target) : undefined,
        agreedWithForecast,
        ...(isOption ? {
          optionDetails: {
            contractType,
            strike: Number(strike),
            expiry,
            contracts: Number(contracts),
            multiplier: 100,
            entryPremium: Number(entryPremium),
            underlyingPriceAtEntry: underlyingAtEntry ? Number(underlyingAtEntry) : undefined,
          },
        } : {
          stockDetails: {
            entryPrice: Number(entryPrice),
            shares: Number(shares),
          },
        }),
      });
      onSave(trade);
    } catch {
      setErr('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {prefill && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-forest/10 border border-forest/30 text-xs text-forest">
          <CheckCircle2 size={12} />
          Pre-filled from AI — review and adjust before saving.
        </div>
      )}
      {/* Ticker + direction + asset */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <label className="block text-xs font-medium text-ink-secondary mb-1">Ticker</label>
          <input
            className="w-full px-3 py-2 rounded-xl border border-glass-border bg-white/20 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-forest/40"
            value={ticker}
            onChange={e => setTicker(e.target.value.toUpperCase())}
            placeholder="AAPL"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-secondary mb-1">Direction</label>
          <div className="flex rounded-xl overflow-hidden border border-glass-border">
            {(['long', 'short'] as const).map(d => (
              <button key={d} type="button" onClick={() => setDirection(d)}
                className={`flex-1 py-2 text-sm font-medium transition-all ${direction === d ? (d === 'long' ? 'bg-forest text-white' : 'bg-brick text-white') : 'text-ink-secondary hover:bg-white/20'}`}>
                {d === 'long' ? '↑ Long' : '↓ Short'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-secondary mb-1">Asset</label>
          <select className="w-full px-3 py-2 rounded-xl border border-glass-border bg-white/20 text-sm focus:outline-none" value={assetType} onChange={e => setAssetType(e.target.value as any)}>
            <option value="stock">Stock</option>
            <option value="option">Option</option>
            <option value="etf">ETF</option>
            <option value="crypto">Crypto</option>
          </select>
        </div>
      </div>

      {/* Asset-specific price fields */}
      {isOption ? (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-gold/8 border border-gold/25 text-xs text-amber-700 dark:text-amber-400">
            P&L = (exit premium − entry premium) × contracts × 100. The underlying price is stored as context only.
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">Contract Type</label>
              <div className="flex rounded-xl overflow-hidden border border-glass-border">
                {(['call', 'put'] as const).map(ct => (
                  <button key={ct} type="button" onClick={() => setContractType(ct)}
                    className={`flex-1 py-2 text-sm font-medium capitalize transition-all ${contractType === ct ? 'bg-forest text-white' : 'text-ink-secondary hover:bg-white/20'}`}>
                    {ct}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">Expiry Date</label>
              <input type="date" className="w-full px-3 py-2 rounded-xl border border-glass-border bg-white/20 text-sm focus:outline-none" value={expiry} onChange={e => setExpiry(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">Strike</label>
              <input type="number" step="0.50" className="w-full px-3 py-2 rounded-xl border border-glass-border bg-white/20 text-sm focus:outline-none" value={strike} onChange={e => setStrike(e.target.value)} placeholder="190.00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">Entry Premium</label>
              <input type="number" step="0.01" className="w-full px-3 py-2 rounded-xl border border-glass-border bg-white/20 text-sm focus:outline-none" value={entryPremium} onChange={e => setEntryPremium(e.target.value)} placeholder="0.45" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">Contracts</label>
              <input type="number" step="1" min="1" className="w-full px-3 py-2 rounded-xl border border-glass-border bg-white/20 text-sm focus:outline-none" value={contracts} onChange={e => setContracts(e.target.value)} placeholder="1" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1">Underlying Price at Entry <span className="text-ink-secondary/60">(optional, reference only)</span></label>
            <input type="number" step="0.01" className="w-48 px-3 py-2 rounded-xl border border-glass-border bg-white/20 text-sm focus:outline-none" value={underlyingAtEntry} onChange={e => setUnderlyingAtEntry(e.target.value)} placeholder="19.34" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Entry Price', val: entryPrice, set: setEntryPrice, placeholder: '190.00' },
            { label: 'Shares', val: shares, set: setShares, placeholder: '100' },
            { label: 'Stop Loss', val: stopLoss, set: setStopLoss, placeholder: '185.00' },
            { label: 'Target', val: target, set: setTarget, placeholder: '210.00' },
          ].map(({ label, val, set, placeholder }) => (
            <div key={label}>
              <label className="block text-xs font-medium text-ink-secondary mb-1">{label}</label>
              <input type="number" step="0.01" className="w-full px-3 py-2 rounded-xl border border-glass-border bg-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-forest/40" value={val} onChange={e => set(e.target.value)} placeholder={placeholder} />
            </div>
          ))}
        </div>
      )}

      {/* Date */}
      <div>
        <label className="block text-xs font-medium text-ink-secondary mb-1">Entry Date & Time</label>
        <input type="datetime-local" className="px-3 py-2 rounded-xl border border-glass-border bg-white/20 text-sm focus:outline-none" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
      </div>

      {/* Thesis */}
      <div>
        <label className="block text-xs font-medium text-ink-secondary mb-1">Thesis — why are you entering?</label>
        <textarea
          rows={3}
          className="w-full px-3 py-2 rounded-xl border border-glass-border bg-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-forest/40 resize-none"
          value={thesis}
          onChange={e => setThesis(e.target.value)}
          placeholder="e.g. Breakout above 52w high on earnings beat, IV crush expected post-announcement, holding 2–3 days..."
        />
      </div>

      {/* Setup tags */}
      <div>
        <label className="block text-xs font-medium text-ink-secondary mb-2">Setup type</label>
        <div className="flex flex-wrap gap-1.5">
          {SETUP_TAGS.map(t => (
            <TagPill key={t} label={tagLabel(t)} active={setupTags.includes(t)} onClick={() => toggleSetup(t)} />
          ))}
        </div>
      </div>

      {/* Catalyst tags */}
      <div>
        <label className="block text-xs font-medium text-ink-secondary mb-2">Catalyst</label>
        <div className="flex flex-wrap gap-1.5">
          {CATALYST_TAGS.map(t => (
            <TagPill key={t} label={tagLabel(t)} active={catalystTags.includes(t)} onClick={() => toggleCatalyst(t)} color="amber" />
          ))}
        </div>
      </div>

      {/* Emotional state + conviction */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-ink-secondary mb-1">Emotional state at entry</label>
          <div className="flex flex-wrap gap-1.5">
            {EMOTIONAL_STATES.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setEmotional(s)}
                className={`px-2.5 py-0.5 rounded-full border text-xs font-medium transition-all ${
                  emotional === s
                    ? 'bg-ink/10 border-ink/30 text-ink'
                    : 'border-glass-border text-ink-secondary hover:border-ink-secondary/40'
                }`}
              >
                {tagLabel(s)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-secondary mb-2">Conviction (1–5)</label>
          <ConvictionPicker value={conviction} onChange={setConviction} />
        </div>
      </div>

      {/* AI forecast agreement */}
      <div>
        <label className="block text-xs font-medium text-ink-secondary mb-2">Did you check the AI forecast?</label>
        <div className="flex gap-2">
          {[
            { val: true, label: '✓ Agreed with it' },
            { val: false, label: '✗ Faded it' },
            { val: null, label: "Didn't check" },
          ].map(({ val, label }) => (
            <button
              key={String(val)}
              type="button"
              onClick={() => setAgreedWithForecast(val)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                agreedWithForecast === val
                  ? 'bg-forest/15 border-forest/40 text-forest'
                  : 'border-glass-border text-ink-secondary hover:border-ink-secondary/40'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {err && <p className="text-brick text-sm">{err}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl bg-forest text-white font-medium text-sm disabled:opacity-50 transition-all hover:bg-forest/90"
        >
          {saving ? 'Saving…' : 'Log Trade'}
        </button>
        <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-glass-border text-sm font-medium hover:bg-white/20 transition-all">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Close trade form ──────────────────────────────────────────────────────────
function CloseForm({ trade, onSave, onClose }: { trade: TradeEntry; onSave: (t: TradeEntry) => void; onClose: () => void }) {
  const isOption = trade.assetType === 'option';
  const [exitPrice, setExitPrice] = useState('');       // stock
  const [exitPremium, setExitPremium] = useState('');   // option
  const [underlyingAtExit, setUnderlyingAtExit] = useState('');
  const [exitDate, setExitDate] = useState(new Date().toISOString().slice(0, 16));
  const [fees, setFees] = useState('0');
  const [emotionalExit, setEmotionalExit] = useState<EmotionalState>('calm');
  const [exitReason, setExitReason] = useState('');
  const [mistakeTags, setMistakeTags] = useState<MistakeTag[]>([]);
  const [didFollow, setDidFollow] = useState<boolean | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const toggleMistake = (t: MistakeTag) =>
    setMistakeTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  // Live P&L preview
  const dir = trade.direction === 'long' ? 1 : -1;
  let preview: number | null = null;
  if (isOption && exitPremium && trade.optionDetails) {
    const { entryPremium, contracts, multiplier = 100 } = trade.optionDetails;
    preview = dir * (Number(exitPremium) - entryPremium) * contracts * multiplier - Number(fees || 0);
  } else if (!isOption && exitPrice && trade.stockDetails) {
    preview = dir * (Number(exitPrice) - trade.stockDetails.entryPrice) * trade.stockDetails.shares - Number(fees || 0);
  }

  const entryLabel = isOption
    ? `${trade.ticker} ${trade.optionDetails?.contractType?.toUpperCase()} $${trade.optionDetails?.strike} exp ${trade.optionDetails?.expiry} — ${trade.optionDetails?.contracts}c @ $${trade.optionDetails?.entryPremium} premium`
    : `${trade.ticker} ${trade.direction} ${trade.stockDetails?.shares} shares @ $${trade.stockDetails?.entryPrice}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (isOption && !exitPremium) { setErr('Exit premium is required.'); return; }
    if (!isOption && !exitPrice) { setErr('Exit price is required.'); return; }
    setSaving(true);
    setErr('');
    try {
      const updated = await journalApi.close(trade.id, {
        exitDate,
        fees: Number(fees || 0),
        emotionalStateExit: emotionalExit,
        exitReason,
        mistakeTags,
        didFollowThesis: didFollow ?? undefined,
        reviewNotes,
        ...(isOption ? {
          exitPremium: Number(exitPremium),
          underlyingPriceAtExit: underlyingAtExit ? Number(underlyingAtExit) : undefined,
        } : {
          exitPrice: Number(exitPrice),
        }),
      } as any);
      onSave(updated);
    } catch {
      setErr('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="p-3 rounded-xl bg-white/10 border border-glass-border text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-ink-secondary">Trade</span>
          <span className="font-medium font-mono text-right text-xs">{entryLabel}</span>
        </div>
        {preview !== null && (
          <div className="flex justify-between mt-1">
            <span className="text-ink-secondary">Estimated P&L</span>
            <span className={`font-medium ${pnlColor(preview)}`}>{preview >= 0 ? '+' : ''}${preview.toFixed(2)}</span>
          </div>
        )}
      </div>

      {isOption ? (
        <div className="space-y-3">
          <div className="p-2.5 rounded-xl bg-gold/8 border border-gold/25 text-xs text-amber-700 dark:text-amber-400">
            Enter the exit premium (price per share you sold the contract for), not the underlying stock price.
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">Exit Premium</label>
              <input type="number" step="0.01" className="w-full px-3 py-2 rounded-xl border border-glass-border bg-white/20 text-sm focus:outline-none" value={exitPremium} onChange={e => setExitPremium(e.target.value)} placeholder="0.86" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">Underlying Price at Exit <span className="text-ink-secondary/60">(optional)</span></label>
              <input type="number" step="0.01" className="w-full px-3 py-2 rounded-xl border border-glass-border bg-white/20 text-sm focus:outline-none" value={underlyingAtExit} onChange={e => setUnderlyingAtExit(e.target.value)} placeholder="18.94" />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-ink-secondary mb-1">Exit Price</label>
            <input type="number" step="0.01" className="w-full px-3 py-2 rounded-xl border border-glass-border bg-white/20 text-sm focus:outline-none" value={exitPrice} onChange={e => setExitPrice(e.target.value)} placeholder="195.00" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1">Fees</label>
            <input type="number" step="0.01" className="w-full px-3 py-2 rounded-xl border border-glass-border bg-white/20 text-sm focus:outline-none" value={fees} onChange={e => setFees(e.target.value)} />
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-ink-secondary mb-1">Exit Date & Time</label>
        <input type="datetime-local" className="px-3 py-2 rounded-xl border border-glass-border bg-white/20 text-sm focus:outline-none" value={exitDate} onChange={e => setExitDate(e.target.value)} />
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-secondary mb-1">Why did you exit?</label>
        <input className="w-full px-3 py-2 rounded-xl border border-glass-border bg-white/20 text-sm focus:outline-none" value={exitReason} onChange={e => setExitReason(e.target.value)} placeholder="Hit target / Stop triggered / Changed thesis…" />
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-secondary mb-2">Any mistakes?</label>
        <div className="flex flex-wrap gap-1.5">
          {MISTAKE_TAGS.map(t => (
            <TagPill key={t} label={tagLabel(t)} active={mistakeTags.includes(t)} onClick={() => toggleMistake(t)} color="red" />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-secondary mb-2">Emotional state at exit</label>
        <div className="flex flex-wrap gap-1.5">
          {EMOTIONAL_STATES.map(s => (
            <button key={s} type="button" onClick={() => setEmotionalExit(s)}
              className={`px-2.5 py-0.5 rounded-full border text-xs font-medium transition-all ${emotionalExit === s ? 'bg-ink/10 border-ink/30 text-ink' : 'border-glass-border text-ink-secondary hover:border-ink-secondary/40'}`}>
              {tagLabel(s)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-secondary mb-2">Did the original thesis play out?</label>
        <div className="flex gap-2">
          {[{ val: true, label: 'Yes, thesis held' }, { val: false, label: 'No, thesis failed' }].map(({ val, label }) => (
            <button key={String(val)} type="button" onClick={() => setDidFollow(val)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${didFollow === val ? 'bg-forest/15 border-forest/40 text-forest' : 'border-glass-border text-ink-secondary hover:border-ink-secondary/40'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-secondary mb-1">Review notes</label>
        <textarea rows={3} className="w-full px-3 py-2 rounded-xl border border-glass-border bg-white/20 text-sm focus:outline-none resize-none" value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="What did you learn? What would you do differently?" />
      </div>

      {err && <p className="text-brick text-sm">{err}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-forest text-white font-medium text-sm disabled:opacity-50 transition-all hover:bg-forest/90">
          {saving ? 'Saving…' : 'Close Trade'}
        </button>
        <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-glass-border text-sm font-medium hover:bg-white/20 transition-all">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Edit form ─────────────────────────────────────────────────────────────────
function EditForm({ trade, onSave, onClose }: { trade: TradeEntry; onSave: (t: TradeEntry) => void; onClose: () => void }) {
  const isOption = trade.assetType === 'option';

  // Direction (applies to all trade types)
  const [direction, setDirection] = useState<'long' | 'short'>(trade.direction ?? 'long');

  // Shared fields
  const [thesis, setThesis] = useState(trade.thesis ?? '');
  const [setupTags, setSetupTags] = useState<SetupTag[]>((trade.setupTags ?? []) as SetupTag[]);
  const [catalystTags, setCatalystTags] = useState<CatalystTag[]>((trade.catalystTags ?? []) as CatalystTag[]);
  const [emotional, setEmotional] = useState<EmotionalState>((trade.emotionalStateEntry ?? 'calm') as EmotionalState);
  const [conviction, setConviction] = useState(trade.convictionLevel ?? 3);
  const [stopLoss, setStopLoss] = useState(trade.stopLoss?.toString() ?? '');
  const [target, setTarget] = useState(trade.targetPrice?.toString() ?? '');
  const [agreedWithForecast, setAgreedWithForecast] = useState<boolean | null>(trade.agreedWithForecast ?? null);
  const [reviewNotes, setReviewNotes] = useState(trade.reviewNotes ?? '');
  const [didFollowThesis, setDidFollowThesis] = useState<boolean | null>(trade.didFollowThesis ?? null);
  const [mistakeTags, setMistakeTags] = useState<MistakeTag[]>((trade.mistakeTags ?? []) as MistakeTag[]);
  const [fees, setFees] = useState(trade.fees?.toString() ?? '0');

  // Stock price fields
  const [entryPrice, setEntryPrice] = useState(trade.stockDetails?.entryPrice?.toString() ?? '');
  const [shares, setShares] = useState(trade.stockDetails?.shares?.toString() ?? '');
  const [exitPrice, setExitPrice] = useState(trade.stockDetails?.exitPrice?.toString() ?? '');

  // Option fields — all four required for options
  const [contractType, setContractType] = useState<'call' | 'put'>(trade.optionDetails?.contractType ?? 'call');
  const [strike, setStrike] = useState(trade.optionDetails?.strike?.toString() ?? '');
  const [expiry, setExpiry] = useState(trade.optionDetails?.expiry ?? '');
  const [entryPremium, setEntryPremium] = useState(trade.optionDetails?.entryPremium?.toString() ?? '');
  const [exitPremium, setExitPremium] = useState(trade.optionDetails?.exitPremium?.toString() ?? '');
  const [contracts, setContracts] = useState(trade.optionDetails?.contracts?.toString() ?? '');

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const toggleSetup = (t: SetupTag) => setSetupTags(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);
  const toggleCatalyst = (t: CatalystTag) => setCatalystTags(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);
  const toggleMistake = (t: MistakeTag) => setMistakeTags(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr('');
    try {
      if (isOption && (!entryPremium || !contracts || !strike || !expiry)) {
        setErr('Premium, contracts, strike, and expiry are required for options.');
        setSaving(false);
        return;
      }
      const payload: any = {
        direction,
        thesis, setupTags, catalystTags,
        emotionalStateEntry: emotional,
        convictionLevel: conviction,
        stopLoss: stopLoss ? Number(stopLoss) : undefined,
        targetPrice: target ? Number(target) : undefined,
        agreedWithForecast,
        reviewNotes,
        didFollowThesis: didFollowThesis ?? undefined,
        mistakeTags,
        fees: Number(fees || 0),
      };
      if (isOption) {
        payload.optionDetails = {
          ...trade.optionDetails,
          contractType,
          strike: Number(strike),
          expiry,
          entryPremium: Number(entryPremium),
          exitPremium: exitPremium ? Number(exitPremium) : undefined,
          contracts: Number(contracts),
          multiplier: trade.optionDetails?.multiplier ?? 100,
        };
      } else {
        payload.stockDetails = {
          entryPrice: Number(entryPrice),
          shares: Number(shares),
          exitPrice: exitPrice ? Number(exitPrice) : undefined,
        };
      }
      const updated = await journalApi.update(trade.id, payload);
      onSave(updated);
    } catch {
      setErr('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Direction toggle — applies to all trade types */}
      <div>
        <label className="block text-xs font-medium text-ink-secondary mb-1">Direction</label>
        <div className="flex rounded-xl overflow-hidden border border-glass-border w-fit">
          {(['long', 'short'] as const).map(d => (
            <button key={d} type="button" onClick={() => setDirection(d)}
              className={`px-6 py-2 text-sm font-medium transition-all ${direction === d ? (d === 'long' ? 'bg-forest text-white' : 'bg-brick text-white') : 'text-ink-secondary hover:bg-white/20'}`}>
              {d === 'long' ? '↑ Long' : '↓ Short'}
            </button>
          ))}
        </div>
      </div>

      {/* Price fields */}
      {isOption ? (
        <div className="space-y-3">
          <div className="p-2.5 rounded-xl bg-gold/8 border border-gold/25 text-xs text-amber-700 dark:text-amber-400">
            P&L = (exit premium − entry premium) × contracts × 100. Direction above determines sign.
          </div>
          {/* Contract type + expiry */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">Contract Type</label>
              <div className="flex rounded-xl overflow-hidden border border-glass-border">
                {(['call', 'put'] as const).map(ct => (
                  <button key={ct} type="button" onClick={() => setContractType(ct)}
                    className={`flex-1 py-2 text-sm font-medium capitalize transition-all ${contractType === ct ? 'bg-forest text-white' : 'text-ink-secondary hover:bg-white/20'}`}>
                    {ct}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">Expiry Date</label>
              <input type="date" className="w-full px-3 py-2 rounded-xl border border-glass-border bg-white/20 text-sm focus:outline-none" value={expiry} onChange={e => setExpiry(e.target.value)} />
            </div>
          </div>
          {/* Strike + premiums + contracts */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">Strike</label>
              <input type="number" step="0.50" className="w-full px-3 py-2 rounded-xl border border-glass-border bg-white/20 text-sm focus:outline-none" value={strike} onChange={e => setStrike(e.target.value)} placeholder="19.00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">Entry Premium</label>
              <input type="number" step="0.01" className="w-full px-3 py-2 rounded-xl border border-glass-border bg-white/20 text-sm focus:outline-none" value={entryPremium} onChange={e => setEntryPremium(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">Exit Premium</label>
              <input type="number" step="0.01" className="w-full px-3 py-2 rounded-xl border border-glass-border bg-white/20 text-sm focus:outline-none" value={exitPremium} onChange={e => setExitPremium(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">Contracts</label>
              <input type="number" step="1" min="1" className="w-full px-3 py-2 rounded-xl border border-glass-border bg-white/20 text-sm focus:outline-none" value={contracts} onChange={e => setContracts(e.target.value)} />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Entry Price', val: entryPrice, set: setEntryPrice },
            { label: trade.status === 'closed' ? 'Exit Price' : 'Shares', val: trade.status === 'closed' ? exitPrice : shares, set: trade.status === 'closed' ? setExitPrice : setShares },
            { label: trade.status === 'closed' ? 'Shares' : 'Stop Loss', val: trade.status === 'closed' ? shares : stopLoss, set: trade.status === 'closed' ? setShares : setStopLoss },
          ].map(({ label, val, set }) => (
            <div key={label}>
              <label className="block text-xs font-medium text-ink-secondary mb-1">{label}</label>
              <input type="number" step="0.01" className="w-full px-3 py-2 rounded-xl border border-glass-border bg-white/20 text-sm focus:outline-none" value={val} onChange={e => set(e.target.value)} />
            </div>
          ))}
        </div>
      )}

      {/* Thesis */}
      <div>
        <label className="block text-xs font-medium text-ink-secondary mb-1">Thesis</label>
        <textarea rows={3} className="w-full px-3 py-2 rounded-xl border border-glass-border bg-white/20 text-sm focus:outline-none resize-none" value={thesis} onChange={e => setThesis(e.target.value)} />
      </div>

      {/* Setup tags */}
      <div>
        <label className="block text-xs font-medium text-ink-secondary mb-2">Setup</label>
        <div className="flex flex-wrap gap-1.5">
          {SETUP_TAGS.map(t => <TagPill key={t} label={tagLabel(t)} active={setupTags.includes(t)} onClick={() => toggleSetup(t)} />)}
        </div>
      </div>

      {/* Catalyst tags */}
      <div>
        <label className="block text-xs font-medium text-ink-secondary mb-2">Catalyst</label>
        <div className="flex flex-wrap gap-1.5">
          {CATALYST_TAGS.map(t => <TagPill key={t} label={tagLabel(t)} active={catalystTags.includes(t)} onClick={() => toggleCatalyst(t)} color="amber" />)}
        </div>
      </div>

      {/* Mistake tags (only for closed trades) */}
      {trade.status === 'closed' && (
        <div>
          <label className="block text-xs font-medium text-ink-secondary mb-2">Mistakes</label>
          <div className="flex flex-wrap gap-1.5">
            {MISTAKE_TAGS.map(t => <TagPill key={t} label={tagLabel(t)} active={mistakeTags.includes(t)} onClick={() => toggleMistake(t)} color="red" />)}
          </div>
        </div>
      )}

      {/* Emotional state + conviction */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-ink-secondary mb-1">Emotional state at entry</label>
          <div className="flex flex-wrap gap-1.5">
            {EMOTIONAL_STATES.map(s => (
              <button key={s} type="button" onClick={() => setEmotional(s)}
                className={`px-2.5 py-0.5 rounded-full border text-xs font-medium transition-all ${emotional === s ? 'bg-ink/10 border-ink/30 text-ink' : 'border-glass-border text-ink-secondary hover:border-ink-secondary/40'}`}>
                {tagLabel(s)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-secondary mb-2">Conviction</label>
          <ConvictionPicker value={conviction} onChange={setConviction} />
        </div>
      </div>

      {/* Forecast agreement */}
      <div>
        <label className="block text-xs font-medium text-ink-secondary mb-2">AI forecast?</label>
        <div className="flex gap-2">
          {[{ val: true, label: '✓ Agreed' }, { val: false, label: '✗ Faded' }, { val: null, label: "Didn't check" }].map(({ val, label }) => (
            <button key={String(val)} type="button" onClick={() => setAgreedWithForecast(val)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${agreedWithForecast === val ? 'bg-forest/15 border-forest/40 text-forest' : 'border-glass-border text-ink-secondary hover:border-ink-secondary/40'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Thesis follow-through (closed trades) */}
      {trade.status === 'closed' && (
        <div>
          <label className="block text-xs font-medium text-ink-secondary mb-2">Did thesis play out?</label>
          <div className="flex gap-2">
            {[{ val: true, label: 'Yes' }, { val: false, label: 'No' }].map(({ val, label }) => (
              <button key={String(val)} type="button" onClick={() => setDidFollowThesis(val)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${didFollowThesis === val ? 'bg-forest/15 border-forest/40 text-forest' : 'border-glass-border text-ink-secondary hover:border-ink-secondary/40'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Review notes */}
      <div>
        <label className="block text-xs font-medium text-ink-secondary mb-1">Review notes</label>
        <textarea rows={2} className="w-full px-3 py-2 rounded-xl border border-glass-border bg-white/20 text-sm focus:outline-none resize-none" value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="What did you learn?" />
      </div>

      {/* Fees */}
      <div>
        <label className="block text-xs font-medium text-ink-secondary mb-1">Fees</label>
        <input type="number" step="0.01" className="w-32 px-3 py-2 rounded-xl border border-glass-border bg-white/20 text-sm focus:outline-none" value={fees} onChange={e => setFees(e.target.value)} />
      </div>

      {err && <p className="text-brick text-sm">{err}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-forest text-white font-medium text-sm disabled:opacity-50 transition-all hover:bg-forest/90">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-glass-border text-sm font-medium hover:bg-white/20 transition-all">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Trade row ──────────────────────────────────────────────────────────────────
function TradeRow({ trade, onClose, onEdit, onDelete }: { trade: TradeEntry; onClose: (t: TradeEntry) => void; onEdit: (t: TradeEntry) => void; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const isOpen = trade.status === 'open';
  const pnl = trade.realizedPnl;
  const pnlPct = trade.realizedPnlPct;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="card !p-0 overflow-hidden"
    >
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/10 transition-all"
      >
        {/* Direction badge */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          trade.direction === 'long' ? 'bg-forest/15 text-forest' : 'bg-brick/15 text-brick'
        }`}>
          {trade.direction === 'long' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-semibold text-sm">{trade.ticker}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${
              isOpen ? 'bg-gold/15 border-gold/40 text-amber-700 dark:text-amber-400' : 'bg-white/10 border-glass-border text-ink-secondary'
            }`}>{isOpen ? 'Open' : 'Closed'}</span>
            {trade.setupTags?.slice(0, 2).map(t => (
              <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-forest/10 text-forest border border-forest/20">{tagLabel(t)}</span>
            ))}
          </div>
          {trade.thesis && (
            <p className="text-xs text-ink-secondary mt-0.5 truncate">{trade.thesis}</p>
          )}
        </div>

        <div className="text-right flex-shrink-0">
          {!isOpen && pnl != null ? (
            <>
              <p className={`font-semibold text-sm ${pnlColor(pnl)}`}>{pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}</p>
              {pnlPct != null && <p className={`text-xs ${pnlColor(pnl)}`}>{fmtPct(pnlPct)}</p>}
            </>
          ) : trade.assetType === 'option' && trade.optionDetails ? (
            <p className="text-sm text-ink-secondary font-mono">${trade.optionDetails.entryPremium} × {trade.optionDetails.contracts}c</p>
          ) : trade.stockDetails ? (
            <p className="text-sm text-ink-secondary font-mono">${trade.stockDetails.entryPrice.toFixed(2)}</p>
          ) : null}
        </div>

        <div className="text-ink-secondary ml-1">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-glass-border pt-3">
              {/* Metrics grid */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                {[
                  trade.assetType === 'option' && trade.optionDetails
                    ? { label: 'Premium', val: `$${trade.optionDetails.entryPremium} × ${trade.optionDetails.contracts}c` }
                    : { label: 'Entry', val: `$${trade.stockDetails?.entryPrice ?? '—'}` },
                  trade.assetType === 'option' && trade.optionDetails
                    ? { label: 'Strike / Exp', val: `$${trade.optionDetails.strike} ${trade.optionDetails.expiry}` }
                    : { label: 'Shares', val: `${trade.stockDetails?.shares ?? '—'}` },
                  { label: 'Date', val: new Date(trade.entryDate).toLocaleDateString() },
                  ...(trade.status === 'closed' ? [
                    trade.assetType === 'option' && trade.optionDetails?.exitPremium != null
                      ? { label: 'Exit Premium', val: `$${trade.optionDetails.exitPremium}` }
                      : { label: 'Exit', val: trade.stockDetails?.exitPrice != null ? `$${trade.stockDetails.exitPrice}` : '—' },
                    { label: 'Held', val: `${trade.holdingPeriodDays ?? '—'}d` },
                    { label: 'R-Multiple', val: trade.rMultiple != null ? `${trade.rMultiple.toFixed(2)}R` : '—' },
                  ] : [
                    { label: 'Stop', val: trade.stopLoss ? `$${trade.stopLoss}` : '—' },
                    { label: 'Target', val: trade.targetPrice ? `$${trade.targetPrice}` : '—' },
                    { label: 'Conviction', val: '★'.repeat(trade.convictionLevel) },
                  ]),
                ].map(({ label, val }) => (
                  <div key={label} className="p-2 rounded-lg bg-white/10">
                    <p className="text-ink-secondary mb-0.5">{label}</p>
                    <p className="font-medium font-mono">{val}</p>
                  </div>
                ))}
              </div>

              {/* Thesis */}
              {trade.thesis && (
                <div className="p-3 rounded-lg bg-white/10 text-xs">
                  <p className="text-ink-secondary font-medium mb-1">Thesis</p>
                  <p className="text-ink">{trade.thesis}</p>
                </div>
              )}

              {/* Tags */}
              {((trade.catalystTags?.length ?? 0) > 0 || (trade.mistakeTags?.length ?? 0) > 0) && (
                <div className="flex flex-wrap gap-1.5">
                  {trade.catalystTags?.map(t => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-gold/10 border border-gold/30 text-amber-700 dark:text-amber-400">{tagLabel(t)}</span>
                  ))}
                  {trade.mistakeTags?.map(t => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-brick/10 border border-brick/30 text-brick">{tagLabel(t)}</span>
                  ))}
                </div>
              )}

              {/* Review notes */}
              {trade.reviewNotes && (
                <div className="p-3 rounded-lg bg-white/10 text-xs">
                  <p className="text-ink-secondary font-medium mb-1">Review</p>
                  <p className="text-ink">{trade.reviewNotes}</p>
                </div>
              )}

              {/* Forecast agreement */}
              {trade.agreedWithForecast != null && (
                <p className="text-xs text-ink-secondary">
                  AI Forecast: <span className={trade.agreedWithForecast ? 'text-forest font-medium' : 'text-brick font-medium'}>
                    {trade.agreedWithForecast ? 'Agreed' : 'Faded'}
                  </span>
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1 flex-wrap">
                {isOpen && (
                  <button onClick={() => onClose(trade)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forest/15 text-forest border border-forest/30 text-xs font-medium hover:bg-forest/25 transition-all">
                    <CheckCircle2 size={12} /> Close trade
                  </button>
                )}
                <button onClick={() => onEdit(trade)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 text-ink-secondary border border-glass-border text-xs font-medium hover:bg-white/30 transition-all">
                  <PenLine size={12} /> Edit
                </button>
                <button onClick={() => onDelete(trade.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brick/10 text-brick border border-brick/20 text-xs font-medium hover:bg-brick/20 transition-all">
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Stats dashboard ──────────────────────────────────────────────────────────
function StatsDashboard({ stats }: { stats: JournalStats }) {
  if (stats.totalTrades === 0) return null;

  const topMistake = Object.entries(stats.mistakeCount).sort((a, b) => b[1] - a[1])[0];
  const topSetup = Object.entries(stats.bySetup).sort((a, b) => b[1].trades - a[1].trades)[0];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {[
        {
          label: 'Win Rate',
          val: `${(stats.winRate * 100).toFixed(0)}%`,
          sub: `${stats.totalTrades} closed trades`,
          icon: <Trophy size={16} />,
          color: stats.winRate >= 0.5 ? 'text-forest' : 'text-brick',
        },
        {
          label: 'Total P&L',
          val: `${stats.totalPnl >= 0 ? '+' : ''}$${stats.totalPnl.toFixed(2)}`,
          sub: `Profit factor ${stats.profitFactor?.toFixed(2) ?? '—'}`,
          icon: <BarChart2 size={16} />,
          color: pnlColor(stats.totalPnl),
        },
        {
          label: 'Best Setup',
          val: topSetup ? tagLabel(topSetup[0]) : '—',
          sub: topSetup ? `${((topSetup[1].wins / topSetup[1].trades) * 100).toFixed(0)}% win rate` : 'Log more trades',
          icon: <Target size={16} />,
          color: 'text-ink',
        },
        {
          label: 'Top Mistake',
          val: topMistake ? tagLabel(topMistake[0]) : '—',
          sub: topMistake ? `${topMistake[1]}× tagged` : 'No mistakes logged',
          icon: <AlertTriangle size={16} />,
          color: topMistake ? 'text-brick' : 'text-ink-secondary',
        },
      ].map(({ label, val, sub, icon, color }) => (
        <div key={label} className="card !p-4">
          <div className="flex items-center gap-2 text-ink-secondary text-xs mb-2">
            {icon} {label}
          </div>
          <p className={`text-lg font-semibold ${color}`}>{val}</p>
          <p className="text-xs text-ink-secondary mt-0.5">{sub}</p>
        </div>
      ))}

      {/* Forecast edge */}
      {(stats.forecastEdge.agreedTotal > 0 || stats.forecastEdge.fadedTotal > 0) && (
        <div className="card !p-4 col-span-2">
          <p className="text-xs text-ink-secondary mb-2 flex items-center gap-1"><BookOpen size={14} /> AI Forecast Edge</p>
          <div className="flex gap-6 text-sm">
            {stats.forecastEdge.agreedWinRate != null && (
              <div>
                <p className="text-forest font-semibold">{(stats.forecastEdge.agreedWinRate * 100).toFixed(0)}%</p>
                <p className="text-xs text-ink-secondary">when agreed ({stats.forecastEdge.agreedTotal} trades)</p>
              </div>
            )}
            {stats.forecastEdge.fadedWinRate != null && (
              <div>
                <p className="text-brick font-semibold">{(stats.forecastEdge.fadedWinRate * 100).toFixed(0)}%</p>
                <p className="text-xs text-ink-secondary">when faded ({stats.forecastEdge.fadedTotal} trades)</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
type Modal = { type: 'quick'; prefillTicker?: string } | { type: 'log'; prefill?: ParsedTrade } | { type: 'close'; trade: TradeEntry } | { type: 'edit'; trade: TradeEntry } | null;

export default function Journal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [trades, setTrades] = useState<TradeEntry[]>([]);
  const [stats, setStats] = useState<JournalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Modal>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');

  // Open quick-log modal when navigated to with ?ticker=XYZ
  useEffect(() => {
    const t = searchParams.get('ticker');
    if (t) {
      setModal({ type: 'quick', prefillTicker: t.toUpperCase() });
      setSearchParams({}, { replace: true });
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, s] = await Promise.all([journalApi.list(), journalApi.stats()]);
      setTrades(t);
      setStats(s);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSaved(trade: TradeEntry) {
    setTrades(prev => {
      const idx = prev.findIndex(t => t.id === trade.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = trade; return next; }
      return [trade, ...prev];
    });
    setModal(null);
    journalApi.stats().then(setStats);
  }

  async function handleDelete(id: string) {
    await journalApi.remove(id);
    setTrades(prev => prev.filter(t => t.id !== id));
    journalApi.stats().then(setStats);
  }

  const filtered = filter === 'all' ? trades : trades.filter(t => t.status === filter);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Journal</h1>
          <p className="text-sm text-ink-secondary mt-0.5">Decision records, not just price records.</p>
        </div>
        <button
          onClick={() => setModal({ type: 'quick' })}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-forest text-white text-sm font-medium hover:bg-forest/90 transition-all shadow-sm"
        >
          <Plus size={16} /> Log Trade
        </button>
      </div>

      {/* Stats */}
      {stats && <StatsDashboard stats={stats} />}

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/20 border border-glass-border mb-4 w-fit">
        {(['all', 'open', 'closed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
              filter === f ? 'bg-white/60 text-ink shadow-sm' : 'text-ink-secondary hover:text-ink'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Trade list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-ink-secondary text-sm gap-2">
          <span className="w-2 h-2 rounded-full bg-forest animate-pulseDot" />
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <BookOpen size={32} className="mx-auto text-ink-secondary mb-3" />
          <p className="font-medium text-ink mb-1">No trades yet</p>
          <p className="text-sm text-ink-secondary mb-4">Log your first trade to start tracking your decisions.</p>
          <button
            onClick={() => setModal({ type: 'quick' })}
            className="px-4 py-2 rounded-xl bg-forest text-white text-sm font-medium hover:bg-forest/90 transition-all"
          >
            Log a trade
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.map(trade => (
              <TradeRow
                key={trade.id}
                trade={trade}
                onClose={t => setModal({ type: 'close', trade: t })}
                onEdit={t => setModal({ type: 'edit', trade: t })}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
            onClick={e => { if (e.target === e.currentTarget) setModal(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="card w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-ink">
                  {modal.type === 'quick' ? (modal.prefillTicker ? `Log ${modal.prefillTicker} Trade` : 'Log a Trade')
                    : modal.type === 'log' ? (modal.prefill ? 'Confirm & Save Trade' : 'Log a Trade')
                    : modal.type === 'edit' ? `Edit ${modal.trade.ticker}`
                    : `Close ${modal.trade.ticker}`}
                </h2>
                <button onClick={() => setModal(null)} className="p-1.5 rounded-full hover:bg-white/20 transition-all text-ink-secondary">
                  <X size={16} />
                </button>
              </div>
              {modal.type === 'quick' ? (
                <QuickLogModal
                  prefillTicker={modal.prefillTicker}
                  onConfirm={parsed => setModal({ type: 'log', prefill: parsed })}
                  onClose={() => setModal(null)}
                />
              ) : modal.type === 'log' ? (
                <LogForm prefill={modal.prefill} onSave={handleSaved} onClose={() => setModal(null)} />
              ) : modal.type === 'edit' ? (
                <EditForm trade={modal.trade} onSave={handleSaved} onClose={() => setModal(null)} />
              ) : (
                <CloseForm trade={modal.trade} onSave={handleSaved} onClose={() => setModal(null)} />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
