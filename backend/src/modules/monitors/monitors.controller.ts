import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators';
import { MonitorsService } from './monitors.service';
import { CreateMonitorDto } from './dto/create-monitor.dto';
import { ListMonitorFeedQueryDto } from './dto/list-monitor-feed.query.dto';
import { PatchMonitorSourcesDto } from './dto/patch-monitor-sources.dto';

@Controller('monitors')
@UseGuards(JwtAuthGuard)
export class MonitorsController {
  constructor(private readonly monitorsService: MonitorsService) {}

  @Get()
  list(@CurrentUser('userId') userId: string) {
    return this.monitorsService.listForUser(userId);
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
