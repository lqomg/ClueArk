import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Radar, Settings2 } from 'lucide-react';
import { getFeedItemsByClusterId } from '@/api/feed';
import { getMonitor, listMonitorFeed } from '@/api/monitors';
import type { Monitor } from '@/types/models';
import { useAppTopBar } from '@/components/layout/AppTopBar';
import { TopBarCountPill } from '@/components/layout/TopBarCountPill';
import { Button, Segmented, Timeline } from '@/components/ui';
import { ClusterSimilarDialog } from '@/pages/app/feed/components/ClusterSimilarDialog';
import { FeedTimelineItem } from '@/pages/app/feed/components/FeedTimelineItem';
import type { ClusterRow, ListResponse } from '@/pages/app/feed/types';

type RecentHoursPreset = '24' | '72' | '168' | '720';

export function MonitorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [recentHours, setRecentHours] = useState<RecentHoursPreset>('720');
  const [list, setList] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [clusterDetailId, setClusterDetailId] = useState<string | null>(null);
  const [clusterLoading, setClusterLoading] = useState(false);
  const [clusterRows, setClusterRows] = useState<ClusterRow[] | null>(null);
  const [clusterError, setClusterError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setMetaError(null);
    void (async () => {
      try {
        const m = await getMonitor(id);
        setMonitor(m);
      } catch (e) {
        setMetaError(e instanceof Error ? e.message : '加载失败');
        setMonitor(null);
      }
    })();
  }, [id]);

  const feedQuery = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('pageSize', '30');
    p.set('recentHours', recentHours);
    return `?${p.toString()}`;
  }, [page, recentHours]);

  const loadList = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setListError(null);
    try {
      const res = await listMonitorFeed(id, feedQuery);
      setList({
        items: res.items,
        total: res.total,
        page: res.page,
        pageSize: res.pageSize,
        recentHours: res.recentHours,
      });
    } catch (e) {
      setListError(e instanceof Error ? e.message : '加载失败');
      setList(null);
    } finally {
      setLoading(false);
    }
  }, [id, feedQuery]);

  useEffect(() => {
    if (!id) return;
    const t = window.setTimeout(() => void loadList(), 200);
    return () => window.clearTimeout(t);
  }, [id, loadList]);

  useEffect(() => {
    if (!clusterDetailId) return;
    const cid = clusterDetailId;
    setClusterRows(null);
    setClusterError(null);
    setClusterLoading(true);
    void (async () => {
      try {
        const res = await getFeedItemsByClusterId(cid);
        setClusterRows(res.items ?? []);
      } catch (e) {
        setClusterError(e instanceof Error ? e.message : '加载失败');
      } finally {
        setClusterLoading(false);
      }
    })();
  }, [clusterDetailId]);

  const closeClusterDialog = useCallback(() => setClusterDetailId(null), []);
  const openCluster = useCallback((clusterId: string) => {
    setClusterDetailId(clusterId);
    setClusterRows(null);
    setClusterError(null);
  }, []);

  const isEmpty = !loading && list && list.items.length === 0;

  useAppTopBar(
    () => (
      !id ? (
        <span className="text-sm text-slate-500">无效的监控 ID</span>
      ) : (
        <div className="flex min-w-0 w-full items-center justify-between gap-3">
          <div className="min-w-0 flex-1 pr-2">
            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] text-slate-500">
              <Link to="/app/monitors/manage" className="shrink-0 hover:text-ark-accent">
                监控管理
              </Link>
              <span aria-hidden>/</span>
              <Link
                to={`/app/monitors?monitor=${encodeURIComponent(id!)}`}
                className="min-w-0 max-w-[10rem] truncate hover:text-ark-accent sm:max-w-[14rem]"
              >
                研判概览
              </Link>
              <span aria-hidden>/</span>
              <span className="shrink-0 text-slate-600">时间线</span>
              <TopBarCountPill value={list?.total ?? '—'} className="shrink-0" />
            </div>
            <h1 className="mt-0.5 truncate text-sm font-black tracking-tight text-white md:text-base">
              {monitor?.title ?? (metaError ? '—' : '加载中…')}
            </h1>
          </div>
          <div className="flex shrink-0 flex-nowrap items-center gap-2">
            <Link
              to={`/app/monitors/${id}/settings`}
              className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-ark-border px-2.5 py-1.5 text-[11px] font-medium text-slate-300 transition hover:border-ark-accent/50 hover:text-ark-accent"
            >
              <Settings2 size={13} />
              监控配置
            </Link>
            <div className="flex items-center gap-1.5">
              <span className="hidden shrink-0 text-[10px] font-medium text-slate-500 sm:inline">时间窗</span>
              <Segmented<RecentHoursPreset>
                visual="panel"
                value={recentHours}
                onChange={(h) => {
                  setRecentHours(h);
                  setPage(1);
                }}
                options={[
                  { value: '24', label: '24小时' },
                  { value: '72', label: '3天' },
                  { value: '168', label: '7天' },
                  { value: '720', label: '30天' },
                ]}
              />
            </div>
          </div>
        </div>
      )
    ),
    [id, monitor?.title, metaError, list?.total, recentHours],
  );

  if (!id) {
    return <p className="text-sm text-slate-500">无效的监控 ID</p>;
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-3">
      <ClusterSimilarDialog
        open={clusterDetailId != null}
        onClose={closeClusterDialog}
        loading={clusterLoading}
        error={clusterError}
        rows={clusterRows}
      />

      {metaError ? <p className="shrink-0 text-sm text-red-400">{metaError}</p> : null}
      {listError ? <p className="shrink-0 text-sm text-red-400">{listError}</p> : null}

      <div id="monitor-feed-scroll" className="min-h-0 flex-1 overflow-y-auto">
        {monitor?.description ? (
          <p className="border-b border-white/[0.06] px-1 py-2 text-xs leading-relaxed text-slate-500">{monitor.description}</p>
        ) : null}
        {loading && !list ? (
          <div className="p-8 text-center text-sm text-slate-500">加载中…</div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center text-slate-500">
            <Radar className="size-10 opacity-40" strokeWidth={1.25} />
            <p className="text-sm">当前时间窗内暂无达到相似度阈值的条目。</p>
          </div>
        ) : (
          <Timeline className="py-3">
            {(list?.items ?? []).map((it, idx, arr) => (
              <FeedTimelineItem
                key={it.id}
                item={it}
                isLast={idx === arr.length - 1}
                onOpenCluster={openCluster}
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
            上一页
          </Button>
          <span>
            第 {page} / {Math.max(1, Math.ceil(list.total / list.pageSize))} 页
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading || page >= Math.ceil(list.total / list.pageSize)}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </Button>
        </div>
      ) : null}
    </div>
  );
}
