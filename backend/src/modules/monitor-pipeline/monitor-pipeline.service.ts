import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FeedItem, FeedItemDocument } from '../feed-items/schemas/feed-item.schema';
import { Monitor, MonitorDocument } from '../monitors/schemas/monitor.schema';
import { FeedSimEmbeddingService } from '../feed-items/feed-sim-embedding.service';
import { FeedIncrementalClusterService } from '../feed-items/feed-incremental-cluster.service';
import { VectorStoreService } from '../vector-store/vector-store.service';
import type { FeedItemPayload, MonitorPayload } from '../vector-store/vector-store.types';
import { NotificationsService } from '../notifications/notifications.service';
import { JobSchedulerService } from '../job-center/job-scheduler.service';
import { shouldEnqueueLlmEnrich } from '../feed-items/feed-llm.constants';
import { LoggerService } from '../logger';

@Injectable()
export class MonitorPipelineService {
  private readonly logger: LoggerService;

  constructor(
    @InjectModel(FeedItem.name) private readonly feedItemModel: Model<FeedItemDocument>,
    @InjectModel(Monitor.name) private readonly monitorModel: Model<MonitorDocument>,
    private readonly embeddings: FeedSimEmbeddingService,
    private readonly incrementalCluster: FeedIncrementalClusterService,
    private readonly vectorStore: VectorStoreService,
    private readonly notifications: NotificationsService,
    private readonly scheduler: JobSchedulerService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createLogger(MonitorPipelineService.name);
  }

  private prepTitle(title: string): string {
    return title.trim().slice(0, 512);
  }

  private keywordHit(title: string, keywords: string[], entities: string[]): boolean {
    const t = title.toLowerCase();
    for (const k of keywords) {
      const w = k.trim().toLowerCase();
      if (w && t.includes(w)) return true;
    }
    for (const e of entities) {
      const w = e.trim().toLowerCase();
      if (w && t.includes(w)) return true;
    }
    return false;
  }

  async processNewItem(feedItemId: string, sourceId: string, parentJobId?: string): Promise<void> {
    this.logger.debug(`event=pipeline_start feedItemId=${feedItemId} sourceId=${sourceId}`);

    if (!this.embeddings.isEnabled() || !this.vectorStore.isEnabled()) {
      throw new Error('pipeline_unavailable: embedding 或 Qdrant 未就绪');
    }

    const item = await this.feedItemModel.findById(feedItemId).exec();
    if (!item) {
      this.logger.debug(`event=pipeline_skip feedItemId=${feedItemId} reason=item_not_found`);
      return;
    }

    const title = String(item.title ?? '');
    const t0 = Date.now();
    const vectors = await this.embeddings.embedBatch([this.prepTitle(title)]);
    const vec = vectors[0];
    if (!vec?.length) {
      await this.feedItemModel
        .updateOne({ _id: item._id }, { $set: { pipelineStatus: 'failed' } })
        .exec();
      this.logger.warn(
        `event=pipeline_embed_failed feedItemId=${feedItemId} durationMs=${Date.now() - t0}`,
      );
      return;
    }

    const publishedAt = new Date(item.publishedAt);
    const clusterResult = await this.incrementalCluster.resolveAndPersist(
      item._id as Types.ObjectId,
      publishedAt,
      vec,
    );
    const clusterIdStr = String(clusterResult.clusterId);

    const payload: FeedItemPayload = {
      feedItemId,
      sourceId,
      publishedAt: publishedAt.getTime(),
      title: title.slice(0, 200),
      link: String(item.link ?? ''),
      itemKey: String(item.itemKey ?? ''),
      llmStatus: item.llmStatus,
      embeddingKind: 'title',
      clusterId: clusterIdStr,
    };

    await this.vectorStore.upsertFeedItem(feedItemId, vec, payload);
    await this.feedItemModel
      .updateOne({ _id: item._id }, { $set: { pipelineStatus: 'embedded', embeddedAt: new Date() } })
      .exec();
    this.logger.debug(`event=pipeline_embedded feedItemId=${feedItemId} embedMs=${Date.now() - t0}`);

    const hits = await this.vectorStore.searchMonitorsByItemVector(vec, sourceId, 50, 0);
    this.logger.debug(`event=pipeline_search feedItemId=${feedItemId} qdrantHits=${hits.length}`);

    const matchedMonitorIds: string[] = [];

    for (let i = 0; i < hits.length; i++) {
      const hit = hits[i];
      const minCosine =
        typeof hit.payload.minCosine === 'number' && Number.isFinite(hit.payload.minCosine)
          ? Math.min(1, Math.max(0, hit.payload.minCosine))
          : 0.43;
      let score = hit.score;
      if (score < minCosine) {
        if (!this.keywordHit(title, hit.payload.keywords ?? [], hit.payload.entities ?? [])) {
          continue;
        }
        score = minCosine;
      }
      const monitorId = hit.monitorId;
      const m = await this.monitorModel.findById(monitorId).select({ title: 1, userId: 1 }).lean().exec();
      if (!m) continue;
      matchedMonitorIds.push(monitorId);
      const notified = await this.notifications.createFromMatch({
        userId: String(m.userId),
        monitorId,
        feedItemId,
        clusterId: clusterIdStr,
        score,
        title,
        link: String(item.link),
        monitorTitle: String(m.title ?? ''),
      });
      if (!notified) {
        this.logger.debug(
          `event=notification_skipped_same_cluster monitorId=${monitorId} clusterId=${clusterIdStr} feedItemId=${feedItemId}`,
        );
      }
    }

    await this.feedItemModel
      .updateOne({ _id: item._id }, { $set: { pipelineStatus: 'matched' } })
      .exec();

    const enrichQueued = shouldEnqueueLlmEnrich(item.llmStatus, item.summary);
    if (enrichQueued) {
      await this.scheduler.enqueueEnrichItem(feedItemId, {
        trigger: 'pipeline',
        parentJobId,
      });
    }

    for (const mid of matchedMonitorIds) {
      await this.scheduler.enqueueComputeSnapshot(mid, undefined, 1, {
        trigger: 'pipeline',
        parentJobId,
      });
    }

    this.logger.debug(
      `event=pipeline_done feedItemId=${feedItemId} clusterId=${clusterIdStr} merged=${clusterResult.merged} matchedMonitors=${matchedMonitorIds.length} enrichQueued=${enrichQueued}`,
    );
  }

