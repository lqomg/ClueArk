import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { MonitorsModule } from '../monitors/monitors.module';
import { FeedItem, FeedItemSchema } from '../feed-items/schemas/feed-item.schema';
import { Source, SourceSchema } from '../sources/schemas/source.schema';
import { AdminGuard } from '../admin/guards/admin.guard';
import { DevelopmentsController } from './developments.controller';
import { AdminDevelopmentsController } from './admin-developments.controller';
import { DevelopmentsService } from './developments.service';
import { DevelopmentsReadLocalizationService } from './developments-read-localization.service';
import {
  MonitorDevelopment,
  MonitorDevelopmentSchema,
} from './schemas/monitor-development.schema';
import {
  DevelopmentTranslation,
  DevelopmentTranslationSchema,
} from './schemas/development-translation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MonitorDevelopment.name, schema: MonitorDevelopmentSchema },
      { name: DevelopmentTranslation.name, schema: DevelopmentTranslationSchema },
      { name: FeedItem.name, schema: FeedItemSchema },
      { name: Source.name, schema: SourceSchema },
    ]),
    AuthGuardsModule,
    MonitorsModule,
  ],
  controllers: [DevelopmentsController, AdminDevelopmentsController],
  providers: [DevelopmentsService, DevelopmentsReadLocalizationService, AdminGuard],
  exports: [DevelopmentsService, DevelopmentsReadLocalizationService, MongooseModule],
})
export class DevelopmentsModule {}
