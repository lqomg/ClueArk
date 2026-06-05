import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Radar, Settings2 } from 'lucide-react';
import { getMonitor, listMonitorFeed } from '@/api/monitors';
import type { FeedItem, Monitor } from '@/types/models';
import { useAppTopBar } from '@/components/layout/AppTopBar';
import { TopBarCountPill } from '@/components/layout/TopBarCountPill';
import { Button, Segmented, Timeline } from '@/components/ui';
import { MonitorTimelineItem } from '@/pages/app/monitors/components/MonitorTimelineItem';

type RecentHoursPreset = '24' | '72' | '168' | '720';

interface ListResponse {
  items: Array<FeedItem & { relevanceScore?: number }>;
  total: number;
  page: number;
  pageSize: number;
  recentHours: number;
}

export function MonitorDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [recentHours, setRecentHours] = useState<RecentHoursPreset>('720');
  const [list, setList] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const listReqSeq = useRef(0);

  const windowOptions = useMemo(
    () =>
      [
        { value: '24' as const, label: t('monitors.window24h') },
        { value: '72' as const, label: t('monitors.window3d') },
        { value: '168' as const, label: t('monitors.window7d') },
        { value: '720' as const, label: t('monitors.window30d') },
      ],
    [t],
  );

  useEffect(() => {
    if (!id) return;
    listReqSeq.current += 1;
    setList(null);
    setListError(null);
    setPage(1);
    setMetaError(null);
    void (async () => {
      try {
        const m = await getMonitor(id);
        setMonitor(m);
      } catch (e) {
        setMetaError(e instanceof Error ? e.message : t('common.loadFailed'));
        setMonitor(null);
      }
    })();
  }, [id, t]);

  const feedQuery = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('pageSize', '30');
    p.set('recentHours', recentHours);
    return `?${p.toString()}`;
  }, [page, recentHours]);

  const loadList = useCallback(async () => {
    if (!id) return;
    const seq = ++listReqSeq.current;
    setLoading(true);
    setListError(null);
    try {
      const res = await listMonitorFeed(id, feedQuery);
      if (seq !== listReqSeq.current) return;
      setList({
        items: res.items,
        total: res.total,
        page: res.page,
        pageSize: res.pageSize,
        recentHours: res.recentHours,
      });
    } catch (e) {
      if (seq !== listReqSeq.current) return;
      setListError(e instanceof Error ? e.message : t('common.loadFailed'));
      setList(null);
    } finally {
      if (seq === listReqSeq.current) setLoading(false);
    }
  }, [id, feedQuery, t]);

  useEffect(() => {
    if (!id) return;
    const timer = window.setTimeout(() => void loadList(), 200);
    return () => window.clearTimeout(timer);
  }, [id, loadList]);

  const isEmpty = !loading && list && list.items.length === 0;
  const totalPages = list ? Math.max(1, Math.ceil(list.total / list.pageSize)) : 1;

  useAppTopBar(
    () =>
      !id ? (
        <span className="text-sm text-slate-500">{t('monitors.invalidId')}</span>
      ) : (
        <div className="flex min-w-0 w-full items-center justify-between gap-3">
          <div className="min-w-0 flex-1 pr-2">
            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] text-slate-500">
              <Link to="/app/monitors/manage" className="shrink-0 hover:text-ark-accent">
                {t('monitors.manage')}
              </Link>
              <span aria-hidden>/</span>
              <Link
                to={`/app/monitors?monitor=${encodeURIComponent(id!)}`}
                className="min-w-0 max-w-[10rem] truncate hover:text-ark-accent sm:max-w-[14rem]"
              >
                {t('monitors.intel')}
              </Link>
              <span aria-hidden>/</span>
              <span className="shrink-0 text-slate-600">{t('monitors.timeline')}</span>
              <TopBarCountPill value={list?.total ?? '—'} className="shrink-0" />
            </div>
            <h1 className="mt-0.5 truncate text-sm font-black tracking-tight text-white md:text-base">
              {monitor?.title ?? (metaError ? '—' : t('common.loading'))}
            </h1>
          </div>
          <div className="flex shrink-0 flex-nowrap items-center gap-2">
            <Link
              to={`/app/monitors/${id}/settings`}
              className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-ark-border px-2.5 py-1.5 text-[11px] font-medium text-slate-300 transition hover:border-ark-accent/50 hover:text-ark-accent"
            >
              <Settings2 size={13} />
              {t('monitors.settings')}
            </Link>
            <div className="flex items-center gap-1.5">
              <span className="hidden shrink-0 text-[10px] font-medium text-slate-500 sm:inline">
                {t('monitors.timeWindow')}
              </span>
              <Segmented<RecentHoursPreset>
                visual="panel"
                value={recentHours}
                onChange={(h) => {
                  setRecentHours(h);
                  setPage(1);
                }}
                options={windowOptions}
              />
            </div>
          </div>
        </div>
      ),
    [id, monitor?.title, metaError, list?.total, recentHours, t, windowOptions],
  );

  if (!id) {
    return <p className="text-sm text-slate-500">{t('monitors.invalidId')}</p>;
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-3">
      {metaError ? <p className="shrink-0 text-sm text-red-400">{metaError}</p> : null}
      {listError ? <p className="shrink-0 text-sm text-red-400">{listError}</p> : null}

      <div id="monitor-feed-scroll" className="min-h-0 flex-1 overflow-y-auto">
        {monitor?.description ? (
          <p className="border-b border-white/[0.06] px-1 py-2 text-xs leading-relaxed text-slate-500">
            {monitor.description}
          </p>
        ) : null}
        {loading && !list ? (
          <div className="p-8 text-center text-sm text-slate-500">{t('common.loading')}</div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center text-slate-500">
            <Radar className="size-10 opacity-40" strokeWidth={1.25} />
            <p className="text-sm">{t('monitors.noItems')}</p>
          </div>
        ) : (
          <Timeline className="py-3">
            {(list?.items ?? []).map((it, idx, arr) => (
              <MonitorTimelineItem
                key={it.id}
                monitorId={id}
                item={it}
                isLast={idx === arr.length - 1}
              />
            ))}
          </Timeline>
        )}
      </div>

      {list && list.total > list.pageSize ? (
        <div className="flex shrink-0 items-center justify-center gap-3 pb-2 text-xs text-slate-500">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {t('common.prevPage')}
          </Button>
          <span>{t('common.pageOf', { page, total: totalPages })}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading || page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {t('common.nextPage')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
