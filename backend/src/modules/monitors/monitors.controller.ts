import { Body, Controller, Delete, Get, Logger, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators';
import { MonitorsService } from './monitors.service';
import { CreateMonitorDto } from './dto/create-monitor.dto';
import { ListMonitorFeedQueryDto } from './dto/list-monitor-feed.query.dto';
import { ListMonitorIntelligenceQueryDto } from './dto/list-monitor-intelligence.query.dto';
import { ListMonitorsQueryDto } from './dto/list-monitors.query.dto';
import { ListMonitorBriefRunsQueryDto } from './dto/list-monitor-brief-runs.query.dto';
import { PatchMonitorSourcesDto } from './dto/patch-monitor-sources.dto';

@Controller('monitors')
@UseGuards(JwtAuthGuard)
export class MonitorsController {
  private readonly logger = new Logger(MonitorsController.name);

  constructor(private readonly monitorsService: MonitorsService) {}

  @Get()
  list(@CurrentUser('userId') userId: string, @Query() query: ListMonitorsQueryDto) {
    this.logger.log(`GET /monitors list userId=${userId} recentHours=${query.recentHours ?? 'default'}`);
    return this.monitorsService.listForUser(userId, query.recentHours);
  }

  /** 总览页：监控列表 + 各监控侧栏卡片指标（单次请求） */
  @Get('overview')
  overview(@CurrentUser('userId') userId: string, @Query() query: ListMonitorIntelligenceQueryDto) {
    this.logger.log(`GET /monitors/overview userId=${userId} recentHours=${query.recentHours ?? 'default'}`);
    return this.monitorsService.listOverviewForUser(userId, query.recentHours);
  }

  @Post()
  create(@CurrentUser('userId') userId: string, @Body() dto: CreateMonitorDto) {
    this.logger.log(`POST /monitors create userId=${userId} topicLen=${dto.topic?.length ?? 0}`);
    return this.monitorsService.create(userId, dto);
  }

  @Get(':id/feed-items')
  listFeed(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Query() query: ListMonitorFeedQueryDto,
  ) {
    this.logger.log(
      `GET /monitors/:id/feed-items monitorId=${id} userId=${userId} page=${query.page ?? 1} recentHours=${query.recentHours ?? 'default'}`,
    );
    return this.monitorsService.listFeedItems(id, userId, query);
  }

  @Get(':id/intelligence')
  intelligence(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Query() query: ListMonitorIntelligenceQueryDto,
  ) {
    this.logger.log(
      `GET /monitors/:id/intelligence monitorId=${id} userId=${userId} recentHours=${query.recentHours ?? 'default'} briefProfile=${query.briefProfile ?? 'default'}`,
    );
    return this.monitorsService.getIntelligence(id, userId, query);
  }

  @Get(':id/brief-runs/:runId')
  getBriefRun(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Param('runId') runId: string,
  ) {
    this.logger.log(`GET /monitors/:id/brief-runs/:runId monitorId=${id} runId=${runId} userId=${userId}`);
    return this.monitorsService.getBriefRunById(id, runId, userId);
  }

  @Get(':id/brief-runs')
  listBriefRuns(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Query() query: ListMonitorBriefRunsQueryDto,
  ) {
    this.logger.log(
      `GET /monitors/:id/brief-runs monitorId=${id} userId=${userId} profileId=${query.profileId ?? 'all'} limit=${query.limit ?? 20}`,
    );
    return this.monitorsService.listBriefRuns(id, userId, query);
  }

  @Get(':id')
  getOne(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    this.logger.log(`GET /monitors/:id monitorId=${id} userId=${userId}`);
    return this.monitorsService.getOne(id, userId);
  }

  @Patch(':id/sources')
  patchSources(@CurrentUser('userId') userId: string, @Param('id') id: string, @Body() dto: PatchMonitorSourcesDto) {
    this.logger.log(
      `PATCH /monitors/:id/sources monitorId=${id} userId=${userId} sourceCount=${dto.sourceIds?.length ?? 0} minCosine=${dto.minCosine ?? 'unchanged'}`,
    );
    return this.monitorsService.patchSources(id, userId, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    this.logger.log(`DELETE /monitors/:id monitorId=${id} userId=${userId}`);
    return this.monitorsService.softDelete(id, userId);
  }
}
