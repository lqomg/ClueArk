export type SourceKind = 'web' | 'rss' | 'hot_api';

/** 采集条目（监控时间线、研判证据等） */
export interface FeedItem {
  id: string;
  sourceId: string;
  sourceDisplayName: string;
  title: string;
  link: string;
  summary: string;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  recommendReason: string;
  llmStatus: 'pending' | 'processing' | 'done' | 'failed' | 'skipped';
  /** 相似报道簇；无合并时为 null */
  clusterId?: string | null;
  clusterItemCount?: number;
  clusterSourceCount?: number;
  /** 监控时间线：语义相关度（0～1） */
  relevanceScore?: number;
}

export interface MonitorClusterFeedItem {
  id: string;
  sourceDisplayName: string;
  title: string;
  link: string;
  publishedAt: string;
}

/** 用户监控话题（可 PATCH 信源与最低余弦相似度） */
export interface Monitor {
  id: string;
  title: string;
  description: string;
  /** 创建时用户输入的简短意图 */
  topicPrompt: string;
  keywords: string[];
  entities: string[];
  sourceIds: string[];
  /** 时间线过滤阈值（0～1），新建默认 0.43 */
  minCosine: number;
  createdAt: string;
  updatedAt: string;
}

/** GET /monitors 每条内嵌的轻量聚合指标（与 intelligence 同一时间窗逻辑一致） */
export interface MonitorListMetrics {
  heatIndex: number | null;
  newLast24h: number;
  lastActivityAt: string | null;
  trend: { date: string; count: number }[];
}

/** GET /monitors 返回项：监控实体 + 快照指标（未就绪时为 null） */
export interface MonitorWithListMetrics extends Monitor {
  snapshotStatus?: 'pending' | 'computing' | 'ready' | 'stale' | 'failed';
  metrics: MonitorListMetrics | null;
}

export interface NotificationItem {
  id: string;
  monitorId: string;
  monitorTitle: string;
  feedItemId: string;
  score: number;
  title: string;
  link: string;
  readAt: string | null;
  createdAt: string | null;
  sourceDisplayName: string;
  recommendReason: string;
  summaryPreview: string;
  llmStatus: string;
}

export interface MonitorIntelligence {
  monitorId: string;
  recentHours: number;
  minCosine: number;
  lastActivityAt: string | null;
  metrics: { newLast24h: number; totalInWindow: number; boundSourceCount: number };
  heatIndex: number | null;
  weeklyBrief: string[];
  trend: { date: string; count: number }[];
  chartKeywords: { name: string; count: number }[];
  latestItems: FeedItem[];
  /** 异步研判摘要元数据 */
  briefMeta?: {
    profileId: string;
    periodKey: string;
    windowLabel: string;
    completedAt: string | null;
    runId: string | null;
  };
}

/** 全站统一信源；isOfficial 为启动内置 catalog 注入的种子，后台可由管理员/演示账号维护；createdBy 非空为用户自建 */
export interface Source {
  id: string;
  kind: SourceKind;
  displayName: string;
  avatarUrl: string | null;
  fingerprint: string;
  web: {
    url: string;
    crawlListUrl?: string;
    crawlSelectors?: { item: string; link: string; title: string; summary?: string; date?: string };
  } | null;
  rss: { feedUrl: string; siteUrl?: string; titleHint?: string } | null;
  hot: {
    url: string;
    mapper: Record<string, unknown> | null;
    lastPollAt: string | null;
  } | null;
  note: string;
  enabled: boolean;
  sortOrder: number;
  /** 采集轮询间隔（秒），默认 600 */
  pollIntervalSec: number;
  lastPolledAt: string | null;
  nextPollAt: string | null;
  createdBy: string | null;
  isOfficial: boolean;
  openUrl: string;
  createdAt: string;
  updatedAt: string;
}
