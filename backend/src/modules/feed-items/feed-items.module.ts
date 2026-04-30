import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { LlmModule } from '../llm/llm.module';
import { Source, SourceSchema } from '../sources/schemas/source.schema';
import { FeedItem, FeedItemSchema } from './schemas/feed-item.schema';
import { FeedItemsController } from './feed-items.controller';
import { InternalFeedIngestController } from './internal-feed-ingest.controller';
import { FeedItemsService } from './feed-items.service';
import { FeedIngestService } from './feed-ingest.service';
import { FeedLlmEnrichService } from './feed-llm-enrich.service';
import { FeedSimEmbeddingService } from './feed-sim-embedding.service';
import { FeedClusterService } from './feed-cluster.service';
import { FeedBootstrapService } from './feed-bootstrap.service';
import { FeedMaintenanceTask } from './feed-maintenance.task';
import { FeedPollTask } from './feed-poll.task';
import { AdminGuard } from '../admin/guards/admin.guard';
import { CrawlerIngestGuard } from './guards/crawler-ingest.guard';
import { AggregationPolicyModule } from '../aggregation-policy/aggregation-policy.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FeedItem.name, schema: FeedItemSchema },
      { name: Source.name, schema: SourceSchema },
    ]),
    AuthModule,
    LlmModule,
    AggregationPolicyModule,
  ],
  controllers: [FeedItemsController, InternalFeedIngestController],
  providers: [
    FeedItemsService,
    FeedIngestService,
    FeedLlmEnrichService,
    FeedSimEmbeddingService,
    FeedClusterService,
    FeedBootstrapService,
    FeedMaintenanceTask,
    FeedPollTask,
    AdminGuard,
    CrawlerIngestGuard,
  ],
  exports: [FeedItemsService, FeedIngestService, FeedLlmEnrichService, FeedClusterService, FeedSimEmbeddingService],
})
export class FeedItemsModule {}
