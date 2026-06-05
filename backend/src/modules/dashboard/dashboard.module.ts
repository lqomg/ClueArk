import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { MonitorsModule } from '../monitors/monitors.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [AuthGuardsModule, MonitorsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
