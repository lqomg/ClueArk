import { JOB_STATUSES, JOB_TYPES, SOURCE_KINDS, type JobStatus, type JobType, type SourceKind } from '@/shared/constants';

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  source_poll: '信源轮询（RSS/热点）',
  crawl_web: '网页列表爬取',
  process_new_item: '新条目匹配推送',
  reindex_monitor: '监控重建索引',
  enrich_item: '条目 LLM 富化',
  compute_snapshot: '监控快照计算',
  run_brief: '生成研判简报',
};

export const JOB_TYPE_HINTS: Record<JobType, string> = {
  source_poll: '定时拉取 RSS 或热点 API，写入情报条目',
  crawl_web: '爬虫服务抓取 Web 列表页并上报',
  process_new_item: '向量化并匹配用户监控，可能发送通知',
  reindex_monitor: '监控信源变更后回填与重建索引',
  enrich_item: 'DeepSeek 等对单条内容做摘要增强（不挡通知）',
  compute_snapshot: '物化监控列表/总览快照供前端读取',
  run_brief: '为监控生成 Brief 研判报告',
};

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  pending: '待调度',
  queued: '已入队',
  active: '执行中',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
};

export const SOURCE_KIND_LABELS: Record<SourceKind, string> = {
  web: '网页',
  rss: 'RSS',
  hot_api: '热点 API',
};

export function jobTypeLabel(type: string): string {
  return (JOB_TYPE_LABELS as Record<string, string>)[type] ?? type;
}

export function jobTypeHint(type: string): string {
  return (JOB_TYPE_HINTS as Record<string, string>)[type] ?? type;
}

export function jobStatusLabel(status: string): string {
  return (JOB_STATUS_LABELS as Record<string, string>)[status] ?? status;
}

export function sourceKindLabel(kind: string | null | undefined): string {
  if (!kind) return '';
  return (SOURCE_KIND_LABELS as Record<string, string>)[kind] ?? kind;
}

export function jobTypeValueEnum(): Record<string, { text: string }> {
  return Object.fromEntries(JOB_TYPES.map((t) => [t, { text: jobTypeLabel(t) }]));
}

export function jobStatusValueEnum(): Record<string, { text: string }> {
  return Object.fromEntries(JOB_STATUSES.map((s) => [s, { text: jobStatusLabel(s) }]));
}
