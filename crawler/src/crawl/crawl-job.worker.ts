import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { JOB_NAME_CRAWL_WEB, QUEUE_CRAWL } from './job.constants';
import { JobReporterClient } from './job-reporter.client';
import { CluearkBackendClient } from './clueark-backend.client';
import { CrawlService } from './crawl.service';
import type { CrawlRunDto } from './dto/crawl-run.dto';

type CrawlWebJobData = {
  mongoJobId: string;
  sourceId: string;
  listUrl: string;
  maxItems?: number;
  selectors?: CrawlRunDto['selectors'];
};

@Injectable()
export class CrawlJobWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CrawlJobWorker.name);
  private connection: IORedis | null = null;
  private worker: Worker | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly crawlService: CrawlService,
    private readonly backend: CluearkBackendClient,
    private readonly reporter: JobReporterClient,
  ) {}

  onModuleInit(): void {
    const url = this.config.get<string>('REDIS_URL')?.trim();
    if (!url) {
      throw new Error('REDIS_URL 未配置，无法启动 crawl_web worker');
    }
    this.connection = new IORedis(url, { maxRetriesPerRequest: null });
    const concurrency = Number(this.config.get('QUEUE_CRAWL_CONCURRENCY')) || 2;

    this.worker = new Worker(
      QUEUE_CRAWL,
      async (job) => this.process(job),
      { connection: this.connection, concurrency },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `crawl_web failed bullId=${job?.id} mongoJobId=${(job?.data as CrawlWebJobData)?.mongoJobId} err=${err.message}`,
      );
    });

    this.logger.log(`CrawlJobWorker 已启动 queue=${QUEUE_CRAWL} concurrency=${concurrency}`);
  }

  private async process(job: Job): Promise<void> {
    if (job.name !== JOB_NAME_CRAWL_WEB) return;

    const data = job.data as CrawlWebJobData;
    const mongoJobId = data.mongoJobId ?? String(job.id);
    const t0 = Date.now();

    await this.reporter.patchStatus(mongoJobId, {
      status: 'active',
      attempts: job.attemptsMade + 1,
    });

    try {
      const dto: CrawlRunDto = {
        sourceId: data.sourceId,
        listUrl: data.listUrl,
        maxItems: data.maxItems,
        ...(data.selectors ? { selectors: data.selectors } : {}),
      };
      const result = await this.crawlService.runJob(dto);
      await this.backend.postCrawlIngest(result);
      const durationMs = Date.now() - t0;
      await this.reporter.patchStatus(mongoJobId, {
        status: 'completed',
        durationMs,
        resultSummary: {
          sourceId: data.sourceId,
          items: result.items.length,
          errors: result.errors?.length ?? 0,
          crawlRunId: result.crawlRunId,
        },
      });
      this.logger.log(
        `crawl_web completed jobId=${mongoJobId} sourceId=${data.sourceId} items=${result.items.length}`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await this.reporter.patchStatus(mongoJobId, {
        status: 'failed',
        errorMessage: msg,
        durationMs: Date.now() - t0,
        attempts: job.attemptsMade + 1,
      });
      throw e;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.connection?.quit();
  }
}
