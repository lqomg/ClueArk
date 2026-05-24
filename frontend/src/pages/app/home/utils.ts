import type { MonitorWithListMetrics } from '@/types/models';
import type { HomeDashboardSummary, HomeFeedItem } from './types';

export const HOME_FEED_PAGE_SIZE = 40;
export const HOME_FEED_RECENT_HOURS = 168;

export function computeDashboardSummary(monitors: MonitorWithListMetrics[]): HomeDashboardSummary {
  const monitorCount = monitors.length;
  let todayIntel = 0;
  let readyCount = 0;
  const trendByDate = new Map<string, number>();

  for (const m of monitors) {
    const metrics = m.metrics;
    if (metrics) {
      todayIntel += metrics.newLast24h ?? 0;
      for (const p of metrics.trend ?? []) {
        trendByDate.set(p.date, (trendByDate.get(p.date) ?? 0) + p.count);
      }
    }
    if (m.snapshotStatus === 'ready') readyCount += 1;
  }

  const trendSpark = [...trendByDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([, count]) => count);

  let trendDeltaPct: number | null = null;
  if (trendSpark.length >= 2) {
    const last = trendSpark[trendSpark.length - 1] ?? 0;
    const prev = trendSpark[trendSpark.length - 2] ?? 0;
    if (prev > 0) {
      trendDeltaPct = ((last - prev) / prev) * 100;
    } else if (last > 0) {
      trendDeltaPct = 100;
    } else {
      trendDeltaPct = 0;
    }
  }

  const snapshotReadyRate =
    monitorCount > 0 ? Math.round((readyCount / monitorCount) * 1000) / 10 : null;

  return {
    monitorCount,
    todayIntel,
    snapshotReadyRate,
    trendSpark,
    trendDeltaPct,
  };
}

/** 相关度 0～1 → mockup 式「重要度」整数 */
export function importanceScore(relevanceScore?: number): number | null {
  if (typeof relevanceScore !== 'number' || Number.isNaN(relevanceScore)) return null;
  return Math.min(100, Math.max(0, Math.round(relevanceScore * 100)));
}

export function feedItemTag(item: HomeFeedItem): string {
  const tag = item.tags?.[0]?.trim();
  if (tag) return tag;
  const title = item.monitorTitle.trim();
  if (title.length <= 12) return title;
  return `${title.slice(0, 11)}…`;
}
