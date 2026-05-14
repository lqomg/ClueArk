export type SourceKind = 'web' | 'rss' | 'hot_api';

/** RSS 拉取后的单条内容 */
export interface FeedItem {
  id: string;
  sourceId: string;
  sourceDisplayName: string;
  title: string;
  /** 列表代表条原标题（合并簇时与 title 一致或用于副标题） */
  itemTitle?: string;
  link: string;
  summary: string;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  recommendReason: string;
  llmStatus?: 'pending' | 'processing' | 'done' | 'failed' | 'skipped';
  /** 相似簇 ID（合并行）；单条为 null */
  clusterId?: string | null;
  clusterItemCount?: number;
  clusterSourceCount?: number;
  clusterEarliestAt?: string | null;
  clusterLatestAt?: string | null;
  /** 监控时间线等场景下由服务端附加的语义相关度（余弦相似度，0～1） */
  relevanceScore?: number;
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

/** GET /monitors/overview 中各监控侧栏卡片用 */
export interface MonitorOverviewCard {
  monitorId: string;
  heatIndex: number | null;
  newLast24h: number;
  lastActivityAt: string | null;
  trend: { date: string; count: number }[];
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
  createdBy: string | null;
  isOfficial: boolean;
  openUrl: string;
  createdAt: string;
  updatedAt: string;
}
