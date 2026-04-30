import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CrawlService } from './crawl.service';
import { CrawlRunDto } from './dto/crawl-run.dto';
import { CrawlerSecretGuard } from './guards/crawler-secret.guard';

@Controller()
export class CrawlController {
  constructor(private readonly crawlService: CrawlService) {}

  @Get('health')
  health() {
    return { ok: true, service: 'clueark-crawler', ts: new Date().toISOString() };
  }

  @Post('crawl/run')
  @UseGuards(CrawlerSecretGuard)
  run(@Body() dto: CrawlRunDto) {
    return this.crawlService.runJob(dto);
  }
}
