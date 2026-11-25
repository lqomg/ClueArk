/**
 * Worker 已接线的任务类型。新增类型须同时注册 handler / 队列映射，
 * 避免只改常量导致入队后无人消费。
 *
 * process_new_item：默认走门禁（admission → author → developments）；
 * 设 LEGACY_COSINE_TIMELINE=1 可回滚为「余弦命中即通知」。
 */
export const JOB_TYPES = [
  'source_poll',
  'crawl_web',
  'process_new_item',
  'reindex_monitor',
  'create_monitor',
  'enrich_item',
  'compute_snapshot',
  'run_brief',
] as const;

export type JobType = (typeof JOB_TYPES)[number];

export const JOB_STATUSES = [
  'pending',
  'queued',
  'active',
  'completed',
  'failed',
  'cancelled',
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_TRIGGERS = ['cron', 'api', 'pipeline', 'crawler', 'startup', 'manual'] as const;

export type JobTrigger = (typeof JOB_TRIGGERS)[number];

export const WORKER_KINDS = ['backend', 'crawler'] as const;

export type WorkerKind = (typeof WORKER_KINDS)[number];

export type SourcePollPayload = {
  sourceId: string;
  kind: 'rss' | 'hot_api';
  feedUrl?: string;
};

export type CrawlWebPayload = {
  sourceId: string;
  listUrl: string;
  maxItems?: number;
  selectors?: { item: string; link: string; title: string; summary?: string; date?: string };
};

export type ProcessNewItemPayload = { feedItemId: string; sourceId: string };

export type ReindexMonitorPayload = { monitorId: string; backfill?: boolean };

export type CreateMonitorPayload = { monitorId: string; userId: string; topic: string };

export type EnrichItemPayload = { feedItemId: string };

export type ComputeSnapshotPayload = { monitorId: string; recentHours: number };

export type RunBriefPayload = { monitorId: string; profileId: string; locale?: string };

export type JobPayload =
  | SourcePollPayload
  | CrawlWebPayload
  | Record<string, unknown>
  | ProcessNewItemPayload
  | ReindexMonitorPayload
  | CreateMonitorPayload
  | EnrichItemPayload
  | ComputeSnapshotPayload
  | RunBriefPayload;

export type EnqueueInput = {
  type: JobType;
  payload: JobPayload;
  trigger: JobTrigger;
  priority?: number;
  dedupeKey?: string;
  parentJobId?: string;
  scheduledAt?: Date;
};

export type EnqueueResult = {
  jobId: string;
  skipped: boolean;
};
