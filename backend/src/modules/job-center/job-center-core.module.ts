import { Global, Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Source, SourceSchema } from '../sources/schemas/source.schema';
import { Job, JobSchema } from './schemas/job.schema';
import { JobQueueAdapter } from './job-queue.adapter';
import { JobLifecycleService } from './job-lifecycle.service';
import { JobSchedulerService } from './job-scheduler.service';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Job.name, schema: JobSchema },
      { name: Source.name, schema: SourceSchema },
    ]),
  ],
  providers: [JobQueueAdapter, JobLifecycleService, JobSchedulerService],
  exports: [JobQueueAdapter, JobLifecycleService, JobSchedulerService, MongooseModule],
})
export class JobCenterCoreModule implements OnModuleInit {
  constructor(private readonly lifecycle: JobLifecycleService) {}

  onModuleInit(): void {
    this.lifecycle.configureTtlIndex();
  }
}
