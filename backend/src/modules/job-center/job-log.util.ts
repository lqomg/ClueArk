import type { Job } from 'bullmq';

const DEFAULT_FETCH_TIMEOUT_MS = 10_000;

/** 将 fetch/解析异常转为可读中文说明（含超时） */
export function formatJobError(err: unknown, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS): string {
  if (err instanceof Error) {
    if (err.name === 'AbortError' || /aborted/i.test(err.message)) {
      return `请求超时（>${timeoutMs}ms）`;
    }
    return err.message;
  }
  return String(err);
}

export type JobLogContext = {
  jobType?: string;
  bullJobName?: string;
  sourceId?: string;
  sourceName?: string;
  feedUrl?: string;
  kind?: string;
  monitorId?: string;
  feedItemId?: string;
};

export function extractLogContextFromPayload(payload: Record<string, unknown> | null | undefined): JobLogContext {
  if (!payload || typeof payload !== 'object') return {};
  const ctx: JobLogContext = {};
  if (typeof payload.sourceId === 'string') ctx.sourceId = payload.sourceId;
  if (typeof payload.feedUrl === 'string') ctx.feedUrl = payload.feedUrl;
  if (typeof payload.kind === 'string') ctx.kind = payload.kind;
  if (typeof payload.monitorId === 'string') ctx.monitorId = payload.monitorId;
  if (typeof payload.feedItemId === 'string') ctx.feedItemId = payload.feedItemId;
  return ctx;
}

export function extractLogContextFromBullJob(job: Job | undefined): JobLogContext {
  if (!job?.data || typeof job.data !== 'object') return { bullJobName: job?.name };
  const d = job.data as Record<string, unknown>;
  return {
    bullJobName: job.name,
    ...extractLogContextFromPayload(d),
  };
}

/** 控制台 / Mongo errorMessage 共用前缀，便于一眼定位信源 */
export function formatJobContextLine(ctx: JobLogContext): string {
  const parts: string[] = [];
  if (ctx.jobType) parts.push(`type=${ctx.jobType}`);
  if (ctx.bullJobName && ctx.bullJobName !== ctx.jobType) parts.push(`name=${ctx.bullJobName}`);
  if (ctx.sourceName) parts.push(`source=${JSON.stringify(ctx.sourceName)}`);
  if (ctx.sourceId) parts.push(`sourceId=${ctx.sourceId}`);
  if (ctx.kind) parts.push(`kind=${ctx.kind}`);
  if (ctx.feedUrl) parts.push(`feedUrl=${ctx.feedUrl}`);
  if (ctx.monitorId) parts.push(`monitorId=${ctx.monitorId}`);
  if (ctx.feedItemId) parts.push(`feedItemId=${ctx.feedItemId}`);
  return parts.join(' ');
}

export function buildRichErrorMessage(ctx: JobLogContext, errDetail: string): string {
  const prefix = formatJobContextLine(ctx);
  const body = errDetail.trim();
  const combined = prefix ? `${prefix} | ${body}` : body;
  return combined.slice(0, 4000);
}

export function bullJobDataSummary(job: Job | undefined): string {
  const ctx = extractLogContextFromBullJob(job);
  const line = formatJobContextLine(ctx);
  return line ? ` ${line}` : '';
}
