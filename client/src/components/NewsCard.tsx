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
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="eyebrow mb-1">Latest news</div>
          <h3 className="section-title">Headlines</h3>
        </div>
        <Link
          to={`/news?ticker=${data.ticker}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-cream-tint px-3 py-1.5 text-xs font-medium text-ink-secondary hover:text-ink hover:bg-white transition flex-shrink-0"
          title={`All ${data.ticker} news`}
        >
          <Newspaper size={13} strokeWidth={1.8} />
          All {data.ticker} news
        </Link>
      </div>

      <div>
        {data.news.slice(0, 5).map((n, i, arr) => {
          const sent = sentimentPill(n.sentiment);
          return (
            <a
              key={n.id}
              href={n.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`group block py-5 ${i < arr.length - 1 ? 'border-b border-hairline' : 'pb-0'} ${
                i === 0 ? 'pt-0' : ''
              }`}
            >
              <div className="flex gap-4">
                {n.imageUrl && (
                  <img
                    src={n.imageUrl}
                    alt=""
                    loading="lazy"
                    className="hidden sm:block flex-shrink-0 w-24 h-24 rounded-2xl object-cover bg-cream-tint"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-ink-tertiary mb-1.5 flex-wrap">
                    {n.publisher && (
                      <span className="text-ink-secondary font-medium truncate max-w-[160px]">
                        {n.publisher}
                      </span>
                    )}
                    {n.publisher && <span>·</span>}
                    <span>{fmtRelative(n.publishedAt)}</span>
                    {n.sentiment && (
                      <span className={`pill ${sent.cls} ml-0.5 text-[10px] !py-0.5`}>{sent.label}</span>
                    )}
                  </div>
                  <h4 className="text-[15px] md:text-base font-medium leading-snug tracking-tight1 group-hover:text-forest transition">
                    {n.title}
                  </h4>
                  {n.description && (
                    <p className="text-sm text-ink-secondary line-clamp-2 mt-1.5 leading-relaxed">
                      {n.description}
                    </p>
                  )}
                </div>
                <ArrowUpRight
                  size={16}
                  className="flex-shrink-0 text-ink-tertiary group-hover:text-forest group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition mt-1"
                />
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
