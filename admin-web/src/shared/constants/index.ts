export const USER_ROLE = {
  User: 'user',
  Admin: 'admin',
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export const JOB_TYPES = [
  'source_poll',
  'crawl_web',
  'process_new_item',
  'reindex_monitor',
  'enrich_item',
  'compute_snapshot',
  'run_brief',
] as const;

export type JobType = (typeof JOB_TYPES)[number];

export const JOB_STATUSES = ['pending', 'queued', 'active', 'completed', 'failed', 'cancelled'] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const SNAPSHOT_STATUSES = ['pending', 'computing', 'ready', 'failed', 'stale'] as const;

export type SnapshotStatus = (typeof SNAPSHOT_STATUSES)[number];

export const SOURCE_KINDS = ['web', 'rss', 'hot_api'] as const;

export type SourceKind = (typeof SOURCE_KINDS)[number];
