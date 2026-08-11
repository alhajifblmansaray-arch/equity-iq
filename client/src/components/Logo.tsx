import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  /** Render the mark only, for callers that supply their own link. */
  asLink?: boolean;
}

/**
 * Wordmark. By default it links home: the portfolio when signed in, the
 * marketing page when not, so clicking it always lands somewhere useful.
 */
export default function Logo({ size = 'md', asLink = true }: LogoProps) {
  const dims = { sm: 22, md: 30, lg: 40 } as const;
  const d = dims[size];
  const textClass = size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-[17px]' : 'text-[14px]';

  const mark = (
    <div className="flex items-center gap-2.5 select-none">
      {/* Custom mark - stacked bars with trend arrow */}
      <svg width={d} height={d} viewBox="0 0 32 32" fill="none" aria-hidden>
        <rect width="32" height="32" rx="9" fill="var(--brand)" />
        {/* Rising bars */}
        <rect x="5"  y="20" width="5" height="7"  rx="1.5" fill="rgba(255,255,255,0.50)" />
        <rect x="12" y="14" width="5" height="13" rx="1.5" fill="rgba(255,255,255,0.75)" />
        <rect x="19" y="8"  width="5" height="19" rx="1.5" fill="rgba(255,255,255,1.00)" />
        {/* Diagonal tick */}
        <path d="M7.5 13 L14 7 L19 10.5" stroke="rgba(255,255,255,0.88)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <circle cx="19" cy="10.5" r="1.6" fill="rgba(255,255,255,0.88)" />
      </svg>
      <span className={`font-serif ${textClass} text-ink`} style={{ letterSpacing: '-0.018em' }}>
        EquityIQ
      </span>
    </div>
  );

  return asLink ? <LinkedMark>{mark}</LinkedMark> : mark;
}

function LinkedMark({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <Link to={user ? '/portfolio' : '/'} aria-label="EquityIQ home" className="inline-flex">
      {children}
    </Link>
  );
}
