import type { FeedItem, MonitorWithListMetrics, NotificationItem } from '@/types/models';

/** 跨监控混排后的条目（附带来源监控元数据） */
export interface HomeFeedItem extends FeedItem {
  monitorId: string;
  monitorTitle: string;
}

export interface HomeDashboardSummary {
  monitorCount: number;
  todayIntel: number;
  snapshotReadyRate: number | null;
  trendSpark: number[];
  trendDeltaPct: number | null;
}

export interface HomePageData {
  monitors: MonitorWithListMetrics[];
  feed: HomeFeedItem[];
  alerts: NotificationItem[];
  summary: HomeDashboardSummary;
}
