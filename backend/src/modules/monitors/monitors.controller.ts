import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators';
import { MonitorsService } from './monitors.service';
import { CreateMonitorDto } from './dto/create-monitor.dto';
import { ListMonitorFeedQueryDto } from './dto/list-monitor-feed.query.dto';
import { ListMonitorIntelligenceQueryDto } from './dto/list-monitor-intelligence.query.dto';
import { PatchMonitorSourcesDto } from './dto/patch-monitor-sources.dto';

@Controller('monitors')
@UseGuards(JwtAuthGuard)
export class MonitorsController {
  constructor(private readonly monitorsService: MonitorsService) {}

  @Get()
  list(@CurrentUser('userId') userId: string) {
    return this.monitorsService.listForUser(userId);
  }

  /** 总览页：监控列表 + 各监控侧栏卡片指标（单次请求） */
  @Get('overview')
  overview(@CurrentUser('userId') userId: string, @Query() query: ListMonitorIntelligenceQueryDto) {
    return this.monitorsService.listOverviewForUser(userId, query.recentHours);
  }

  @Post()
  create(@CurrentUser('userId') userId: string, @Body() dto: CreateMonitorDto) {
    return this.monitorsService.create(userId, dto);
  }

  @Get(':id/feed-items')
  listFeed(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Query() query: ListMonitorFeedQueryDto,
  ) {
    return this.monitorsService.listFeedItems(id, userId, query);
  }

  @Get(':id/intelligence')
  intelligence(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Query() query: ListMonitorIntelligenceQueryDto,
  ) {
    return this.monitorsService.getIntelligence(id, userId, query);
  }

  @Get(':id')
  getOne(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.monitorsService.getOne(id, userId);
  }

  @Patch(':id/sources')
  patchSources(@CurrentUser('userId') userId: string, @Param('id') id: string, @Body() dto: PatchMonitorSourcesDto) {
    return this.monitorsService.patchSources(id, userId, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.monitorsService.softDelete(id, userId);
  }
}
