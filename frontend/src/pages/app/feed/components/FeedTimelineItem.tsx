import type { FeedItem } from '@/types/models';
import { TimelineItem } from '@/components/ui';
import { formatFeedCardHeaderRelative, normalizeUserTimeZone } from '@/lib/datetime';
import { useAuthStore } from '@/stores/authStore';
import { timelineStampNode } from '../utils';

export interface FeedTimelineItemProps {
  item: FeedItem;
  isLast: boolean;
  onOpenCluster: (clusterId: string) => void;
}

/** 大号数字：行高收紧，避免把整行 flex 顶歪 */
const numAccent =
  'inline-flex shrink-0 items-center tabular-nums text-ark-accent font-bold leading-none';

export function FeedTimelineItem({ item: it, isLast, onOpenCluster }: FeedTimelineItemProps) {
  const tz = useAuthStore((s) => normalizeUserTimeZone(s.user?.timeZone));
  const n = it.clusterItemCount ?? 1;
  const srcCount = it.clusterSourceCount ?? 1;
  const merged = n > 1;
  const multiSource = merged && srcCount > 1;

  const header = formatFeedCardHeaderRelative(it.publishedAt, tz);
  const headerDateTime = it.publishedAt;

  return (
    <TimelineItem
      isLast={isLast}
      stamp={timelineStampNode(it.publishedAt, tz)}
      className="rounded-xl transition hover:bg-white/[0.005]"
    >
      <div className="flex flex-col gap-2 pr-1 sm:pr-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[11px]">
          <span className="rounded-md bg-white/5 px-2 py-0.5 font-medium text-slate-400">
            {it.sourceDisplayName || '未知信源'}
          </span>
          {headerDateTime ? (
            <time
              dateTime={headerDateTime}
              title={header.absolute || undefined}
              className="text-slate-600"
            >
              {header.display}
            </time>
          ) : (
            <span className="text-slate-600">{header.display}</span>
          )}
        </div>

        <a
          href={it.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-base font-bold leading-snug text-white hover:text-ark-accent"
        >
          {it.title}
        </a>
        {it.summary ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-slate-400">{it.summary}</p>
        ) : null}
        {it.tags?.length ? (
          <div className="flex flex-wrap gap-1.5">
            {it.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-slate-400"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        {it.recommendReason ? (
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/[0.07] px-3 py-2 text-xs leading-relaxed text-emerald-100/90">
            <span className="font-semibold text-emerald-400/95">推荐理由 · </span>
            {it.recommendReason}
          </div>
        ) : null}

        {merged ? (
          <div className="mt-1 space-y-2 border-t border-white/[0.06] pt-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12px]">
              <span className="inline-flex min-h-0 flex-wrap items-center gap-x-0.5 rounded-md  pl-2 font-medium text-slate-400">
                {multiSource ? (
                  <>
                    <span className="shrink-0 leading-snug">另外</span>
                    <span className={numAccent}>{srcCount}</span>
                    <span className="shrink-0 leading-snug"> 个信源也报道了相同的事件</span>
                  </>
                ) : (
                  <span className="leading-snug">同一信源 · 多篇相似</span>
                )}
              </span>
              <div className="hidden h-4 w-px shrink-0 self-center bg-white/[0.08] sm:block"></div>

              {it.clusterId ? (
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center self-center text-[11px] font-semibold leading-snug text-slate-400 underline decoration-dotted hover:text-ark-accent"
                  onClick={() => onOpenCluster(it.clusterId!)}
                >
                  查看
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </TimelineItem>
  );
}
