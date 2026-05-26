import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '../logger';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { ensureQdrantCollections, resolveEmbeddingDimensions, vectorSizeFromEmbedding } from './collections.setup';
import { mongoIdToQdrantPointId, resolveMongoIdFromQdrantHit } from './qdrant-point-id.util';
import type { FeedItemPayload, MonitorPayload, ScoredFeedHit, ScoredMonitorHit } from './vector-store.types';

@Injectable()
export class VectorStoreService implements OnModuleInit {
  private readonly logger: LoggerService;
  private client: QdrantClient | null = null;
  private feedCollection: string;
  private monitorCollection: string;
  private readonly embeddingDimensions: number;
  private ready = false;

  constructor(
    private readonly config: ConfigService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createLogger(VectorStoreService.name);
    this.feedCollection = this.config.get<string>('QDRANT_COLLECTION_FEED')?.trim() || 'feed_items';
    this.monitorCollection = this.config.get<string>('QDRANT_COLLECTION_MONITORS')?.trim() || 'monitors';
    this.embeddingDimensions = resolveEmbeddingDimensions(
      this.config.get<string>('FEED_EMBEDDING_DIMENSIONS'),
    );
    const url = this.config.get<string>('QDRANT_URL')?.trim();
    if (!url) {
      throw new Error('QDRANT_URL 未配置');
    }
    this.client = new QdrantClient({ url });
  }

  isEnabled(): boolean {
    return this.ready;
  }

  async onModuleInit(): Promise<void> {
    if (!this.client) {
      throw new Error('QDRANT_URL 未配置');
    }
    await ensureQdrantCollections(
      this.client,
      this.feedCollection,
      this.monitorCollection,
      this.embeddingDimensions,
    );
    this.ready = true;
    this.logger.log(`Qdrant collections ready: ${this.feedCollection}, ${this.monitorCollection}`);
  }

  private requireClient(): QdrantClient {
    if (!this.client || !this.ready) {
      throw new Error('vector_store_unavailable');
    }
    return this.client;
  }

  private toQdrantPointId(mongoId: string): string {
    return mongoIdToQdrantPointId(mongoId);
  }

  async upsertFeedItem(id: string, vector: number[], payload: FeedItemPayload): Promise<void> {
    const client = this.requireClient();
    const pointId = this.toQdrantPointId(id);
    const fullPayload: FeedItemPayload = { ...payload, feedItemId: id };
    await ensureQdrantCollections(
      client,
      this.feedCollection,
      this.monitorCollection,
      vectorSizeFromEmbedding(vector),
    );
    await client.upsert(this.feedCollection, {
      wait: true,
      points: [{ id: pointId, vector, payload: fullPayload }],
    });
  }

  async upsertMonitor(id: string, vector: number[], payload: MonitorPayload): Promise<void> {
    const client = this.requireClient();
    const pointId = this.toQdrantPointId(id);
    const fullPayload: MonitorPayload = { ...payload, monitorId: id };
    await ensureQdrantCollections(
      client,
      this.feedCollection,
      this.monitorCollection,
      vectorSizeFromEmbedding(vector),
    );
    await client.upsert(this.monitorCollection, {
      wait: true,
      points: [{ id: pointId, vector, payload: fullPayload }],
    });
  }

  async deleteMonitor(id: string): Promise<void> {
    if (!this.client) return;
    try {
      const pointId = this.toQdrantPointId(id);
      await this.client.delete(this.monitorCollection, { wait: true, points: [pointId] });
    } catch {
      /* ignore */
    }
  }

  async deleteFeedItem(id: string): Promise<void> {
    if (!this.client) return;
    try {
      const pointId = this.toQdrantPointId(id);
      await this.client.delete(this.feedCollection, { wait: true, points: [pointId] });
    } catch {
      /* ignore */
    }
  }

  async getMonitorVector(monitorId: string): Promise<number[] | null> {
    if (!this.client || !this.ready) return null;
    try {
      const pointId = this.toQdrantPointId(monitorId);
      const rows = await this.client.retrieve(this.monitorCollection, {
        ids: [pointId],
        with_vector: true,
      });
      const v = rows?.[0]?.vector;
      if (Array.isArray(v)) return v as number[];
      return null;
    } catch (err) {
      this.logger.warn(
        `getMonitorVector failed monitorId=${monitorId} err=${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  /** 新条目向量 → 匹配绑定该信源的监控 */
  async searchMonitorsByItemVector(
    itemVector: number[],
    sourceId: string,
    limit: number,
    scoreThreshold: number,
  ): Promise<ScoredMonitorHit[]> {
    const client = this.requireClient();
    const res = await client.search(this.monitorCollection, {
      vector: itemVector,
      limit: Math.min(Math.max(limit, 1), 100),
      score_threshold: scoreThreshold,
      filter: {
        must: [
          { key: 'sourceIds', match: { any: [sourceId] } },
          { is_null: { key: 'deletedAt' } },
        ],
      },
      with_payload: true,
    });
    return (res ?? []).map((p) => {
      const payload = p.payload as MonitorPayload;
      return {
        monitorId: resolveMongoIdFromQdrantHit(p.id, payload?.monitorId),
        score: p.score ?? 0,
        payload,
      };
    });
  }

  /** 监控向量 → 时间窗内相关条目（时间线/快照/月报） */
  async searchFeedItemsByMonitorVector(
    monitorVector: number[],
    sourceIds: string[],
    periodStartMs: number,
    periodEndMs: number,
    limit: number,
    scoreThreshold: number,
  ): Promise<ScoredFeedHit[]> {
    if (sourceIds.length === 0) return [];
    const client = this.requireClient();
    const res = await client.search(this.feedCollection, {
      vector: monitorVector,
      limit: Math.min(Math.max(limit, 1), 5000),
      score_threshold: scoreThreshold,
      filter: {
        must: [
          { key: 'sourceId', match: { any: sourceIds } },
          { key: 'publishedAt', range: { gte: periodStartMs, lte: periodEndMs } },
        ],
      },
      with_payload: true,
    });
    return (res ?? []).map((p) => {
      const payload = p.payload as FeedItemPayload;
      return {
        feedItemId: resolveMongoIdFromQdrantHit(p.id, payload?.feedItemId),
        score: p.score ?? 0,
        payload,
      };
    });
  }
}
