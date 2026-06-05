import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { FeedItemsModule } from '../feed-items/feed-items.module';
import { MonitorsModule } from '../monitors/monitors.module';
import { MonitorPipelineModule } from '../monitor-pipeline/monitor-pipeline.module';
import { Source, SourceSchema } from '../sources/schemas/source.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { JobCenterCoreModule } from './job-center-core.module';
import { JobHandlerService } from './job-handler.service';
import { JobProcessorsService } from './job-processors.service';
import { JobTickScheduler } from './job-tick.scheduler';
import { InternalJobsController } from './internal-jobs.controller';

@Module({
  imports: [
    JobCenterCoreModule,
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([{ name: Source.name, schema: SourceSchema }]),
    FeedItemsModule,
    MonitorsModule,
    MonitorPipelineModule,
    NotificationsModule,
  ],
  controllers: [InternalJobsController],
  providers: [JobHandlerService, JobProcessorsService, JobTickScheduler],
})
export class JobCenterWorkerModule {}
