import { useCurrency } from '../contexts/CurrencyContext';
import type { Currency } from '../types';

const OPTIONS: Array<{ code: Currency; flag: string }> = [
  { code: 'CAD', flag: '🇨🇦' },
  { code: 'USD', flag: '🇺🇸' },
];

/**
 * Segmented CAD/USD switch. CAD sits first because it is the reporting default —
 * USD is the opt-in view.
 */
export default function CurrencyToggle({ compact = false }: { compact?: boolean }) {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="tab-rail !p-0.5" role="group" aria-label="Display currency">
      {OPTIONS.map((o) => {
        const active = currency === o.code;
        return (
          <button
            key={o.code}
            onClick={() => setCurrency(o.code)}
            aria-selected={active}
            aria-label={`Show values in ${o.code}`}
            className={`tab-pill ${compact ? '!px-2.5 !py-1 !text-[12px]' : '!px-3 !py-1.5 !text-[12px]'}`}
          >
            <span aria-hidden className="text-[13px] leading-none">{o.flag}</span>
            <span className="font-semibold tracking-tight">{o.code}</span>
          </button>
        );
      })}
    </div>
  );
}
