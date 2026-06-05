import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FeedItem } from '@/types/models';
import { TimelineItem } from '@/components/ui';
import { formatFeedCardHeaderRelative, normalizeUserTimeZone } from '@/lib/datetime';
import { useAuthStore } from '@/stores/authStore';
import { timelineStampNode } from '../utils';
import { MonitorClusterDrawer } from './MonitorClusterDrawer';

export type MonitorTimelineFeedItem = FeedItem & { relevanceScore?: number };

const SUMMARY_COLLAPSED_LINES = 3;

function summaryLikelyOverflow(summary: string): boolean {
  const text = summary.trim();
  if (text.length > 280) return true;
  const lines = text.split(/\n/).length;
  return lines > SUMMARY_COLLAPSED_LINES;
}

export function MonitorTimelineItem({
  monitorId,
  item: it,
  isLast,
}: {
  monitorId: string;
  item: MonitorTimelineFeedItem;
  isLast: boolean;
}) {
  const { t } = useTranslation();
  const tz = useAuthStore((s) => normalizeUserTimeZone(s.user?.timeZone));
  const header = formatFeedCardHeaderRelative(it.publishedAt, tz);
  const [clusterOpen, setClusterOpen] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  const nSrc = it.clusterSourceCount ?? 1;
  const nItem = it.clusterItemCount ?? 1;
  const cluster = useMemo(() => {
    if (!it.clusterId || nItem <= 1) return { text: '', show: false };
    if (nSrc > 1) {
      return { text: t('monitors.clusterMoreSources', { count: nSrc - 1 }), show: true };
    }
    return { text: t('monitors.clusterMoreItems', { count: nItem - 1 }), show: true };
  }, [it.clusterId, nItem, nSrc, t]);

  const reasonPending = it.llmStatus === 'pending' || it.llmStatus === 'processing';
  const reasonText = it.recommendReason?.trim() ?? '';

  const summaryText = it.summary?.trim() ?? '';
  const showSummaryToggle = useMemo(() => summaryLikelyOverflow(summaryText), [summaryText]);

  return (
    <>
      <TimelineItem
        isLast={isLast}
        stamp={timelineStampNode(it.publishedAt, tz)}
        className="rounded-xl transition hover:bg-white/[0.005]"
      >
        <div className="flex flex-col gap-2 pr-1 sm:pr-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 sm:text-xs">
            <span className="font-medium text-slate-400">{it.sourceDisplayName}</span>
            <span className="text-slate-700">·</span>
            <span className="font-mono tabular-nums text-slate-400">{header.display}</span>
            {header.absolute ? (
              <span className="hidden font-mono text-slate-600 sm:inline" title={header.absolute}>
                {header.absolute}
              </span>
            ) : null}
            {typeof it.relevanceScore === 'number' ? (
              <span className="font-mono text-slate-600">
                {t('monitors.relevanceLabel', { score: it.relevanceScore.toFixed(2) })}
              </span>
            ) : null}
          </div>
          <h3 className="text-[15px] font-semibold leading-snug text-slate-100 sm:text-base">
            {it.link ? (
              <a
                href={it.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-100 underline decoration-slate-600/50 underline-offset-2 transition hover:text-white hover:decoration-slate-400"
              >
                {it.title}
              </a>
            ) : (
              it.title
            )}
          </h3>
          {summaryText ? (
            <div className="min-w-0">
              <p
                className={[
                  'break-words text-[13px] leading-relaxed text-slate-400 sm:text-sm',
                  !summaryExpanded && showSummaryToggle ? 'line-clamp-3' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {summaryText}
              </p>
              {showSummaryToggle ? (
                <button
                  type="button"
                  className="mt-1 text-[12px] text-ark-accent underline decoration-ark-accent/40 underline-offset-2 hover:text-white"
                  onClick={() => setSummaryExpanded((v) => !v)}
                >
                  {summaryExpanded ? t('common.collapse') : t('common.expandFull')}
                </button>
              ) : null}
            </div>
          ) : null}
          {reasonText ? (
            <div className="rounded-lg border border-emerald-500/25 bg-emerald-950/20 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600/90">
                {t('notifications.recommendReason')}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-emerald-100/90 sm:text-sm">{reasonText}</p>
            </div>
          ) : reasonPending ? (
            <p className="text-[11px] text-slate-600">{t('notifications.reasonPending')}</p>
          ) : null}
          {it.tags?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {it.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-slate-500"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          {cluster.show && it.clusterId ? (
            <p className="text-[12px] text-slate-500">
              {cluster.text}
              <button
                type="button"
                className="ml-1.5 text-ark-accent underline decoration-ark-accent/40 underline-offset-2 hover:text-white"
                onClick={() => setClusterOpen(true)}
              >
                {t('common.view')}
              </button>
            </p>
          ) : null}
        </div>
      </TimelineItem>
      {it.clusterId ? (
        <MonitorClusterDrawer
          monitorId={monitorId}
          clusterId={it.clusterId}
          open={clusterOpen}
          onClose={() => setClusterOpen(false)}
        />
      ) : null}
    </>
  );
}
