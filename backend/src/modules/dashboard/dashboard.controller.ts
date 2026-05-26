import { Controller, Get, Logger, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators';
import { DashboardService } from './dashboard.service';
import { ListDashboardFeedQueryDto } from './dto/list-dashboard-feed.query.dto';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly dashboardService: DashboardService) {}

  @Get('feed')
  listFeed(@CurrentUser('userId') userId: string, @Query() query: ListDashboardFeedQueryDto) {
    this.logger.log(
      `GET /dashboard/feed userId=${userId} page=${query.page ?? 1} pageSize=${query.pageSize ?? 40} recentHours=${query.recentHours ?? 'default'} monitorId=${query.monitorId ?? 'all'} qLen=${query.q?.length ?? 0}`,
    );
    return this.dashboardService.listFeed(userId, query);
  }
}