  async reindexMonitor(monitorId: string, backfill: boolean): Promise<void> {
    this.logger.debug(`event=reindex_start monitorId=${monitorId} backfill=${backfill}`);

    const monitor = await this.monitorModel.findById(monitorId).exec();
    if (!monitor || monitor.deletedAt) {
      this.logger.debug(`event=reindex_skip monitorId=${monitorId} reason=not_found_or_deleted`);
      return;
    }

    const vec = await this.vectorStore.getMonitorVector(monitorId);
    if (!vec?.length) {
      const emb = await this.embeddings.embedBatch([monitor.description]);
      const v = emb[0];
      if (!v?.length) {
        this.logger.warn(`event=reindex_skip monitorId=${monitorId} reason=embed_failed`);
        return;
      }
      await this.upsertMonitorPoint(monitor, v);
    } else {
      await this.upsertMonitorPoint(monitor, vec);
    }

    await this.scheduler.enqueueComputeSnapshot(monitorId, undefined, 2, { trigger: 'pipeline' });

    if (!backfill) {
      this.logger.debug(`event=reindex_done monitorId=${monitorId} backfillItems=0`);
      return;
    }

    const hours = Number(process.env.MONITOR_BACKFILL_HOURS) || 72;
    const cutoff = new Date(Date.now() - hours * 3600000);
    const sourceIds = (monitor.sourceIds ?? []).map((x) => new Types.ObjectId(String(x)));
    const items = await this.feedItemModel
      .find({ sourceId: { $in: sourceIds }, publishedAt: { $gte: cutoff } })
      .select({ _id: 1, sourceId: 1 })
      .lean()
      .exec();
    for (const it of items) {
      await this.scheduler.enqueueProcessNewItem(String(it._id), String(it.sourceId), {
        trigger: 'pipeline',
      });
    }
    this.logger.debug(
      `event=reindex_done monitorId=${monitorId} backfillItems=${items.length} backfillHours=${hours}`,
    );
  }

  async upsertMonitorPoint(monitor: MonitorDocument, vector: number[]): Promise<void> {
    const id = String(monitor._id);
    const payload: MonitorPayload = {
      monitorId: id,
      userId: String(monitor.userId),
      sourceIds: (monitor.sourceIds ?? []).map((x) => String(x)),
      minCosine:
        typeof monitor.minCosine === 'number' && Number.isFinite(monitor.minCosine)
          ? monitor.minCosine
          : 0.43,
      keywords: (monitor.keywords ?? []).map(String),
      entities: (monitor.entities ?? []).map(String),
      deletedAt: monitor.deletedAt ? monitor.deletedAt.toISOString() : null,
    };
    await this.vectorStore.upsertMonitor(id, vector, payload);
    this.logger.debug(`event=monitor_vector_upserted monitorId=${id}`);
  }
}
