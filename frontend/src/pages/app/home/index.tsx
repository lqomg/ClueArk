import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardFeed } from '@/api/dashboard';
import { listMonitors } from '@/api/monitors';
import { listNotifications } from '@/api/notifications';
import { useAppTopBar } from '@/components/layout/AppTopBar';
import { useAuthStore } from '@/stores/authStore';
import { HomeAlertList } from './components/HomeAlertList';
import { HomeFeedSection } from './components/HomeFeedSection';
import { HomeMetricCards } from './components/HomeMetricCards';
import { HomeStatusBar } from './components/HomeStatusBar';
import { HomeWelcomeHeader } from './components/HomeWelcomeHeader';
import { HomeTopBarControls } from './components/HomeTopBarControls';
import type { HomeFeedItem } from './types';
import { HOME_FEED_PAGE_SIZE, HOME_FEED_RECENT_HOURS, computeDashboardSummary } from './utils';

const SEARCH_DEBOUNCE_MS = 320;

export function HomePage() {
  const user = useAuthStore((s) => s.user);
  const displayName = user?.username?.trim() || user?.email?.split('@')[0] || '用户';

  const [monitors, setMonitors] = useState<Awaited<ReturnType<typeof listMonitors>> | null>(null);
  const [feed, setFeed] = useState<HomeFeedItem[]>([]);
  const [alerts, setAlerts] = useState<Awaited<ReturnType<typeof listNotifications>>['items']>([]);
  const [loadingMonitors, setLoadingMonitors] = useState(true);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [monitorFilter, setMonitorFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const feedReqSeq = useRef(0);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchQuery), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  const loadFeed = useCallback(async (monitorId: string | null, q: string) => {
    const seq = ++feedReqSeq.current;
    setLoadingFeed(true);
    try {
      const res = await getDashboardFeed({
        page: 1,
        pageSize: HOME_FEED_PAGE_SIZE,
        recentHours: HOME_FEED_RECENT_HOURS,
        monitorId,
        q: q.trim() || undefined,
      });
      if (seq !== feedReqSeq.current) return;
      setFeed(res.items);
    } catch (e) {
      if (seq !== feedReqSeq.current) return;
      setError(e instanceof Error ? e.message : '加载情报流失败');
      setFeed([]);
    } finally {
      if (seq === feedReqSeq.current) setLoadingFeed(false);
    }
  }, []);

  const loadBootstrap = useCallback(async () => {
    setLoadingMonitors(true);
    setLoadingAlerts(true);
    setError(null);
    try {
      const [monitorRows, notifRes] = await Promise.all([
        listMonitors('?recentHours=720'),
        listNotifications(1, 12),
      ]);
      setMonitors(monitorRows);
      setAlerts(notifRes.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
      setMonitors(null);
      setAlerts([]);
    } finally {
      setLoadingMonitors(false);
      setLoadingAlerts(false);
    }
  }, []);

  useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  useEffect(() => {
    if (loadingMonitors || !monitors?.length) return;
    void loadFeed(monitorFilter, debouncedSearch);
  }, [loadingMonitors, monitors, monitorFilter, debouncedSearch, loadFeed]);

  useAppTopBar(
    () => (
      <HomeTopBarControls
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        monitorFilter={monitorFilter}
        onMonitorFilterChange={setMonitorFilter}
        monitors={monitors ?? []}
      />
    ),
    [searchQuery, monitorFilter, monitors],
  );

  const summary = useMemo(
    () => computeDashboardSummary(monitors ?? []),
    [monitors],
  );

  if (loadingMonitors) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
        加载中…
      </div>
    );
  }

  if (!monitors?.length) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4 py-8 text-center">
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <p className="text-slate-400">暂无监控话题</p>
        <p className="max-w-md text-sm text-slate-500">
          创建第一个监控话题后，首页将展示跨话题混排的实时情报流与提醒摘要。
        </p>
        <Link
          to="/app/monitors/manage"
          className="inline-flex items-center justify-center rounded-lg bg-ark-accent px-4 py-2 text-sm font-bold text-black shadow-lg shadow-ark-accent/15 transition hover:opacity-95"
        >
          创建监控话题
        </Link>
      </div>
    );
  }

  return (
    <div className="home-page-bg flex min-h-0 flex-1 flex-col overflow-hidden">
      {error ? <p className="mb-3 shrink-0 text-sm text-red-400">{error}</p> : null}

      <HomeWelcomeHeader
        displayName={displayName}
        monitorFilter={monitorFilter}
        onMonitorFilterChange={setMonitorFilter}
        monitors={monitors}
      />

      <div className="mt-4 shrink-0">
        <HomeMetricCards
          monitorCount={summary.monitorCount}
          todayIntel={summary.todayIntel}
          trendDeltaPct={summary.trendDeltaPct}
          trendSpark={summary.trendSpark}
          snapshotReadyRate={summary.snapshotReadyRate}
        />
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row lg:items-stretch">
        <HomeFeedSection items={feed} loading={loadingFeed} />
        <HomeAlertList alerts={alerts} loading={loadingAlerts} />
      </div>

      <HomeStatusBar />
    </div>
  );
}
