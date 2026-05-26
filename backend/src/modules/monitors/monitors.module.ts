import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthCoreModule } from '../auth/auth-core.module';
import { UsersModule } from '../users/users.module';
import { LlmModule } from '../llm/llm.module';
import { FeedItemsModule } from '../feed-items/feed-items.module';
import { FeedItem, FeedItemSchema } from '../feed-items/schemas/feed-item.schema';
import { VectorStoreModule } from '../vector-store/vector-store.module';
import { MonitorPipelineModule } from '../monitor-pipeline/monitor-pipeline.module';
import { Source, SourceSchema } from '../sources/schemas/source.schema';
import { Monitor, MonitorSchema } from './schemas/monitor.schema';
import { MonitorBriefRun, MonitorBriefRunSchema } from './schemas/monitor-brief-run.schema';
import { MonitorSnapshot, MonitorSnapshotSchema } from './schemas/monitor-snapshot.schema';
import { MonitorsService } from './monitors.service';
import { MonitorsController } from './monitors.controller';
import { MonitorSnapshotService } from './monitor-snapshot.service';
import { MonitoredSourcesService } from './monitored-sources.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Monitor.name, schema: MonitorSchema },
      { name: MonitorBriefRun.name, schema: MonitorBriefRunSchema },
      { name: MonitorSnapshot.name, schema: MonitorSnapshotSchema },
      { name: Source.name, schema: SourceSchema },
      { name: FeedItem.name, schema: FeedItemSchema },
    ]),
    forwardRef(() => AuthCoreModule),
    UsersModule,
    LlmModule,
    FeedItemsModule,
    VectorStoreModule,
    MonitorPipelineModule,
  ],
  controllers: [MonitorsController],
  providers: [MonitorsService, MonitorSnapshotService, MonitoredSourcesService],
  exports: [
    MongooseModule,
    MonitorsService,
    MonitorSnapshotService,
    MonitoredSourcesService,
  ],
})
export class MonitorsModule {}
