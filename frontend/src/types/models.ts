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
  publishedAt: string | null;
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

/** 用户监控话题（创建后标题/描述一期不可改，仅可 PATCH 信源） */
export interface Monitor {
  id: string;
  title: string;
  description: string;
  sourceIds: string[];
  createdAt: string;
  updatedAt: string;
}

/** 全站统一信源（官方 isOfficial；用户贡献有 createdBy） */
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
