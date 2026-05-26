import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthCoreModule } from '../auth/auth-core.module';
import { FeedItemsModule } from '../feed-items/feed-items.module';
import { Source, SourceSchema } from './schemas/source.schema';
import { SourcesService } from './sources.service';
import { SourcesController } from './sources.controller';
import { CatalogJsonLoader } from './catalog-json.loader';
import { SourcesSeedService } from './sources-seed.service';
import { AdminGuard } from '../admin/guards/admin.guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Source.name, schema: SourceSchema }]),
    AuthCoreModule,
    FeedItemsModule,
  ],
  controllers: [SourcesController],
  providers: [CatalogJsonLoader, SourcesService, SourcesSeedService, AdminGuard],
  exports: [SourcesService, CatalogJsonLoader],
})
export class SourcesModule {}
