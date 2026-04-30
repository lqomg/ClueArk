import { Module } from '@nestjs/common';
import { CluearkBackendClient } from './clueark-backend.client';
import { CrawlController } from './crawl.controller';
import { CrawlPollTask } from './crawl-poll.task';
import { CrawlService } from './crawl.service';
import { CrawlerSecretGuard } from './guards/crawler-secret.guard';

@Module({
  controllers: [CrawlController],
  providers: [CrawlService, CrawlerSecretGuard, CluearkBackendClient, CrawlPollTask],
})
export class CrawlModule {}
