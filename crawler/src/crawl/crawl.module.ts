import { Module } from '@nestjs/common';
import { CluearkBackendClient } from './clueark-backend.client';
import { CrawlController } from './crawl.controller';
import { CrawlService } from './crawl.service';
import { CrawlerSecretGuard } from './guards/crawler-secret.guard';
import { CrawlJobWorker } from './crawl-job.worker';
import { JobReporterClient } from './job-reporter.client';

@Module({
  controllers: [CrawlController],
  providers: [CrawlService, CrawlerSecretGuard, CluearkBackendClient, JobReporterClient, CrawlJobWorker],
})
export class CrawlModule {}
