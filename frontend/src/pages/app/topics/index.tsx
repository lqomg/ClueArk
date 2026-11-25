import { ArrowLeft, Settings2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listMonitorDevelopments } from '@/api/developments';
import { getMonitor, getMonitorCreateStatus } from '@/api/monitors';
import type { Monitor, MonitorDevelopment } from '@/types/models';
import { useAppTopBar } from '@/components/layout/AppTopBar';
import { TopicChangeRow } from './components/TopicChangeRow';
import {
  myTopicsPath,
  topicDevelopmentPath,
  topicFeedPath,
  topicSettingsPath,
} from './paths';
import {
  developmentHasSubstantiveUpdate,
  sortTopicDevelopments,
} from './topicTimeline.util';

export function TopicReadPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [developments, setDevelopments] = useState<MonitorDevelopment[] | null>(null);
  const [developmentError, setDevelopmentError] = useState<string | null>(null);
  const [createStatus, setCreateStatus] = useState<Awaited<
    ReturnType<typeof getMonitorCreateStatus>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setDevelopmentError(null);
    try {
      const [monitorResult, developmentResult] = await Promise.allSettled([
        getMonitor(id),
        listMonitorDevelopments(id, { page: 1, pageSize: 40, recentHours: 2160 }),
      ]);
      if (monitorResult.status === 'rejected') {
        throw monitorResult.reason instanceof Error
          ? monitorResult.reason
          : new Error(t('common.loadFailed'));
      }
      setMonitor(monitorResult.value);
      if (developmentResult.status === 'fulfilled') {
        setDevelopments(developmentResult.value.items);
      } else {
        setDevelopments([]);
        setDevelopmentError(
          developmentResult.reason instanceof Error
            ? developmentResult.reason.message
            : t('common.loadFailed'),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.loadFailed'));
      setMonitor(null);
      setDevelopments([]);
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!id || !monitor || monitor.createStatus !== 'processing') return;
    let cancelled = false;
    const tick = async () => {
      try {
        const status = await getMonitorCreateStatus(id);
        if (cancelled) return;
        setCreateStatus(status);
        if (status.createStatus !== 'processing') {
          void load();
        }
      } catch {
        /* ignore */
      }
    };
    void tick();
    const timer = window.setInterval(() => void tick(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [id, load, monitor]);

  const timeline = useMemo(
    () => (developments?.length ? sortTopicDevelopments(developments) : []),
    [developments],
  );

  useAppTopBar(
    () =>
      !monitor ? (
        <span className="text-sm text-neutral-500">{loading ? t('common.loading') : t('common.loadFailed')}</span>
      ) : (
        <div className="flex min-w-0 w-full items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] text-neutral-500">
              <Link to={myTopicsPath()} className="shrink-0 hover:text-neutral-900">
                {t('nav.myTopics')}
              </Link>
              <span aria-hidden>/</span>
              <span className="truncate text-neutral-500">{t('topic.changesTitle')}</span>
            </div>
            <h1 className="mt-0.5 truncate text-sm font-black tracking-tight text-neutral-900 md:text-base">
              {monitor.title}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to={topicFeedPath(id)}
              className="hidden rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[11px] text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-900 sm:inline"
            >
              {t('topic.legacyFeed')}
            </Link>
            <Link
              to={topicSettingsPath(id)}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[11px] font-medium text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900"
            >
              <Settings2 size={13} />
              {t('monitors.settings')}
            </Link>
          </div>
        </div>
      ),
    [monitor, loading, id, t],
  );

  if (loading && !monitor) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-neutral-500">
        {t('common.loading')}
      </div>
    );
  }

  if (error || !monitor) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-start justify-center gap-4 px-2">
        <p className="text-sm text-red-600">{error || t('common.loadFailed')}</p>
        <button
          type="button"
          onClick={() => navigate(myTopicsPath())}
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t('nav.myTopics')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {monitor.createStatus === 'processing' || createStatus?.createStatus === 'processing' ? (
        <p className="mb-3 shrink-0 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
          {t('topic.preparing')}
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-6">
        {monitor.description ? (
          <p className="mb-4 max-w-3xl text-sm leading-6 text-neutral-500">{monitor.description}</p>
        ) : null}

        <section>
          <div className="flex items-baseline justify-between gap-3 border-b border-neutral-200 pb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              {t('topic.changesTitle')}
            </h2>
            {developments?.length ? (
              <span className="text-[11px] tabular-nums text-neutral-400">{developments.length}</span>
            ) : null}
          </div>

          {developments === null ? (
            <div className="mt-5 space-y-3">
              <div className="h-20 animate-pulse rounded-xl bg-neutral-100" />
              <div className="h-20 animate-pulse rounded-xl bg-neutral-100" />
            </div>
          ) : timeline.length ? (
            <div className="relative mt-1">
              <div
                className="absolute bottom-3 left-0 top-3 w-px -translate-x-1/2 bg-ark-border"
                aria-hidden
              />
              {timeline.map((item) => {
                const evidenceCount = item.evidenceItemIds?.length ?? 0;
                return (
                  <TopicChangeRow
                    key={item.id}
                    title={item.title}
                    summary={item.summary || item.whyItMatters}
                    timelineAt={item.occurredAt || item.timelineAt || item.createdAt || ''}
                    lastMeaningfulAt={item.lastMeaningfulAt}
                    showSubstantiveUpdate={developmentHasSubstantiveUpdate(item)}
                    sourceName={
                      item.primarySourceDisplayName ?? item.sourcePreviews?.[0]?.displayName ?? ''
                    }
                    sourceAvatarUrl={
                      item.primarySourceAvatarUrl ?? item.sourcePreviews?.[0]?.avatarUrl ?? null
                    }
                    href={topicDevelopmentPath(id, item.id)}
                    primaryEvidence={item.primaryEvidence}
                    evidenceCount={evidenceCount}
                  />
                );
              })}
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              <p className="text-sm leading-6 text-neutral-500">{t('topic.noChanges')}</p>
              <p className="text-xs text-neutral-400">{t('topic.noChangesHint')}</p>
              <Link
                to={topicSettingsPath(id)}
                className="inline-flex text-sm text-neutral-800 underline-offset-4 hover:underline"
              >
                {t('topic.openSettings')}
              </Link>
            </div>
          )}

          {developmentError ? (
            <p className="mt-4 text-xs text-red-600">{developmentError}</p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
