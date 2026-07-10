import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Plus, X, CheckCircle2, AlertCircle, Loader2 } from '../lib/icons';
import { journal as journalApi } from '../lib/api';
import type { ParsedTrade } from '../types';

interface Props {
  prefillTicker?: string;
  prefillResearchId?: string;
  prefillForecastId?: string;
  onConfirm: (parsed: ParsedTrade) => void; // sends to LogForm pre-filled
  onClose: () => void;
}

type Mode = 'choose' | 'screenshot' | 'text';

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function FieldRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex justify-between items-baseline gap-3 py-1 border-b border-glass-border/50 last:border-0">
      <span className="text-xs text-ink-secondary shrink-0">{label}</span>
      <span className="text-xs font-mono font-medium text-ink text-right">{String(value)}</span>
    </div>
  );
}

function ParsePreview({ parsed, onConfirm, onRetry }: { parsed: ParsedTrade; onConfirm: () => void; onRetry: () => void }) {
  const isOption = parsed.assetType === 'option';
  const od = parsed.optionDetails;
  const sd = parsed.stockDetails;

  return (
    <div className="space-y-4">
      {parsed.notes && (
        <div className="p-3 rounded-xl bg-gold/10 border border-gold/30 text-xs text-amber-700 dark:text-amber-400">
          {parsed.notes}
        </div>
      )}

      <div className="p-3 rounded-xl bg-white/10 border border-glass-border space-y-0">
        <FieldRow label="Ticker" value={parsed.ticker} />
        <FieldRow label="Type" value={`${parsed.direction} ${parsed.assetType}`} />
        <FieldRow label="Account" value={parsed.account} />
        <FieldRow label="Entry date" value={parsed.entryDate ? new Date(parsed.entryDate).toLocaleString() : null} />
        <FieldRow label="Exit date" value={parsed.exitDate ? new Date(parsed.exitDate).toLocaleString() : null} />
        <FieldRow label="Fees" value={parsed.fees != null ? `$${parsed.fees}` : null} />
        {isOption && od ? (
          <>
            <FieldRow label="Contract" value={`${od.contractType?.toUpperCase()} $${od.strike} exp ${od.expiry}`} />
            <FieldRow label="Contracts" value={od.contracts} />
            <FieldRow label="Entry premium" value={od.entryPremium != null ? `$${od.entryPremium}` : null} />
            <FieldRow label="Exit premium" value={od.exitPremium != null ? `$${od.exitPremium}` : null} />
            <FieldRow label="IV at entry" value={od.ivEntry != null ? `${(od.ivEntry * 100).toFixed(1)}%` : null} />
            <FieldRow label="Delta" value={od.deltaEntry} />
            <FieldRow label="Theta" value={od.thetaEntry} />
            <FieldRow label="Underlying at entry" value={od.underlyingPriceAtEntry != null ? `$${od.underlyingPriceAtEntry}` : null} />
          </>
        ) : sd ? (
          <>
            <FieldRow label="Entry price" value={sd.entryPrice != null ? `$${sd.entryPrice}` : null} />
            <FieldRow label="Exit price" value={sd.exitPrice != null ? `$${sd.exitPrice}` : null} />
            <FieldRow label="Shares" value={sd.shares} />
          </>
        ) : null}
        {parsed.thesis && <FieldRow label="Thesis" value={parsed.thesis} />}
        {parsed.setupTags?.length ? <FieldRow label="Tags" value={parsed.setupTags.join(', ')} /> : null}
      </div>

      {parsed.confidence && parsed.confidence !== 'high' && (
        <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
          <AlertCircle size={12} />
          Confidence: {parsed.confidence} — review all fields before saving.
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-forest text-white text-sm font-medium hover:bg-forest/90 transition-all"
        >
          <CheckCircle2 size={14} /> Use this — fill form
        </button>
        <button
          onClick={onRetry}
          className="px-4 py-2.5 rounded-xl border border-glass-border text-sm font-medium hover:bg-white/20 transition-all"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export default function QuickLogModal({ prefillTicker, prefillResearchId, prefillForecastId, onConfirm, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('choose');
  const [images, setImages] = useState<string[]>([]);
  const [nlText, setNlText] = useState(prefillTicker ? `${prefillTicker} ` : '');
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedTrade | null>(null);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!arr.length) return;
    const urls = await Promise.all(arr.map(fileToDataUrl));
    setImages(prev => [...prev, ...urls].slice(0, 4));
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onPaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items).filter(i => i.type.startsWith('image/'));
    if (!items.length) return;
    const files = items.map(i => i.getAsFile()!).filter(Boolean);
    handleFiles(files);
  }, [handleFiles]);

  async function parseScreenshot() {
    if (!images.length) return;
    setLoading(true); setErr('');
    try {
      const result = await journalApi.parseScreenshot(images);
      if (result.error) { setErr(result.error); return; }
      if (prefillTicker && !result.ticker) result.ticker = prefillTicker;
      if (prefillResearchId) (result as any).linkedResearchId = prefillResearchId;
      if (prefillForecastId) (result as any).linkedForecastId = prefillForecastId;
      setParsed(result);
    } catch {
      setErr('Failed to parse screenshots. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function parseText() {
    if (!nlText.trim()) return;
    setLoading(true); setErr('');
    try {
      const result = await journalApi.parseText(nlText);
      if (result.error) { setErr(result.error); return; }
      if (prefillTicker && !result.ticker) result.ticker = prefillTicker;
      setParsed(result);
    } catch {
      setErr('Failed to parse. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setParsed(null); setErr(''); setImages([]); setNlText(prefillTicker ? `${prefillTicker} ` : '');
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {/* Choose mode */}
        {mode === 'choose' && !parsed && (
          <motion.div key="choose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <p className="text-xs text-ink-secondary">How do you want to log this trade?</p>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => setMode('screenshot')}
                className="flex items-center gap-3 p-4 rounded-xl border border-glass-border hover:bg-white/20 transition-all text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-forest/15 text-forest flex items-center justify-center flex-shrink-0">
                  <Camera size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">Screenshot parser</p>
                  <p className="text-xs text-ink-secondary">Paste or upload broker confirmation images — AI extracts everything</p>
                </div>
              </button>

              <button
                onClick={() => setMode('text')}
                className="flex items-center gap-3 p-4 rounded-xl border border-glass-border hover:bg-white/20 transition-all text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-gold/15 text-amber-700 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                  <span className="text-base">✏️</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">Quick text entry</p>
                  <p className="text-xs text-ink-secondary">Type "SOFI 19p 7/17, bought .51 sold .65, 100 contracts" and we'll parse it</p>
                </div>
              </button>

              <button
                onClick={() => onConfirm({ ticker: prefillTicker })}
                className="flex items-center gap-3 p-4 rounded-xl border border-glass-border hover:bg-white/20 transition-all text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-white/20 text-ink-secondary flex items-center justify-center flex-shrink-0">
                  <Plus size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">Manual entry</p>
                  <p className="text-xs text-ink-secondary">Fill out the full form yourself</p>
                </div>
              </button>
            </div>
          </motion.div>
        )}

        {/* Screenshot mode */}
        {mode === 'screenshot' && !parsed && (
          <motion.div key="screenshot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <button onClick={() => setMode('choose')} className="text-xs text-ink-secondary hover:text-ink transition-all">← Back</button>

            {/* Drop zone */}
            <div
              ref={dropRef}
              onDrop={onDrop}
              onDragOver={e => e.preventDefault()}
              onPaste={onPaste}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-glass-border rounded-2xl p-8 text-center cursor-pointer hover:border-forest/40 hover:bg-forest/5 transition-all"
              tabIndex={0}
            >
              <Camera size={28} className="mx-auto text-ink-secondary mb-2" />
              <p className="text-sm font-medium text-ink mb-1">Drop screenshots here</p>
              <p className="text-xs text-ink-secondary">Or click to upload · Or paste with Cmd+V</p>
              <p className="text-xs text-ink-secondary/60 mt-1">Up to 4 images — entry confirmation, exit confirmation, Greeks page</p>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => e.target.files && handleFiles(e.target.files)} />
            </div>

            {/* Previews */}
            {images.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {images.map((img, i) => (
                  <div key={i} className="relative">
                    <img src={img} alt={`screenshot ${i + 1}`} className="w-20 h-20 object-cover rounded-xl border border-glass-border" />
                    <button
                      onClick={e => { e.stopPropagation(); setImages(prev => prev.filter((_, j) => j !== i)); }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-brick text-white flex items-center justify-center"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {err && <p className="text-brick text-sm">{err}</p>}

            <button
              onClick={parseScreenshot}
              disabled={!images.length || loading}
              className="w-full py-2.5 rounded-xl bg-forest text-white text-sm font-medium disabled:opacity-40 hover:bg-forest/90 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={14} className="animate-spin" /> Extracting trade data…</> : 'Extract trade data'}
            </button>
          </motion.div>
        )}

        {/* Text mode */}
        {mode === 'text' && !parsed && (
          <motion.div key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <button onClick={() => setMode('choose')} className="text-xs text-ink-secondary hover:text-ink transition-all">← Back</button>

            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-2">Describe your trade</label>
              <textarea
                rows={4}
                autoFocus
                className="w-full px-3 py-3 rounded-xl border border-glass-border bg-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-forest/40 resize-none"
                value={nlText}
                onChange={e => setNlText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) parseText(); }}
                placeholder={'SOFI 19p 7/17, bought .51 sold .65, 100 contracts, TFSA, faded overbought RSI\n\nor: bought 50 AAPL at 190, stop 185, breakout trade'}
              />
              <p className="text-xs text-ink-secondary/60 mt-1">Cmd+Enter to parse</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                'bought .51 sold .65', '100 contracts', 'TFSA', 'faded RSI', 'earnings play', 'YOLO',
              ].map(hint => (
                <button
                  key={hint}
                  type="button"
                  onClick={() => setNlText(p => p + (p.endsWith(' ') ? '' : ' ') + hint + ' ')}
                  className="text-xs px-2.5 py-1 rounded-full border border-glass-border text-ink-secondary hover:border-forest/40 hover:text-forest transition-all"
                >
                  + {hint}
                </button>
              ))}
            </div>

            {err && <p className="text-brick text-sm">{err}</p>}

            <button
              onClick={parseText}
              disabled={!nlText.trim() || loading}
              className="w-full py-2.5 rounded-xl bg-forest text-white text-sm font-medium disabled:opacity-40 hover:bg-forest/90 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={14} className="animate-spin" /> Parsing…</> : 'Parse trade'}
            </button>
          </motion.div>
        )}

        {/* Parse result preview */}
        {parsed && (
          <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p className="text-xs text-ink-secondary mb-3">Review what was extracted — you can edit everything in the next step.</p>
            <ParsePreview
              parsed={parsed}
              onConfirm={() => onConfirm(parsed)}
              onRetry={() => { reset(); }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
