import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { LoggerService } from '../logger';
import { JOB_QUEUE_ATTEMPTS } from './job.constants';

@Injectable()
export class JobQueueAdapter implements OnModuleDestroy {
  private readonly logger: LoggerService;
  private connection: IORedis | null = null;
  private readonly queues = new Map<string, Queue>();

  constructor(
    private readonly config: ConfigService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createLogger(JobQueueAdapter.name);
    const url = this.config.get<string>('REDIS_URL')?.trim();
    if (!url) {
      throw new Error('REDIS_URL 未配置，无法初始化任务队列');
    }
    this.connection = new IORedis(url, { maxRetriesPerRequest: null });
    this.logger.log('JobQueueAdapter 已初始化');
  }

  getConnection(): IORedis {
    return this.connection!;
  }

  private queue(name: string): Queue {
    let q = this.queues.get(name);
    if (!q) {
      q = new Queue(name, { connection: this.connection! });
      this.queues.set(name, q);
    }
    return q;
  }

  async add(
    queueName: string,
    jobName: string,
    data: Record<string, unknown>,
    opts: { jobId: string; priority?: number },
  ): Promise<void> {
    await this.queue(queueName).add(jobName, data, {
      jobId: opts.jobId,
      priority: opts.priority ?? 0,
      attempts: JOB_QUEUE_ATTEMPTS,
      removeOnComplete: false,
      removeOnFail: false,
    });
  }

  async onModuleDestroy(): Promise<void> {
    for (const q of this.queues.values()) {
      await q.close();
    }
    await this.connection?.quit();
  }
}
