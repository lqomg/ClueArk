import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { LlmModule } from '../llm/llm.module';
import { FeedItemsModule } from '../feed-items/feed-items.module';
import { FeedItem, FeedItemSchema } from '../feed-items/schemas/feed-item.schema';
import { Source, SourceSchema } from '../sources/schemas/source.schema';
import { Monitor, MonitorSchema } from './schemas/monitor.schema';
import { MonitorsService } from './monitors.service';
import { MonitorsController } from './monitors.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Monitor.name, schema: MonitorSchema },
      { name: FeedItem.name, schema: FeedItemSchema },
      { name: Source.name, schema: SourceSchema },
    ]),
    AuthModule,
    LlmModule,
    FeedItemsModule,
  ],
  controllers: [MonitorsController],
  providers: [MonitorsService],
  exports: [MonitorsService],
})
export class MonitorsModule {}
