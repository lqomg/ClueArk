import { CronJob } from 'cron';

export const DEFAULT_SOURCE_POLL_TICK_SEC = 15;
export const DEFAULT_CRAWL_WEB_TICK_SEC = 30;
export const DEFAULT_MONITOR_SNAPSHOT_CRON = '0 * * * *';
export const DEFAULT_MONITOR_BRIEF_CRON = '0 0 0,8,16 * * *';

export function clampSchedulerTickSec(raw: unknown, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(300, Math.max(5, Math.floor(n)));
}

/** 6 段 cron（含秒），用于信源 / 爬虫到期扫描 tick */
export function schedulerTickCronExpression(tickSec: number): string {
  return `*/${tickSec} * * * * *`;
}

export function resolveSourcePollCron(get: (key: string) => unknown): string {
  const tick = clampSchedulerTickSec(get('SOURCE_POLL_SCHEDULER_TICK_SEC'), DEFAULT_SOURCE_POLL_TICK_SEC);
  return schedulerTickCronExpression(tick);
}

export function resolveCrawlWebCron(get: (key: string) => unknown): string {
  const tick = clampSchedulerTickSec(get('CRAWL_WEB_SCHEDULER_TICK_SEC'), DEFAULT_CRAWL_WEB_TICK_SEC);
  return schedulerTickCronExpression(tick);
}

export function resolveCronExpression(raw: unknown, fallback: string): string {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (!trimmed) return fallback;
  try {
    new CronJob(trimmed, () => undefined, null, false);
    return trimmed;
  } catch {
    return fallback;
  }
}

export function resolveMonitorSnapshotCron(get: (key: string) => unknown): string {
  return resolveCronExpression(get('MONITOR_SNAPSHOT_CRON'), DEFAULT_MONITOR_SNAPSHOT_CRON);
}

export function resolveMonitorBriefCron(get: (key: string) => unknown): string {
  return resolveCronExpression(get('MONITOR_BRIEF_CRON'), DEFAULT_MONITOR_BRIEF_CRON);
}
