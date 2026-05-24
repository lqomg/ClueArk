import { BadRequestException, Controller, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../admin/guards/admin.guard';
import { FeedIngestService } from './feed-ingest.service';
import { FeedLlmEnrichService } from './feed-llm-enrich.service';

/** 管理员维护：采集同步、富化（用户读路径在 /monitors） */
@Controller('feed-items')
@UseGuards(JwtAuthGuard, AdminGuard)
export class FeedItemsController {
  constructor(
    private readonly feedIngestService: FeedIngestService,
    private readonly feedLlmEnrich: FeedLlmEnrichService,
  ) {}

  @Post('sync')
  sync() {
    return this.feedIngestService.enqueueManualSourcePolls();
  }

  /** 将被监控信源上的 pending 条目入队 enrich_llm（非进程内直接富化） */
  @Post('llm/enrich-pending')
  enrichPending(@Query('limit') limit?: string) {
    const n = limit != null && limit !== '' ? Number(limit) : 100;
    if (!Number.isFinite(n) || n < 1 || n > 500) throw new BadRequestException('invalid_limit');
    return this.feedLlmEnrich.enqueueMonitoredPending(Math.floor(n));
  }
}
