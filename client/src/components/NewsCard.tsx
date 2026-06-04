import { ArrowUpRight, Newspaper } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ResearchReport } from '../types';
import { fmtRelative, sentimentPill } from '../lib/helpers';

interface Props {
  data: ResearchReport;
}

export default function NewsCard({ data }: Props) {
  if (!data.news.length) return null;
  return (
    <div className="card animate-fadeUp animate-delay-4">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="eyebrow mb-1">Latest news</div>
          <h3 className="section-title">Headlines</h3>
        </div>
        <Link
          to={`/news?ticker=${data.ticker}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-cream-tint px-3 py-1.5 text-xs font-medium text-ink-secondary hover:text-ink hover:bg-white transition"
          title={`All ${data.ticker} news`}
        >
          <Newspaper size={13} strokeWidth={1.8} />
          All {data.ticker} news
        </Link>
      </div>

      <div className="space-y-0">
        {data.news.slice(0, 5).map((n, i, arr) => {
          const sent = sentimentPill(n.sentiment);
          return (
            <a
              key={n.id}
              href={n.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`group block py-4 ${i < arr.length - 1 ? 'border-b border-hairline' : ''}`}
            >
              <div className="flex items-center gap-2 text-xs text-ink-tertiary mb-1">
                {n.publisher && <span className="text-ink-secondary font-medium">{n.publisher}</span>}
                {n.publisher && <span>·</span>}
                <span>{fmtRelative(n.publishedAt)}</span>
                {n.sentiment && <span className={`pill ${sent.cls} ml-1`}>{sent.label}</span>}
              </div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className="text-[15px] md:text-base font-medium leading-snug group-hover:text-forest transition">
                    {n.title}
                  </h4>
                  {n.description && (
                    <p className="text-sm text-ink-secondary line-clamp-2 mt-1.5 leading-relaxed">{n.description}</p>
                  )}
                </div>
                <ArrowUpRight
                  size={18}
                  className="flex-shrink-0 text-ink-tertiary group-hover:text-forest group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition mt-0.5"
                />
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
