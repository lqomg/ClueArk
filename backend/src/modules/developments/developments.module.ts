import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { LlmModule } from '../llm/llm.module';
import { FeedItem, FeedItemSchema } from '../feed-items/schemas/feed-item.schema';
import { Source, SourceSchema } from '../sources/schemas/source.schema';
import { Monitor, MonitorSchema } from '../monitors/schemas/monitor.schema';
import { MonitorsModule } from '../monitors/monitors.module';
import { AdminGuard } from '../admin/guards/admin.guard';
import { DevelopmentsController } from './developments.controller';
import { AdminDevelopmentsController } from './admin-developments.controller';
import { HomeFeedController } from './home-feed.controller';
import { DevelopmentsService } from './developments.service';
import { DevelopmentsReadLocalizationService } from './developments-read-localization.service';
import { DevelopmentsLocalizeJobService } from './developments-localize-job.service';
import { MonitorReadCursorService } from './monitor-read-cursor.service';
import { MorningBriefingService } from './morning-briefing.service';
import {
  MonitorDevelopment,
  MonitorDevelopmentSchema,
} from './schemas/monitor-development.schema';
import {
  DevelopmentTranslation,
  DevelopmentTranslationSchema,
} from './schemas/development-translation.schema';
import {
  MonitorReadCursor,
  MonitorReadCursorSchema,
} from './schemas/monitor-read-cursor.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MonitorDevelopment.name, schema: MonitorDevelopmentSchema },
      { name: DevelopmentTranslation.name, schema: DevelopmentTranslationSchema },
      { name: MonitorReadCursor.name, schema: MonitorReadCursorSchema },
      { name: FeedItem.name, schema: FeedItemSchema },
      { name: Source.name, schema: SourceSchema },
      { name: Monitor.name, schema: MonitorSchema },
    ]),
    AuthGuardsModule,
    LlmModule,
    MonitorsModule,
  ],
  controllers: [DevelopmentsController, AdminDevelopmentsController, HomeFeedController],
  providers: [
    DevelopmentsService,
    DevelopmentsReadLocalizationService,
    DevelopmentsLocalizeJobService,
    MonitorReadCursorService,
    MorningBriefingService,
    AdminGuard,
  ],
  exports: [
    DevelopmentsService,
    DevelopmentsReadLocalizationService,
    DevelopmentsLocalizeJobService,
    MonitorReadCursorService,
    MorningBriefingService,
    MongooseModule,
  ],
})
export class DevelopmentsModule {}
