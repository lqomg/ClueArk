import type { JobType } from './job.types';

export const QUEUE_INGEST = 'ingest';
export const QUEUE_CRAWL = 'crawl';
export const QUEUE_PIPELINE = 'pipeline';
export const QUEUE_ENRICH_LLM = 'enrich_llm';
export const QUEUE_SNAPSHOT = 'snapshot';
export const QUEUE_BRIEF = 'brief';

export const JOB_NAME_SOURCE_POLL = 'source_poll';
export const JOB_NAME_CRAWL_WEB = 'crawl_web';
export const JOB_NAME_PROCESS_NEW_ITEM = 'process_new_item';
export const JOB_NAME_REINDEX_MONITOR = 'reindex_monitor';
export const JOB_NAME_CREATE_MONITOR = 'create_monitor';
export const JOB_NAME_ENRICH_ITEM = 'enrich_item';
export const JOB_NAME_COMPUTE_SNAPSHOT = 'compute_snapshot';
export const JOB_NAME_RUN_BRIEF = 'run_brief';

export const ACTIVE_JOB_STATUSES = ['pending', 'queued', 'active'] as const;

export const JOB_TYPE_TO_QUEUE: Record<JobType, string> = {
  source_poll: QUEUE_INGEST,
  crawl_web: QUEUE_CRAWL,
  process_new_item: QUEUE_PIPELINE,
  reindex_monitor: QUEUE_PIPELINE,
  create_monitor: QUEUE_PIPELINE,
  enrich_item: QUEUE_ENRICH_LLM,
  compute_snapshot: QUEUE_SNAPSHOT,
  run_brief: QUEUE_BRIEF,
};

export const JOB_TYPE_TO_BULL_NAME: Record<JobType, string> = {
  source_poll: JOB_NAME_SOURCE_POLL,
  crawl_web: JOB_NAME_CRAWL_WEB,
  process_new_item: JOB_NAME_PROCESS_NEW_ITEM,
  reindex_monitor: JOB_NAME_REINDEX_MONITOR,
  create_monitor: JOB_NAME_CREATE_MONITOR,
  enrich_item: JOB_NAME_ENRICH_ITEM,
  compute_snapshot: JOB_NAME_COMPUTE_SNAPSHOT,
  run_brief: JOB_NAME_RUN_BRIEF,
};

export const CRAWL_ONLY_JOB_TYPES = new Set<JobType>(['crawl_web']);

/** BullMQ 仅执行一次；失败由信源/爬虫下一轮调度重试，不做队列内重试 */
export const JOB_QUEUE_ATTEMPTS = 1;
