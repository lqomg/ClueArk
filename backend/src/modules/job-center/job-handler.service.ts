import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FeedIngestService } from '../feed-items/feed-ingest.service';
import { FeedLlmEnrichService } from '../feed-items/feed-llm-enrich.service';
import { MonitorPipelineService } from '../monitor-pipeline/monitor-pipeline.service';
import { MonitorSnapshotService } from '../monitors/monitor-snapshot.service';
import { MonitorsService } from '../monitors/monitors.service';
import { Source, SourceDocument } from '../sources/schemas/source.schema';
import { clampPollIntervalSec, pollIntervalBoundsFromConfig } from '../sources/source-poll-interval.util';
import { LoggerService } from '../logger';
import type {
  ComputeSnapshotPayload,
  CrawlWebPayload,
  EnrichItemPayload,
  ProcessNewItemPayload,
  ReindexMonitorPayload,
  RunBriefPayload,
  SourcePollPayload,
} from './job.types';

@Injectable()
export class JobHandlerService {
  private readonly logger: LoggerService;

  constructor(
    @InjectModel(Source.name) private readonly sourceModel: Model<SourceDocument>,
    private readonly ingest: FeedIngestService,
    private readonly pipeline: MonitorPipelineService,
    private readonly enrich: FeedLlmEnrichService,
    private readonly snapshots: MonitorSnapshotService,
    private readonly monitors: MonitorsService,
    private readonly config: ConfigService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createLogger(JobHandlerService.name);
  }

  private clampPollSec(raw: number | undefined): number {
    const b = pollIntervalBoundsFromConfig((k) => this.config.get(k));
    return clampPollIntervalSec(raw, b.min, b.max, b.def);
  }

  private async touchSourcePollSchedule(sourceId: string): Promise<void> {
    const src = await this.sourceModel.findById(sourceId).select({ pollIntervalSec: 1 }).exec();
    if (!src) return;
    const now = new Date();
    const intervalSec = this.clampPollSec(src.pollIntervalSec ?? undefined);
    const next = new Date(Date.now() + intervalSec * 1000);
    await this.sourceModel
      .updateOne({ _id: src._id }, { $set: { lastPolledAt: now, nextPollAt: next } })
      .exec();
  }

  async handleSourcePoll(payload: SourcePollPayload): Promise<Record<string, unknown>> {
    const { sourceId, kind } = payload;
    let upserted = 0;
    if (kind === 'rss' && payload.feedUrl) {
      upserted = await this.ingest.ingestOneSource(
        new Types.ObjectId(sourceId),
        payload.feedUrl,
      );
    } else if (kind === 'hot_api') {
      upserted = await this.ingest.pollHotApiSourceById(sourceId);
    }
    await this.touchSourcePollSchedule(sourceId);
    return { upserted, kind, sourceId };
  }

  async handleProcessNewItem(
    payload: ProcessNewItemPayload,
    mongoJobId: string,
  ): Promise<Record<string, unknown>> {
    await this.pipeline.processNewItem(payload.feedItemId, payload.sourceId, mongoJobId);
    return { feedItemId: payload.feedItemId, sourceId: payload.sourceId };
  }

  async handleReindexMonitor(payload: ReindexMonitorPayload): Promise<Record<string, unknown>> {
    await this.pipeline.reindexMonitor(payload.monitorId, payload.backfill !== false);
    return { monitorId: payload.monitorId, backfill: payload.backfill !== false };
  }

  async handleEnrichItem(payload: EnrichItemPayload): Promise<Record<string, unknown>> {
    await this.enrich.enrichOneById(payload.feedItemId);
    return { feedItemId: payload.feedItemId };
  }

  async handleComputeSnapshot(payload: ComputeSnapshotPayload): Promise<Record<string, unknown>> {
    await this.snapshots.computeSnapshot(payload.monitorId, payload.recentHours);
    return { monitorId: payload.monitorId, recentHours: payload.recentHours };
  }

  async handleRunBrief(payload: RunBriefPayload, mongoJobId: string): Promise<Record<string, unknown>> {
    await this.monitors.runBriefForMonitorId(payload.monitorId, payload.profileId, mongoJobId);
    return { monitorId: payload.monitorId, profileId: payload.profileId };
  }

  /** crawl_web 由 crawler 进程执行，backend 不应调用 */
  handleCrawlWeb(_payload: CrawlWebPayload): never {
    throw new Error('crawl_web must run on crawler worker');
  }
}
