import { useCallback, useEffect, useMemo, useState } from 'react';
import { Newspaper } from 'lucide-react';
import { getFeedItemsByClusterId, listFeedItems } from '@/api/feed';
import { Button, Segmented, Timeline } from '@/components/ui';
import { ClusterSimilarDialog } from './components/ClusterSimilarDialog';
import { FeedTimelineItem } from './components/FeedTimelineItem';
import type { ClusterRow, ListResponse } from './types';

type RecentHoursPreset = '24' | '72' | '168';

export function FeedPage() {
  const [page, setPage] = useState(1);
  const [listMode, setListMode] = useState<'all' | 'featured'>('all');
  const [recentHours, setRecentHours] = useState<RecentHoursPreset>('24');
  const [list, setList] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clusterDetailId, setClusterDetailId] = useState<string | null>(null);
  const [clusterLoading, setClusterLoading] = useState(false);
  const [clusterRows, setClusterRows] = useState<ClusterRow[] | null>(null);
  const [clusterError, setClusterError] = useState<string | null>(null);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('pageSize', '30');
    if (listMode === 'featured') p.set('mode', 'featured');
    p.set('recentHours', recentHours);
    return `?${p.toString()}`;
  }, [page, listMode, recentHours]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const l = await listFeedItems(query);
      setList(l);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
      setList(null);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const t = window.setTimeout(() => void loadList(), 200);
    return () => window.clearTimeout(t);
  }, [loadList]);

  useEffect(() => {
    if (!clusterDetailId) return;
    const id = clusterDetailId;
    setClusterRows(null);
    setClusterError(null);
    setClusterLoading(true);
    void (async () => {
      try {
        const res = await getFeedItemsByClusterId(id);
        setClusterRows(res.items ?? []);
      } catch (e) {
        setClusterError(e instanceof Error ? e.message : '加载失败');
      } finally {
        setClusterLoading(false);
      }
    })();
  }, [clusterDetailId]);

  const closeClusterDialog = useCallback(() => {
    setClusterDetailId(null);
  }, []);

  const openCluster = useCallback((clusterId: string) => {
    setClusterDetailId(clusterId);
    setClusterRows(null);
    setClusterError(null);
  }, []);

  const isEmpty = !loading && list && list.items.length === 0;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-4">
      <ClusterSimilarDialog
        open={clusterDetailId != null}
        onClose={closeClusterDialog}
        loading={clusterLoading}
        error={clusterError}
        rows={clusterRows}
      />

      <div className="shrink-0 border-b border-ark-border bg-ark-bg pb-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="min-w-0 shrink-0">
            <h1 className="text-2xl font-black leading-none tracking-tight text-white sm:text-3xl md:text-4xl">
              动态
            </h1>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500 sm:text-xs">
              共 <span className="font-semibold tabular-nums text-ark-accent">{list?.total ?? '—'}</span> 条
              {list?.mode === 'featured' ? (
                <span className="text-slate-500"> · 当前为精选</span>
              ) : null}
            </p>
          </div>
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2 lg:justify-end">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="w-9 shrink-0 text-right text-[11px] font-medium text-slate-500 sm:w-10">视图</span>
              <Segmented
                value={listMode}
                onChange={(m) => {
                  setListMode(m);
                  setPage(1);
                }}
                options={[
                  { value: 'all', label: '全部' },
                  { value: 'featured', label: '精选' },
                ]}
              />
            </div>
            <div className="hidden h-8 w-px shrink-0 self-center bg-white/[0.08] sm:block" aria-hidden />
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="w-9 shrink-0 text-right text-[11px] font-medium text-slate-500 sm:w-10">时间</span>
              <Segmented<RecentHoursPreset>
                value={recentHours}
                onChange={(h) => {
                  setRecentHours(h);
                  setPage(1);
                }}
                options={[
                  { value: '24', label: '24小时' },
                  { value: '72', label: '3天' },
                  { value: '168', label: '7天' },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div id="feed-list-scroll" className="min-h-0 flex-1 overflow-y-auto">
        {loading && !list ? (
          <div className="p-8 text-center text-sm text-slate-500">加载中…</div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center text-slate-500">
            <Newspaper className="size-10 opacity-40" strokeWidth={1.25} />
            <p className="text-sm">
              {listMode === 'featured'
                ? '当前时间范围内暂无多信源相似合并的精选动态'
                : '暂无动态条目'}
            </p>
          </div>
        ) : (
          <Timeline className=" py-3">
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
