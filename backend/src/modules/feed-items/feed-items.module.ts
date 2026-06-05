import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { LlmModule } from '../llm/llm.module';
import { Source, SourceSchema } from '../sources/schemas/source.schema';
import { FeedItem, FeedItemSchema } from './schemas/feed-item.schema';
import { FeedItemLlm, FeedItemLlmSchema } from './schemas/feed-item-llm.schema';
import {
  FeedItemTranslation,
  FeedItemTranslationSchema,
} from './schemas/feed-item-translation.schema';
import { FeedItemLlmService } from './feed-item-llm.service';
import { FeedItemsController } from './feed-items.controller';
import { FeedItemsUserController } from './feed-items-user.controller';
import { InternalFeedIngestController } from './internal-feed-ingest.controller';
import { FeedIngestService } from './feed-ingest.service';
import { FeedLlmEnrichService } from './feed-llm-enrich.service';
import { FeedItemTranslationService } from './feed-item-translation.service';
import { FeedSimEmbeddingService } from './feed-sim-embedding.service';
import { FeedIncrementalClusterService } from './feed-incremental-cluster.service';
import { AdminGuard } from '../admin/guards/admin.guard';
import { CrawlerIngestGuard } from './guards/crawler-ingest.guard';
import { AggregationPolicyModule } from '../aggregation-policy/aggregation-policy.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FeedItem.name, schema: FeedItemSchema },
      { name: FeedItemLlm.name, schema: FeedItemLlmSchema },
      { name: FeedItemTranslation.name, schema: FeedItemTranslationSchema },
      { name: Source.name, schema: SourceSchema },
    ]),
    AuthGuardsModule,
    LlmModule,
    AggregationPolicyModule,
  ],
  controllers: [FeedItemsController, FeedItemsUserController, InternalFeedIngestController],
  providers: [
    FeedIngestService,
    FeedLlmEnrichService,
    FeedItemTranslationService,
    FeedItemLlmService,
    FeedSimEmbeddingService,
    FeedIncrementalClusterService,
    AdminGuard,
    CrawlerIngestGuard,
  ],
  exports: [
    FeedIngestService,
    FeedLlmEnrichService,
    FeedItemLlmService,
    FeedItemTranslationService,
    FeedIncrementalClusterService,
    FeedSimEmbeddingService,
  ],
})
export class FeedItemsModule {}
