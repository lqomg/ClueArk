import { BadRequestException, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../admin/guards/admin.guard';
import { FeedItemsService } from './feed-items.service';
import { FeedIngestService } from './feed-ingest.service';
import { FeedLlmEnrichService } from './feed-llm-enrich.service';
import { FeedClusterService } from './feed-cluster.service';
import { ListFeedItemsQueryDto } from './dto/list-feed-items.query.dto';

@Controller('feed-items')
@UseGuards(JwtAuthGuard)
export class FeedItemsController {
  constructor(
    private readonly feedItemsService: FeedItemsService,
    private readonly feedIngestService: FeedIngestService,
    private readonly feedLlmEnrich: FeedLlmEnrichService,
    private readonly feedCluster: FeedClusterService,
  ) {}

  /** 同一相似簇下的全部条目 */
  @Get('by-cluster/:clusterId')
  listByCluster(@Param('clusterId') clusterId: string) {
    return this.feedItemsService.listByClusterId(clusterId);
  }

  @Get()
  list(@Query() query: ListFeedItemsQueryDto) {
    return this.feedItemsService.list(query);
  }

  @Post('sync')
  @UseGuards(AdminGuard)
  sync() {
    return this.feedIngestService.pollAllFeedSources();
  }

  /** 管理员：手动触发相似聚类（与定时任务相同逻辑） */
  @Post('cluster/run')
  @UseGuards(AdminGuard)
  runCluster() {
    return this.feedCluster.run();
  }

  /** 管理员：批量触发 LLM 富化 pending 条目 */
  @Post('llm/enrich-pending')
  @UseGuards(AdminGuard)
  enrichPending(@Query('limit') limit?: string) {
    const n = limit != null && limit !== '' ? Number(limit) : 100;
    if (!Number.isFinite(n) || n < 1 || n > 500) throw new BadRequestException('invalid_limit');
    return this.feedLlmEnrich.processPending(Math.floor(n));
  }
}
