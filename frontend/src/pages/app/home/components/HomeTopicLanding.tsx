import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { HomeFeedItem, HomeFeedTab, MorningBriefingResponse } from '@/types/models';
import { TopicChangeRow } from '@/pages/app/topics/components/TopicChangeRow';
import { cn } from '@/lib/cn';
import { HomeMorningBriefing } from './HomeMorningBriefing';

type Props = {
  tab: HomeFeedTab;
  items: HomeFeedItem[];
  briefing: MorningBriefingResponse | null;
  briefingLoaded: boolean;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  timeZone: string;
  readableMonitorCount: number;
  onTabChange: (tab: HomeFeedTab) => void;
  onRetry: () => void;
  onLoadMore: () => void;
  onCreateTopic: () => void;
};

export function HomeTopicLanding({
  tab,
  items,
  briefing,
  briefingLoaded,
  loading,
  loadingMore,
  hasMore,
  error,
  timeZone,
  readableMonitorCount,
  onTabChange,
  onRetry,
  onLoadMore,
  onCreateTopic,
}: Props) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isBriefing = tab === 'briefing';

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [tab]);

  useEffect(() => {
    if (isBriefing) return;
    const node = sentinelRef.current;
    const root = scrollRef.current;
    if (!node || !root || !hasMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onLoadMore();
      },
      { root, rootMargin: '240px', threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isBriefing, loading, onLoadMore, items.length]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white text-neutral-900">
      <div className="shrink-0 px-6 pt-10 sm:px-8 sm:pt-12">
        <div className="mx-auto w-full max-w-2xl">
          <div
            className="flex items-end gap-5"
            role="tablist"
            aria-label={`${t('home.tabBriefing')} / ${t('home.tabSubscribed')} / ${t('home.tabRecommended')}`}
          >
            {(
              [
                ['briefing', 'home.tabBriefing'],
                ['subscribed', 'home.tabSubscribed'],
                ['recommended', 'home.tabRecommended'],
              ] as const
            ).map(([id, labelKey]) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onTabChange(id)}
                  className={cn(
                    'border-b pb-1 text-[14px] leading-none transition-colors',
                    active
                      ? 'border-neutral-900 font-semibold text-neutral-900'
                      : 'border-transparent font-normal text-neutral-400 hover:text-neutral-700',
                  )}
                >
                  {t(labelKey)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-6 pb-24 pt-6 sm:px-8">
          <main className="mx-auto w-full min-w-0 max-w-2xl">
            {error ? (
              <div
                className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50/80 px-4 py-3 text-[13px] text-red-700"
                role="alert"
              >
                <span>{error}</span>
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline"
                >
                  <RefreshCw className="size-3.5" aria-hidden />
                  {t('common.refreshing')}
                </button>
              </div>
            ) : null}

            {isBriefing ? (
              <HomeMorningBriefing
                data={briefing}
                loading={loading && !briefingLoaded}
                timeZone={timeZone}
                onCreateTopic={onCreateTopic}
                onGoFollowing={() => onTabChange('subscribed')}
              />
            ) : (
              <section aria-busy={loading}>
                {loading ? (
                  <div className="space-y-8">
                    {Array.from({ length: 4 }, (_, i) => (
                      <div key={i} className="space-y-3 py-2">
                        <div className="h-3 w-24 animate-pulse rounded bg-neutral-100" />
                        <div className="h-5 w-[80%] animate-pulse rounded bg-neutral-100" />
                        <div className="h-4 w-full animate-pulse rounded bg-neutral-100" />
                      </div>
                    ))}
                  </div>
                ) : items.length ? (
                  <>
                    <div>
                      {items.map((item) => (
                        <div key={`${tab}:${item.id}`} className="relative">
                          <p className="mb-1 pl-6 text-[12px] text-neutral-400">
                            {item.monitorTitle}
                            {item.unread ? (
                              <span className="ml-2 text-[11px] font-medium text-neutral-700">
                                {t('home.unread')}
                              </span>
                            ) : null}
                          </p>
                          <TopicChangeRow
                            title={item.title}
                            summary={item.summary}
                            timelineAt={item.occurredAt || item.timelineAt}
                            lastMeaningfulAt={item.lastMeaningfulAt ?? null}
                            showSubstantiveUpdate={Boolean(item.lastMeaningfulAt)}
                            sourceName={
                              item.primarySourceDisplayName ||
                              item.sourcePreviews?.[0]?.displayName ||
                              ''
                            }
                            sourceAvatarUrl={
                              item.primarySourceAvatarUrl ??
                              item.sourcePreviews?.[0]?.avatarUrl ??
                              null
                            }
                            href={`/app/topics/${encodeURIComponent(item.monitorId)}/developments/${encodeURIComponent(item.id)}`}
                            primaryEvidence={item.primaryEvidence ?? null}
                            evidenceCount={item.evidenceCount}
                          />
                        </div>
                      ))}
                    </div>
                    <div ref={sentinelRef} className="h-8" aria-hidden />
                    {loadingMore ? (
                      <p className="py-4 text-center text-[12px] text-neutral-400">
                        {t('common.loading')}
                      </p>
                    ) : null}
                    {!hasMore ? (
                      <p className="py-4 text-center text-[12px] text-neutral-300">
                        {t('home.feedEnd')}
                      </p>
                    ) : null}
                  </>
                ) : tab === 'subscribed' && readableMonitorCount > 0 ? (
                  <div className="py-16">
                    <p className="text-[17px] font-medium text-neutral-900">
                      {t('home.dutyEmptyTitle')}
                    </p>
                    <p className="mt-3 max-w-md text-[14px] leading-relaxed text-neutral-400">
                      {t('home.feedWatchingSummary', { count: readableMonitorCount })}
                    </p>
                  </div>
                ) : tab === 'subscribed' ? (
                  <div className="py-16">
                    <p className="text-[17px] font-medium text-neutral-900">
                      {t('home.feedEmptyTitle')}
                    </p>
                    <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-neutral-400">
                      {t('home.feedEmptyBody')}
                    </p>
                    <Link
                      to="/app/my-topics"
                      className="mt-8 inline-flex items-center rounded-lg bg-neutral-900 px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-neutral-800"
                    >
                      {t('home.createTopic')}
                    </Link>
                  </div>
                ) : (
                  <div className="py-16">
                    <p className="text-[17px] font-medium text-neutral-900">
                      {t('home.recommendedEmptyTitle')}
                    </p>
                    <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-neutral-400">
                      {t('home.recommendedEmptyBody')}
                    </p>
                  </div>
                )}
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
