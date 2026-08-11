import type { ResearchReport } from '../types';
import { fmtCompact, fmtPct, fmtPrice } from '../lib/helpers';

interface Props {
  data: ResearchReport;
}

export default function ValuationCard({ data }: Props) {
  const v = data.valuation;
  if (!v) return null;
  const cells: Array<[string, string]> = [
    ['P/E (TTM)', v.peRatio != null ? v.peRatio.toFixed(2) + '×' : '-'],
    ['Forward P/E', v.forwardPE != null ? v.forwardPE.toFixed(2) + '×' : '-'],
    ['PEG', v.pegRatio != null ? v.pegRatio.toFixed(2) : '-'],
    ['EV/EBITDA', v.evToEbitda != null ? v.evToEbitda.toFixed(2) + '×' : '-'],
    ['P/B', v.priceToBook != null ? v.priceToBook.toFixed(2) + '×' : '-'],
    ['P/S', v.priceToSales != null ? v.priceToSales.toFixed(2) + '×' : '-'],
    ['EPS (TTM)', v.eps != null ? '$' + v.eps.toFixed(2) : '-'],
    ['Beta', v.beta != null ? v.beta.toFixed(2) : '-'],
    ['Dividend yield', v.dividendYield != null ? fmtPct(v.dividendYield * 100) : '-'],
    ['Profit margin', v.profitMargin != null ? fmtPct(v.profitMargin * 100) : '-'],
    ['Operating margin', v.operatingMargin != null ? fmtPct(v.operatingMargin * 100) : '-'],
    ['Return on equity', v.returnOnEquity != null ? fmtPct(v.returnOnEquity * 100) : '-'],
  ];

  return (
    <div className="card animate-fadeUp animate-delay-3">
      <div className="eyebrow mb-1">Valuation</div>
      <h3 className="section-title mb-5">Multiples & quality</h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
        {cells.map(([label, value]) => (
          <div key={label}>
            <div className="eyebrow mb-1">{label}</div>
            <div className="text-[17px] font-medium tracking-tight1">{value}</div>
          </div>
        ))}
      </div>

      {(v.fiftyTwoWeekHigh != null || v.analystTargetPrice != null) && (
        <>
          <div className="hairline-divider my-6" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
            {v.fiftyTwoWeekHigh != null && (
              <div>
                <div className="eyebrow mb-1">52-week high</div>
                <div className="text-[17px] font-medium">${fmtPrice(v.fiftyTwoWeekHigh)}</div>
              </div>
            )}
            {v.fiftyTwoWeekLow != null && (
              <div>
                <div className="eyebrow mb-1">52-week low</div>
                <div className="text-[17px] font-medium">${fmtPrice(v.fiftyTwoWeekLow)}</div>
              </div>
            )}
            {v.analystTargetPrice != null && (
              <div>
                <div className="eyebrow mb-1">Analyst target</div>
                <div className="text-[17px] font-medium">${fmtPrice(v.analystTargetPrice)}</div>
              </div>
            )}
          </div>
        </>
      )}

      {data.profile?.marketCap && (
        <div className="mt-5 text-xs text-ink-tertiary">
          Market cap {fmtCompact(data.profile.marketCap * 1_000_000)}
        </div>
      )}
    </div>
  );
}
