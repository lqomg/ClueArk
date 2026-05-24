import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, type Job } from 'bullmq';
import { startWorkerHeartbeat, stopWorkerHeartbeat } from '../../bootstrap/worker-heartbeat';
import { LoggerService } from '../logger';
import {
  JOB_NAME_COMPUTE_SNAPSHOT,
  JOB_NAME_ENRICH_ITEM,
  JOB_NAME_PROCESS_NEW_ITEM,
  JOB_NAME_REINDEX_MONITOR,
  JOB_NAME_RUN_BRIEF,
  JOB_NAME_SOURCE_POLL,
  QUEUE_BRIEF,
  QUEUE_ENRICH_LLM,
  QUEUE_INGEST,
  QUEUE_PIPELINE,
  QUEUE_SNAPSHOT,
} from './job.constants';
import { JobHandlerService } from './job-handler.service';
import { JobLifecycleService } from './job-lifecycle.service';
import { bullJobDataSummary, extractLogContextFromBullJob, formatJobError } from './job-log.util';
import { JobQueueAdapter } from './job-queue.adapter';
import type {
  ComputeSnapshotPayload,
  EnrichItemPayload,
  ProcessNewItemPayload,
  ReindexMonitorPayload,
  RunBriefPayload,
  SourcePollPayload,
} from './job.types';

@Injectable()
export class JobProcessorsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: LoggerService;
  private workers: Worker[] = [];
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly adapter: JobQueueAdapter,
    private readonly lifecycle: JobLifecycleService,
    private readonly handlers: JobHandlerService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createLogger(JobProcessorsService.name);
  }

  private mongoJobId(job: Job): string {
    const d = job.data as { mongoJobId?: string };
    return d.mongoJobId ?? String(job.id);
  }

  private async runWithLifecycle(job: Job, fn: () => Promise<Record<string, unknown>>): Promise<void> {
    const jobId = this.mongoJobId(job);
    await this.lifecycle.markActive(jobId, job.attemptsMade + 1);
    try {
      const resultSummary = await fn();
      await this.lifecycle.markCompleted(jobId, { resultSummary });
    } catch (e) {
      const errDetail = formatJobError(e);
      await this.lifecycle.markFailed(jobId, errDetail, {
        attempts: job.attemptsMade + 1,
        context: extractLogContextFromBullJob(job),
      });
      throw e;
    }
  }

  private attachWorkerLogging(worker: Worker, queueName: string): void {
    worker.on('failed', (job, err) => {
      const errDetail = formatJobError(err);
      this.logger.error(
        `event=bull_failed queue=${queueName} bullId=${job?.id} err=${errDetail}${bullJobDataSummary(job)}`,
        err.stack,
      );
    });
  }

  onModuleInit(): void {
    const connection = this.adapter.getConnection();

    const ingestConcurrency = Number(this.config.get('QUEUE_INGEST_CONCURRENCY')) || 3;
    const pipelineConcurrency = Number(this.config.get('QUEUE_PIPELINE_CONCURRENCY')) || 5;
    const enrichConcurrency = Number(this.config.get('QUEUE_ENRICH_CONCURRENCY')) || 3;
    const snapshotConcurrency = Number(this.config.get('QUEUE_SNAPSHOT_CONCURRENCY')) || 3;
    const briefConcurrency = Number(this.config.get('QUEUE_BRIEF_CONCURRENCY')) || 2;

    const ingestWorker = new Worker(
      QUEUE_INGEST,
      async (job) => {
        if (job.name === JOB_NAME_SOURCE_POLL) {
          const payload = job.data as SourcePollPayload & { mongoJobId: string };
          const { mongoJobId: _m, ...rest } = payload;
          await this.runWithLifecycle(job, () => this.handlers.handleSourcePoll(rest));
        }
      },
      { connection, concurrency: ingestConcurrency },
    );
    this.attachWorkerLogging(ingestWorker, QUEUE_INGEST);
    this.workers.push(ingestWorker);

    const pipelineWorker = new Worker(
      QUEUE_PIPELINE,
      async (job) => {
        const mongoJobId = this.mongoJobId(job);
        if (job.name === JOB_NAME_PROCESS_NEW_ITEM) {
          const { mongoJobId: _m, ...payload } = job.data as ProcessNewItemPayload & {
            mongoJobId: string;
          };
          await this.runWithLifecycle(job, () =>
            this.handlers.handleProcessNewItem(payload, mongoJobId),
          );
        } else if (job.name === JOB_NAME_REINDEX_MONITOR) {
          const { mongoJobId: _m, ...payload } = job.data as ReindexMonitorPayload & {
            mongoJobId: string;
          };
          await this.runWithLifecycle(job, () => this.handlers.handleReindexMonitor(payload));
        }
      },
      { connection, concurrency: pipelineConcurrency },
    );
    this.attachWorkerLogging(pipelineWorker, QUEUE_PIPELINE);
    this.workers.push(pipelineWorker);

    const enrichWorker = new Worker(
      QUEUE_ENRICH_LLM,
      async (job) => {
        if (job.name === JOB_NAME_ENRICH_ITEM) {
          const { mongoJobId: _m, ...payload } = job.data as EnrichItemPayload & { mongoJobId: string };
          await this.runWithLifecycle(job, () => this.handlers.handleEnrichItem(payload));
        }
      },
      { connection, concurrency: enrichConcurrency },
    );
    this.attachWorkerLogging(enrichWorker, QUEUE_ENRICH_LLM);
    this.workers.push(enrichWorker);

    const snapshotWorker = new Worker(
      QUEUE_SNAPSHOT,
      async (job) => {
        if (job.name === JOB_NAME_COMPUTE_SNAPSHOT) {
          const { mongoJobId: _m, ...payload } = job.data as ComputeSnapshotPayload & {
            mongoJobId: string;
          };
          await this.runWithLifecycle(job, () => this.handlers.handleComputeSnapshot(payload));
        }
      },
      { connection, concurrency: snapshotConcurrency },
    );
    this.attachWorkerLogging(snapshotWorker, QUEUE_SNAPSHOT);
    this.workers.push(snapshotWorker);

    const briefWorker = new Worker(
      QUEUE_BRIEF,
      async (job) => {
        if (job.name === JOB_NAME_RUN_BRIEF) {
          const mongoJobId = this.mongoJobId(job);
          const { mongoJobId: _m, ...payload } = job.data as RunBriefPayload & { mongoJobId: string };
          await this.runWithLifecycle(job, () => this.handlers.handleRunBrief(payload, mongoJobId));
        }
      },
      { connection, concurrency: briefConcurrency },
    );
    this.attachWorkerLogging(briefWorker, QUEUE_BRIEF);
    this.workers.push(briefWorker);

    this.heartbeatTimer = startWorkerHeartbeat(connection);
    this.logger.log(
      `JobProcessors 已启动 queues=5 ingest=${ingestConcurrency} pipeline=${pipelineConcurrency} enrich=${enrichConcurrency} snapshot=${snapshotConcurrency} brief=${briefConcurrency}`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    stopWorkerHeartbeat(this.heartbeatTimer);
    this.heartbeatTimer = null;
    for (const w of this.workers) {
      await w.close();
    }
    this.logger.log('JobProcessors 已关闭');
  }
}
