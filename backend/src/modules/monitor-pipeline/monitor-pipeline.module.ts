import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FeedItem, FeedItemSchema } from '../feed-items/schemas/feed-item.schema';
import { Monitor, MonitorSchema } from '../monitors/schemas/monitor.schema';
import { FeedItemsModule } from '../feed-items/feed-items.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { VectorStoreModule } from '../vector-store/vector-store.module';
import { MonitorPipelineService } from './monitor-pipeline.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FeedItem.name, schema: FeedItemSchema },
      { name: Monitor.name, schema: MonitorSchema },
    ]),
    VectorStoreModule,
    FeedItemsModule,
    NotificationsModule,
  ],
  providers: [MonitorPipelineService],
  exports: [MonitorPipelineService],
})
export class MonitorPipelineModule {}
