import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthCoreModule } from '../auth/auth-core.module';
import { UsersModule } from '../users/users.module';
import { SourcesModule } from '../sources/sources.module';
import { AggregationPolicyModule } from '../aggregation-policy/aggregation-policy.module';
import { MonitorsModule } from '../monitors/monitors.module';
import { AdminGuard } from './guards/admin.guard';
import { AdminSourcesController } from './admin-sources.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminAuthController } from './admin-auth.controller';
import { AdminMonitorsController } from './admin-monitors.controller';
import { MonitorsAdminService } from './monitors-admin.service';
import { JobCenterAdminModule } from '../job-center/job-center-admin.module';
import { Monitor, MonitorSchema } from '../monitors/schemas/monitor.schema';

@Module({
  imports: [
    AuthCoreModule,
    UsersModule,
    SourcesModule,
    AggregationPolicyModule,
    MonitorsModule,
    JobCenterAdminModule,
    MongooseModule.forFeature([{ name: Monitor.name, schema: MonitorSchema }]),
  ],
  controllers: [AdminAuthController, AdminSourcesController, AdminUsersController, AdminMonitorsController],
  providers: [AdminGuard, MonitorsAdminService],
})
export class AdminModule {}
