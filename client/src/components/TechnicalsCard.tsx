import type { ResearchReport } from '../types';
import { fmtPrice } from '../lib/helpers';

interface Props {
  data: ResearchReport;
}

export default function TechnicalsCard({ data }: Props) {
  const { rsi, macd, sma50, sma200 } = data.technicals;

  return (
    <div className="card animate-fadeUp animate-delay-2">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="eyebrow mb-1">Technicals</div>
          <h3 className="section-title">Momentum & trend</h3>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* RSI gauge — left column, matches VerdictCard layout */}
        <RSIGauge rsi={rsi} />

        {/* Right column */}
        <div className="space-y-6">
          <MACD macd={macd} />
          <MovingAverages sma50={sma50} sma200={sma200} price={data.snapshot?.price} />
        </div>
      </div>
    </div>
  );
}

function RSIGauge({ rsi }: { rsi?: number }) {
  const v = rsi ?? 50;
  const clamped = Math.max(0, Math.min(100, v));
  const angle = (clamped / 100) * 180;
  const rad = ((180 - angle) * Math.PI) / 180;
  const cx = 90;
  const cy = 90;
  const r = 70;
  const nx = cx + r * Math.cos(rad);
  const ny = cy - r * Math.sin(rad);

  const color = clamped <= 30 ? 'var(--forest)' : clamped >= 70 ? 'var(--brick)' : 'var(--amber)';
  const label = clamped <= 30 ? 'Oversold' : clamped >= 70 ? 'Overbought' : 'Neutral';
  const pillClass = clamped <= 30 ? 'pill-forest' : clamped >= 70 ? 'pill-brick' : 'pill-amber';

  // Arc path from 180° to (180 - angle)°
  const startX = cx - r;
  const startY = cy;
  const largeArc = angle > 180 ? 1 : 0;
  const arcPath = rsi == null ? '' : `M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${nx} ${ny}`;
  const trackPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  return (
    <div>
      <div className="eyebrow mb-3">Relative Strength (14d)</div>
      <div className="flex items-center gap-5">
        <svg width="180" height="110" viewBox="0 0 180 110" className="flex-shrink-0">
          <path d={trackPath} stroke="var(--hairline)" strokeWidth="10" fill="none" strokeLinecap="round" />
          {rsi != null && (
            <>
              <path d={arcPath} stroke={color} strokeWidth="10" fill="none" strokeLinecap="round" />
              <circle cx={nx} cy={ny} r="6" fill={color} />
              <circle cx={nx} cy={ny} r="3" fill="var(--surface)" />
            </>
          )}
          <text
            x="90"
            y="86"
            textAnchor="middle"
            fontFamily="DM Serif Display"
            fontSize="34"
            fill="var(--ink)"
          >
            {rsi != null ? rsi.toFixed(0) : '—'}
          </text>
        </svg>
        <div className="space-y-2">
          <span className={`pill ${pillClass} text-[11px]`}>{label}</span>
          <p className="text-[12px] text-ink-tertiary leading-relaxed max-w-[160px]">
            {clamped <= 30
              ? 'Selling may be exhausted.'
              : clamped >= 70
              ? 'Buying may be exhausted.'
              : 'Momentum is mid-range.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function MACD({ macd }: { macd?: { macd: number; signal: number; histogram: number } }) {
  return (
    <div>
      <div className="eyebrow mb-2">MACD (12,26,9)</div>
      {macd ? (
        <div className="grid grid-cols-3 gap-2">
          <MacdCell label="MACD" value={macd.macd} />
          <MacdCell label="Signal" value={macd.signal} />
          <MacdCell label="Histogram" value={macd.histogram} highlight />
        </div>
      ) : (
        <p className="text-ink-secondary italic text-sm">Not enough data.</p>
      )}
    </div>
  );
}

function MacdCell({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  const positive = value >= 0;
  const color = positive ? 'text-forest' : 'text-brick';
  return (
    <div className="rounded-2xl bg-cream-tint px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-eyebrow text-ink-tertiary">{label}</div>
      <div className={`font-medium tracking-tight1 ${highlight ? color : 'text-ink'} text-[15px]`}>
        {(positive ? '+' : '') + value.toFixed(3)}
      </div>
    </div>
  );
}

function MovingAverages({
  sma50,
  sma200,
  price,
}: {
  sma50?: number;
  sma200?: number;
  price?: number;
}) {
  const golden = sma50 != null && sma200 != null && sma50 > sma200;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="eyebrow">Moving averages</span>
        {sma50 != null && sma200 != null && (
          <span className={`pill ${golden ? 'pill-forest' : 'pill-brick'}`}>
            {golden ? 'Golden cross' : 'Death cross'}
          </span>
        )}
      </div>
      <div className="space-y-3">
        <Row label="SMA 50" value={sma50 != null ? `$${fmtPrice(sma50)}` : '—'} sub={price != null && sma50 != null ? (price > sma50 ? 'Price above' : 'Price below') : undefined} />
        <div className="hairline-divider" />
        <Row label="SMA 200" value={sma200 != null ? `$${fmtPrice(sma200)}` : '—'} sub={price != null && sma200 != null ? (price > sma200 ? 'Price above' : 'Price below') : undefined} />
      </div>
    </div>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-[13px] text-ink-secondary">{label}</div>
        {sub && <div className="text-[11px] text-ink-tertiary">{sub}</div>}
      </div>
      <div className="font-medium tracking-tight1 text-[15px]">{value}</div>
    </div>
  );
}
