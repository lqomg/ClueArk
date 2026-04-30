import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CrawlerIngestBodyDto } from './dto/crawler-ingest.dto';
import { FeedIngestService } from './feed-ingest.service';
import { CrawlerIngestGuard } from './guards/crawler-ingest.guard';

@Controller('internal/feed-items')
@UseGuards(CrawlerIngestGuard)
export class InternalFeedIngestController {
  constructor(private readonly feedIngest: FeedIngestService) {}

  /** 爬虫服务：拉取待爬的 Web 信源（sourceId + listUrl） */
  @Get('crawl-sources')
  crawlSources() {
    return this.feedIngest.listWebSourcesForCrawler().then((sources) => ({ sources }));
  }

  /** 爬虫服务：Web 信源条目上报，与 RSS 同源 itemKey 规则 upsert */
  @Post('crawl-ingest')
  crawlIngest(@Body() body: CrawlerIngestBodyDto) {
    return this.feedIngest.ingestCrawlerBatch(body);
  }
}
