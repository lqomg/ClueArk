export type FeedItemPayload = {
  /** Mongo feed_items._id，检索结果映射回业务 ID */
  feedItemId?: string;
  sourceId: string;
  publishedAt: number;
  title: string;
  link: string;
  itemKey: string;
  llmStatus: string;
  embeddingKind: 'title' | 'full';
  clusterId?: string | null;
};

export type MonitorPayload = {
  /** Mongo monitors._id，检索结果映射回业务 ID */
  monitorId?: string;
  userId: string;
  sourceIds: string[];
  minCosine: number;
  keywords: string[];
  entities: string[];
  deletedAt: string | null;
};

export type ScoredFeedHit = {
  feedItemId: string;
  score: number;
  payload: FeedItemPayload;
};

export type ScoredMonitorHit = {
  monitorId: string;
  score: number;
  payload: MonitorPayload;
};
