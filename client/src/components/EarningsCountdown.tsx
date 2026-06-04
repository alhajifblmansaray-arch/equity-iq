import { CalendarDays } from 'lucide-react';
import type { ResearchReport } from '../types';

export default function EarningsCountdown({ data }: { data: ResearchReport }) {
  if (!data.nextEarnings) return null;
  const date = new Date(data.nextEarnings.date + 'T00:00:00');
  const now = new Date();
  const days = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return null;

  const label =
    days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} day${days === 1 ? '' : 's'}`;
  const hour =
    data.nextEarnings.hour === 'bmo'
      ? 'before open'
      : data.nextEarnings.hour === 'amc'
      ? 'after close'
      : null;

  return (
    <span
      className="pill"
      style={{ background: 'color-mix(in srgb, var(--dusty) 14%, transparent)', color: 'var(--dusty)' }}
      title={`Next earnings: ${data.nextEarnings.date}${hour ? ` (${hour})` : ''}`}
    >
      <CalendarDays size={11} />
      Earnings {label}
      {hour && <span className="opacity-75">· {hour}</span>}
    </span>
  );
}
