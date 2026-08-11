import { Link } from 'react-router-dom';
import Logo from './Logo';

/**
 * Site footer. Scoped deliberately to what actually exists - every link here
 * resolves to a real page, so nothing dead-ends.
 */

const COLUMNS: Array<{ heading: string; links: Array<{ label: string; to: string; external?: boolean }> }> = [
  {
    heading: 'Product',
    links: [
      { label: 'Portfolio', to: '/portfolio' },
      { label: 'Research', to: '/dashboard' },
      { label: 'Watchlist', to: '/watchlist' },
      { label: 'Compare', to: '/compare' },
      { label: 'Alerts', to: '/alerts' },
    ],
  },
  {
    heading: 'Learn',
    links: [
      { label: 'Academy', to: '/learn' },
      { label: 'Simulator', to: '/simulator' },
      { label: 'Weekly challenge', to: '/challenge' },
      { label: 'Trade journal', to: '/journal' },
    ],
  },
  {
    heading: 'Markets',
    links: [
      { label: 'News', to: '/news' },
      { label: 'Earnings calendar', to: '/calendar' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Terms of use', to: '/terms' },
      { label: 'Privacy policy', to: '/privacy' },
      { label: 'Security', to: '/security' },
      { label: 'Risk disclosure', to: '/disclosure' },
    ],
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-hairline">
      <div className="max-w-6xl mx-auto px-6 md:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <Logo size="md" />
            <p className="text-[13px] text-ink-secondary leading-relaxed mt-3 max-w-[26ch]">
              Research and portfolio tracking for everyday investors.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <p className="text-[13px] font-semibold text-ink mb-3">{col.heading}</p>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-[13px] text-ink-secondary hover:text-ink transition">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-hairline space-y-4">
          <p className="text-[12px] text-ink-tertiary leading-relaxed max-w-3xl">
            EquityIQ provides research tools and information only. Nothing here is investment, financial, legal or tax
            advice, and no content is a recommendation to buy or sell any security. Market data is supplied by third
            parties, may be delayed, and can be inaccurate or incomplete. Investing carries risk, including loss of
            principal, and past performance does not predict future results. Decisions you make are your own.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[12px] text-ink-tertiary">© {year} EquityIQ. All rights reserved.</p>
            <div className="flex flex-wrap gap-4">
              {COLUMNS[3].links.map((l) => (
                <Link key={l.to} to={l.to} className="text-[12px] text-ink-tertiary hover:text-ink transition">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
