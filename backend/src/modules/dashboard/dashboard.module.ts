import { Module, forwardRef } from '@nestjs/common';
import { AuthCoreModule } from '../auth/auth-core.module';
import { MonitorsModule } from '../monitors/monitors.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [forwardRef(() => AuthCoreModule), MonitorsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
