import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LoggerService } from '../logger';
import {
  CRAWL_ONLY_JOB_TYPES,
  JOB_QUEUE_ATTEMPTS,
  JOB_TYPE_TO_BULL_NAME,
  JOB_TYPE_TO_QUEUE,
} from './job.constants';
import { buildDedupeKey, extractIndexFields } from './job-dedupe.util';
import { JobQueueAdapter } from './job-queue.adapter';
import { JobLifecycleService } from './job-lifecycle.service';
import { Job, JobDocument } from './schemas/job.schema';
import { ACTIVE_JOB_STATUSES } from './job.constants';
import type { EnqueueInput, EnqueueResult, WorkerKind } from './job.types';

@Injectable()
export class JobSchedulerService {
  private readonly logger: LoggerService;

  constructor(
    @InjectModel(Job.name) private readonly jobModel: Model<JobDocument>,
    private readonly adapter: JobQueueAdapter,
    private readonly lifecycle: JobLifecycleService,
    private readonly config: ConfigService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createLogger(JobSchedulerService.name);
  }

  private workerKindFor(type: EnqueueInput['type']): WorkerKind {
    return CRAWL_ONLY_JOB_TYPES.has(type) ? 'crawler' : 'backend';
  }

  async enqueue(input: EnqueueInput): Promise<EnqueueResult> {
    const dedupeKey = buildDedupeKey(input, this.config);
    if (dedupeKey) {
      const existing = await this.jobModel
        .findOne({ dedupeKey, status: { $in: [...ACTIVE_JOB_STATUSES] } })
        .select({ _id: 1 })
        .lean()
        .exec();
      if (existing) {
        this.logger.debug(
          `event=job_skip_dedupe type=${input.type} dedupeKey=${dedupeKey} existingJobId=${String(existing._id)}`,
        );
        return { jobId: String(existing._id), skipped: true };
      }
    }

    const queue = JOB_TYPE_TO_QUEUE[input.type];
    const bullName = JOB_TYPE_TO_BULL_NAME[input.type];
    const idx = extractIndexFields(input.type, input.payload as Record<string, unknown>);
    const priority = input.priority ?? 0;
    const scheduledAt = input.scheduledAt ?? new Date();
    const workerKind = this.workerKindFor(input.type);

    const doc = await this.jobModel.create({
      type: input.type,
      status: 'pending',
      queue,
      trigger: input.trigger,
      payload: input.payload,
      dedupeKey,
      bullJobId: null,
      parentJobId: input.parentJobId && Types.ObjectId.isValid(input.parentJobId)
        ? new Types.ObjectId(input.parentJobId)
        : null,
      sourceId: idx.sourceId ? new Types.ObjectId(idx.sourceId) : null,
      monitorId: idx.monitorId ? new Types.ObjectId(idx.monitorId) : null,
      feedItemId: idx.feedItemId ? new Types.ObjectId(idx.feedItemId) : null,
      userId: null,
      attempts: 0,
      maxAttempts: JOB_QUEUE_ATTEMPTS,
      priority,
      resultSummary: null,
      errorMessage: '',
      workerKind,
      scheduledAt,
      queuedAt: null,
      startedAt: null,
      completedAt: null,
      durationMs: null,
    });

    const mongoJobId = String(doc._id);

    try {
      await this.adapter.add(
        queue,
        bullName,
        { mongoJobId, ...input.payload },
        { jobId: mongoJobId, priority },
      );
      await this.lifecycle.markQueued(mongoJobId, mongoJobId);
      this.logger.debug(
        `event=job_enqueued jobId=${mongoJobId} type=${input.type} queue=${queue} trigger=${input.trigger} dedupeKey=${dedupeKey ?? ''}`,
      );
      return { jobId: mongoJobId, skipped: false };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`event=job_enqueue_failed jobId=${mongoJobId} type=${input.type} err=${msg}`);
      await this.jobModel
        .updateOne(
          { _id: doc._id },
          { $set: { status: 'failed', errorMessage: msg.slice(0, 4000), completedAt: new Date() } },
        )
        .exec();
      throw e;
    }
  }

  async enqueueProcessNewItem(
    feedItemId: string,
    sourceId: string,
    opts: { trigger: EnqueueInput['trigger']; parentJobId?: string },
  ): Promise<EnqueueResult> {
    return this.enqueue({
      type: 'process_new_item',
      payload: { feedItemId, sourceId },
      trigger: opts.trigger,
      parentJobId: opts.parentJobId,
    });
  }

  async enqueueEnrichItem(
    feedItemId: string,
    opts: { trigger: EnqueueInput['trigger']; parentJobId?: string },
  ): Promise<EnqueueResult> {
    return this.enqueue({
      type: 'enrich_item',
      payload: { feedItemId },
      trigger: opts.trigger,
      parentJobId: opts.parentJobId,
    });
  }

  async enqueueComputeSnapshot(
    monitorId: string,
    recentHours?: number,
    priority = 0,
    opts?: { trigger?: EnqueueInput['trigger']; parentJobId?: string },
  ): Promise<EnqueueResult> {
    const rh =
      recentHours ?? (Number(this.config.get('MONITOR_SNAPSHOT_DEFAULT_RECENT_HOURS')) || 720);
    return this.enqueue({
      type: 'compute_snapshot',
      payload: { monitorId, recentHours: rh },
      trigger: opts?.trigger ?? 'pipeline',
      priority,
      parentJobId: opts?.parentJobId,
    });
  }

  async enqueueReindexMonitor(
    monitorId: string,
    backfill = true,
    opts?: { trigger?: EnqueueInput['trigger']; parentJobId?: string },
  ): Promise<EnqueueResult> {
    return this.enqueue({
      type: 'reindex_monitor',
      payload: { monitorId, backfill },
      trigger: opts?.trigger ?? 'api',
      parentJobId: opts?.parentJobId,
    });
  }

  async enqueueRunBrief(
    monitorId: string,
    profileId: string,
    opts?: { trigger?: EnqueueInput['trigger']; uniqueSuffix?: string },
  ): Promise<EnqueueResult> {
    const dedupeKey = opts?.uniqueSuffix
      ? `brief:${monitorId}:${profileId}:${opts.uniqueSuffix}`
      : undefined;
    return this.enqueue({
      type: 'run_brief',
      payload: { monitorId, profileId },
      trigger: opts?.trigger ?? 'cron',
      dedupeKey,
    });
  }
}
