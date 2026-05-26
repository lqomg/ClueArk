import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthCoreModule } from '../auth/auth-core.module';
import { AdminGuard } from '../admin/guards/admin.guard';
import { Monitor, MonitorSchema } from '../monitors/schemas/monitor.schema';
import { JobCenterCoreModule } from './job-center-core.module';
import { AdminJobsController } from './admin-jobs.controller';
import { AdminJobsRelationsService } from './admin-jobs-relations.service';

@Module({
  imports: [
    JobCenterCoreModule,
    AuthCoreModule,
    MongooseModule.forFeature([{ name: Monitor.name, schema: MonitorSchema }]),
  ],
  controllers: [AdminJobsController],
  providers: [AdminGuard, AdminJobsRelationsService],
})
export class JobCenterAdminModule {}
