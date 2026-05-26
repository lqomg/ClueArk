import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthCoreModule } from '../auth/auth-core.module';
import { LlmModule } from '../llm/llm.module';
import { Source, SourceSchema } from '../sources/schemas/source.schema';
import { FeedItem, FeedItemSchema } from './schemas/feed-item.schema';
import { FeedItemsController } from './feed-items.controller';
import { InternalFeedIngestController } from './internal-feed-ingest.controller';
import { FeedIngestService } from './feed-ingest.service';
import { FeedLlmEnrichService } from './feed-llm-enrich.service';
import { FeedSimEmbeddingService } from './feed-sim-embedding.service';
import { FeedIncrementalClusterService } from './feed-incremental-cluster.service';
import { AdminGuard } from '../admin/guards/admin.guard';
import { CrawlerIngestGuard } from './guards/crawler-ingest.guard';
import { AggregationPolicyModule } from '../aggregation-policy/aggregation-policy.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FeedItem.name, schema: FeedItemSchema },
      { name: Source.name, schema: SourceSchema },
    ]),
    AuthCoreModule,
    LlmModule,
    AggregationPolicyModule,
  ],
  controllers: [FeedItemsController, InternalFeedIngestController],
  providers: [
    FeedIngestService,
    FeedLlmEnrichService,
    FeedSimEmbeddingService,
    FeedIncrementalClusterService,
    AdminGuard,
    CrawlerIngestGuard,
  ],
  exports: [
    FeedIngestService,
    FeedLlmEnrichService,
    FeedIncrementalClusterService,
    FeedSimEmbeddingService,
  ],
})
export class FeedItemsModule {}
