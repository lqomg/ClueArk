import { Types } from 'mongoose';
import type { Job } from './schemas/job.schema';

export type AdminJobDto = {
  id: string;
  type: string;
  status: string;
  queue: string;
  trigger: string;
  dedupeKey: string | null;
  parentJobId: string | null;
  sourceId: string | null;
  sourceName: string | null;
  sourceKind: string | null;
  monitorId: string | null;
  monitorTitle: string | null;
  feedItemId: string | null;
  priority: number;
  attempts: number;
  maxAttempts: number;
  resultSummary: Record<string, unknown> | null;
  errorMessage: string;
  workerKind: string | null;
  scheduledAt: Date | null;
  queuedAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  durationMs: number | null;
  createdAt?: Date;
  updatedAt?: Date;
  payload?: Record<string, unknown> | null;
  bullJobId?: string | null;
};

type JobLean = Job & {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

export type JobRelationLabels = {
  sourceName?: string | null;
  sourceKind?: string | null;
  monitorTitle?: string | null;
};

export function toAdminJobDto(
  j: JobLean,
  relations?: JobRelationLabels,
  extra?: { payload?: Record<string, unknown> | null; bullJobId?: string | null },
): AdminJobDto {
  return {
    id: String(j._id),
    type: j.type,
    status: j.status,
    queue: j.queue,
    trigger: j.trigger,
    dedupeKey: j.dedupeKey ?? null,
    parentJobId: j.parentJobId ? String(j.parentJobId) : null,
    sourceId: j.sourceId ? String(j.sourceId) : null,
    sourceName: relations?.sourceName ?? null,
    sourceKind: relations?.sourceKind ?? null,
    monitorId: j.monitorId ? String(j.monitorId) : null,
    monitorTitle: relations?.monitorTitle ?? null,
    feedItemId: j.feedItemId ? String(j.feedItemId) : null,
    priority: j.priority,
    attempts: j.attempts,
    maxAttempts: j.maxAttempts,
    resultSummary: j.resultSummary ?? null,
    errorMessage: j.errorMessage ?? '',
    workerKind: j.workerKind ?? null,
    scheduledAt: j.scheduledAt ?? null,
    queuedAt: j.queuedAt ?? null,
    startedAt: j.startedAt ?? null,
    completedAt: j.completedAt ?? null,
    durationMs: j.durationMs ?? null,
    createdAt: j.createdAt,
    updatedAt: j.updatedAt,
    ...extra,
  };
}
