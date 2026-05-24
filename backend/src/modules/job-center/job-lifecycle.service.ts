import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LoggerService } from '../logger';
import { Source, SourceDocument } from '../sources/schemas/source.schema';
import {
  buildRichErrorMessage,
  extractLogContextFromPayload,
  formatJobContextLine,
  formatJobError,
  type JobLogContext,
} from './job-log.util';
import { Job, JobDocument } from './schemas/job.schema';
import type { JobStatus } from './job.types';

export type UpdateJobStatusInput = {
  status: JobStatus;
  resultSummary?: Record<string, unknown>;
  errorMessage?: string;
  durationMs?: number;
  attempts?: number;
};

@Injectable()
export class JobLifecycleService {
  private readonly logger: LoggerService;

  constructor(
    @InjectModel(Job.name) private readonly jobModel: Model<JobDocument>,
    @InjectModel(Source.name) private readonly sourceModel: Model<SourceDocument>,
    private readonly config: ConfigService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createLogger(JobLifecycleService.name);
  }

  private async resolveSourceName(sourceId: string | null | undefined): Promise<string | undefined> {
    if (!sourceId || !Types.ObjectId.isValid(sourceId)) return undefined;
    const row = await this.sourceModel.findById(sourceId).select({ displayName: 1 }).lean().exec();
    const name = row?.displayName?.trim();
    return name || undefined;
  }

  private async buildFailureContext(
    jobId: string,
    extra?: Partial<JobLogContext>,
  ): Promise<JobLogContext> {
    const doc = await this.jobModel
      .findById(jobId)
      .select({ type: 1, payload: 1, sourceId: 1, monitorId: 1, feedItemId: 1 })
      .lean()
      .exec();
    const payload =
      doc?.payload && typeof doc.payload === 'object'
        ? (doc.payload as Record<string, unknown>)
        : undefined;
    const fromPayload = extractLogContextFromPayload(payload);
    const sourceId =
      extra?.sourceId ??
      fromPayload.sourceId ??
      (doc?.sourceId ? String(doc.sourceId) : undefined);
    const sourceName =
      extra?.sourceName ?? (sourceId ? await this.resolveSourceName(sourceId) : undefined);
    return {
      jobType: doc?.type,
      sourceId,
      sourceName,
      feedUrl: extra?.feedUrl ?? fromPayload.feedUrl,
      kind: extra?.kind ?? fromPayload.kind,
      monitorId:
        extra?.monitorId ??
        fromPayload.monitorId ??
        (doc?.monitorId ? String(doc.monitorId) : undefined),
      feedItemId:
        extra?.feedItemId ??
        fromPayload.feedItemId ??
        (doc?.feedItemId ? String(doc.feedItemId) : undefined),
      bullJobName: extra?.bullJobName,
    };
  }

  configureTtlIndex(): void {
    const days = Number(this.config.get('JOB_RETENTION_DAYS')) || 90;
    const sec = Math.max(86400, Math.floor(days * 86400));
    void this.jobModel.collection
      .createIndex({ completedAt: 1 }, { expireAfterSeconds: sec, background: true })
      .catch(() => undefined);
  }

  async markQueued(jobId: string, bullJobId: string): Promise<void> {
    await this.jobModel
      .updateOne(
        { _id: new Types.ObjectId(jobId) },
        { $set: { status: 'queued', bullJobId, queuedAt: new Date() } },
      )
      .exec();
  }

  async markActive(jobId: string, attempts?: number): Promise<void> {
    const $set: Record<string, unknown> = { status: 'active', startedAt: new Date() };
    if (attempts != null) $set.attempts = attempts;
    await this.jobModel.updateOne({ _id: new Types.ObjectId(jobId) }, { $set }).exec();
  }

  async markCompleted(jobId: string, input?: Omit<UpdateJobStatusInput, 'status'>): Promise<void> {
    const now = new Date();
    const doc = await this.jobModel.findById(jobId).select({ startedAt: 1 }).lean().exec();
    const started = doc?.startedAt ? new Date(doc.startedAt).getTime() : null;
    const durationMs =
      input?.durationMs ?? (started != null ? now.getTime() - started : null);
    await this.jobModel
      .updateOne(
        { _id: new Types.ObjectId(jobId) },
        {
          $set: {
            status: 'completed',
            completedAt: now,
            durationMs,
            resultSummary: input?.resultSummary ?? null,
            errorMessage: '',
          },
        },
      )
      .exec();
    this.logger.debug(`event=job_completed jobId=${jobId} durationMs=${durationMs ?? '?'}`);
  }

  async markFailed(
    jobId: string,
    errorMessage: string,
    input?: { attempts?: number; context?: Partial<JobLogContext> },
  ): Promise<void> {
    const now = new Date();
    const doc = await this.jobModel.findById(jobId).select({ startedAt: 1 }).lean().exec();
    const started = doc?.startedAt ? new Date(doc.startedAt).getTime() : null;
    const durationMs = started != null ? now.getTime() - started : null;
    const ctx = await this.buildFailureContext(jobId, input?.context);
    const errDetail = formatJobError(errorMessage);
    const msg = buildRichErrorMessage(ctx, errDetail);
    await this.jobModel
      .updateOne(
        { _id: new Types.ObjectId(jobId) },
        {
          $set: {
            status: 'failed',
            completedAt: now,
            durationMs,
            errorMessage: msg,
            ...(input?.attempts != null ? { attempts: input.attempts } : {}),
          },
        },
      )
      .exec();
    const ctxLine = formatJobContextLine(ctx);
    this.logger.error(
      `event=job_failed jobId=${jobId}${ctxLine ? ` ${ctxLine}` : ''} err=${errDetail}`,
    );
  }

  async updateFromExternal(jobId: string, input: UpdateJobStatusInput): Promise<JobDocument | null> {
    if (!Types.ObjectId.isValid(jobId)) return null;
    if (input.status === 'active') {
      await this.markActive(jobId, input.attempts);
      return this.jobModel.findById(jobId).exec();
    }
    if (input.status === 'completed') {
      await this.markCompleted(jobId, input);
      return this.jobModel.findById(jobId).exec();
    }
    if (input.status === 'failed') {
      await this.markFailed(jobId, input.errorMessage ?? 'unknown', { attempts: input.attempts });
      return this.jobModel.findById(jobId).exec();
    }
    return null;
  }

  async findById(jobId: string): Promise<JobDocument | null> {
    if (!Types.ObjectId.isValid(jobId)) return null;
    return this.jobModel.findById(jobId).exec();
  }
}
