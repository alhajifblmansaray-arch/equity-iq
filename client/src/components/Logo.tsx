import { TrendingUp } from 'lucide-react';

export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const icon = size === 'lg' ? 24 : size === 'md' ? 18 : 14;
  const box = size === 'lg' ? 'w-10 h-10' : size === 'md' ? 'w-8 h-8' : 'w-6 h-6';
  const text = size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-xl' : 'text-base';
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`${box} rounded-xl flex items-center justify-center`}
        style={{ background: 'var(--forest)' }}
      >
        <TrendingUp size={icon} color="var(--cream)" strokeWidth={2.4} />
      </span>
      <span className={`font-serif ${text} tracking-tight1 text-ink`}>EquityIQ</span>
    </div>
  );
}
