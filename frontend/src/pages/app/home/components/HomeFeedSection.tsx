import { Link } from 'react-router-dom';
import { ExternalLink, Radio, Sparkles } from 'lucide-react';
import type { HomeFeedItem } from '../types';
import { feedItemTag, importanceScore } from '../utils';
import { relTimeIso } from '@/lib/datetime';
import { cn } from '@/lib/cn';

export function HomeFeedCard({ item }: { item: HomeFeedItem }) {
  const score = importanceScore(item.relevanceScore);
  const tag = feedItemTag(item);
  const summary = item.summary?.trim();
  const intelTo = `/app/monitors?monitor=${encodeURIComponent(item.monitorId)}`;

  return (
    <article className="group rounded-xl border border-white/[0.06] bg-ark-surface/30 p-4 transition hover:border-white/10 hover:bg-ark-surface/45">
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 font-medium text-slate-400">
          {tag}
        </span>
        <span className="text-slate-500">{relTimeIso(item.publishedAt)}</span>
        {score != null ? (
          <span className="ml-auto rounded-md border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] font-semibold tabular-nums text-slate-300">
            重要度 {score}
          </span>
        ) : null}
      </div>

      <h3 className="mt-3 text-base font-semibold leading-snug text-white [overflow-wrap:anywhere]">
        {item.link ? (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-ark-accent"
          >
            {item.title}
          </a>
        ) : (
          item.title
        )}
      </h3>

      {summary ? (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-400 [overflow-wrap:anywhere]">
          {summary}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.05] pt-3">
        <span className="text-[11px] text-slate-500">
          {item.sourceDisplayName}
          <span className="mx-1.5 text-slate-700">·</span>
          <span className="text-slate-600">{item.monitorTitle}</span>
        </span>
        <Link
          to={intelTo}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md border border-ark-accent/25 bg-ark-accent/10 px-2.5 py-1',
            'text-[11px] font-semibold text-ark-accent transition',
            'hover:border-ark-accent/45 hover:bg-ark-accent/15',
          )}
        >
          <Sparkles className="size-3 shrink-0" aria-hidden />
          点击 AI 研判报告
          <ExternalLink className="size-3 shrink-0 opacity-70" aria-hidden />
        </Link>
      </div>
    </article>
  );
}

export function HomeFeedSection({
  items,
  loading,
}: {
  items: HomeFeedItem[];
  loading: boolean;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-ark-surface/25">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="relative flex size-2 shrink-0" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-ark-accent/25 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-ark-accent/80" />
          </span>
          <Radio className="size-4 shrink-0 text-slate-400" strokeWidth={2} aria-hidden />
          <h2 className="text-sm font-semibold text-white">实时动态</h2>
          <span className="hidden text-[11px] text-slate-500 sm:inline">AI 过滤情报流</span>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 [scrollbar-width:thin]">
        {loading ? (
          <p className="py-12 text-center text-sm text-slate-500">加载情报流…</p>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">
            暂无匹配条目，请稍候采集或前往监控管理创建话题。
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={`${item.monitorId}:${item.id}`}>
                <HomeFeedCard item={item} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
