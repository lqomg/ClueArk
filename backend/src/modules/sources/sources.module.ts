import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthCoreModule } from '../auth/auth-core.module';
import { FeedItemsModule } from '../feed-items/feed-items.module';
import { LlmModule } from '../llm/llm.module';
import { Source, SourceSchema } from './schemas/source.schema';
import { SourcesService } from './sources.service';
import { SourcesController } from './sources.controller';
import { CatalogJsonLoader } from './catalog-json.loader';
import { SourcesSeedService } from './sources-seed.service';
import { WebListProbeService } from './web-list-probe.service';
import { AdminGuard } from '../admin/guards/admin.guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Source.name, schema: SourceSchema }]),
    AuthCoreModule,
    FeedItemsModule,
    LlmModule,
  ],
  controllers: [SourcesController],
  providers: [
    CatalogJsonLoader,
    SourcesService,
    SourcesSeedService,
    WebListProbeService,
    AdminGuard,
  ],
  exports: [SourcesService, CatalogJsonLoader, WebListProbeService],
})
export class SourcesModule {}
