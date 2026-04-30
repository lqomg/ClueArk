import { BadRequestException, Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import { LLM_CHAT } from '../llm/llm.tokens';
import type { LlmChatPort } from '../llm/llm.types';
import { Monitor, MonitorDocument } from './schemas/monitor.schema';
import { FeedItem, FeedItemDocument } from '../feed-items/schemas/feed-item.schema';
import { Source, SourceDocument } from '../sources/schemas/source.schema';
import { FeedSimEmbeddingService } from '../feed-items/feed-sim-embedding.service';
import { cosineSimilarity } from '../feed-items/feed-similarity.util';
import { serializeFeedItem } from '../feed-items/feed-items.service';
import type { CreateMonitorDto } from './dto/create-monitor.dto';
import type { ListMonitorFeedQueryDto } from './dto/list-monitor-feed.query.dto';
import type { PatchMonitorSourcesDto } from './dto/patch-monitor-sources.dto';

function notDeletedFilter(): Record<string, unknown> {
  return { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };
}

function truncateNote(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

type LlmMonitorCreate = {
  title?: unknown;
  sourceIds?: unknown;
};

export type MonitorPublic = {
  id: string;
  title: string;
  description: string;
  sourceIds: string[];
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class MonitorsService {
  constructor(
    @InjectModel(Monitor.name) private readonly monitorModel: Model<MonitorDocument>,
    @InjectModel(FeedItem.name) private readonly feedItemModel: Model<FeedItemDocument>,
    @InjectModel(Source.name) private readonly sourceModel: Model<SourceDocument>,
    private readonly config: ConfigService,
    private readonly embeddings: FeedSimEmbeddingService,
    @Inject(LLM_CHAT) private readonly llm: LlmChatPort,
  ) {}

  private maxSources(): number {
    const raw = Number(this.config.get('MONITOR_MAX_SOURCES'));
    return Number.isFinite(raw) && raw >= 1 && raw <= 50 ? Math.floor(raw) : 20;
  }

  private timelineCandidateCap(): number {
    const raw = Number(this.config.get('MONITOR_TIMELINE_CANDIDATE_CAP'));
    return Number.isFinite(raw) && raw >= 100 && raw <= 20000 ? Math.floor(raw) : 3000;
  }

  private defaultMinCosine(): number {
    const raw = Number(this.config.get('MONITOR_MIN_COSINE'));
    return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 0.32;
  }

  private defaultRecentHours(): number {
    const raw = Number(this.config.get('MONITOR_DEFAULT_RECENT_HOURS'));
    return Number.isFinite(raw) && raw >= 1 && raw <= 2160 ? Math.floor(raw) : 720;
  }

  private llmCatalogCap(): number {
    const raw = Number(this.config.get('MONITOR_LLM_SOURCE_CATALOG_CAP'));
    return Number.isFinite(raw) && raw >= 20 && raw <= 500 ? Math.floor(raw) : 200;
  }

  private serializeMonitor(doc: MonitorDocument | Record<string, unknown>): MonitorPublic {
    const d = doc as Record<string, unknown>;
    const ids = (d.sourceIds as Types.ObjectId[] | undefined) ?? [];
    return {
      id: String(d._id),
      title: String(d.title ?? ''),
      description: String(d.description ?? ''),
      sourceIds: ids.map((x) => String(x)),
      createdAt: d.createdAt as Date,
      updatedAt: d.updatedAt as Date,
    };
  }

  private async loadOwnedMonitor(monitorId: string, userId: string): Promise<MonitorDocument> {
    if (!Types.ObjectId.isValid(monitorId)) throw new NotFoundException('monitor_not_found');
    const oid = new Types.ObjectId(monitorId);
    const uid = new Types.ObjectId(userId);
    const doc = await this.monitorModel
      .findOne({ _id: oid, userId: uid, deletedAt: null })
      .exec();
    if (!doc) throw new NotFoundException('monitor_not_found');
    return doc;
  }

  async listForUser(userId: string): Promise<MonitorPublic[]> {
    const uid = new Types.ObjectId(userId);
    const rows = await this.monitorModel
      .find({ userId: uid, deletedAt: null })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return rows.map((r) => this.serializeMonitor(r as Record<string, unknown>));
  }

  async getOne(monitorId: string, userId: string): Promise<MonitorPublic> {
    const doc = await this.loadOwnedMonitor(monitorId, userId);
    return this.serializeMonitor(doc);
  }

  async create(userId: string, dto: CreateMonitorDto): Promise<MonitorPublic> {
    if (!this.embeddings.isEnabled()) {
      throw new ServiceUnavailableException('monitor_embedding_required');
    }
    const desc = dto.description.trim();
    if (!desc) throw new BadRequestException('description_required');

    const catalogCap = this.llmCatalogCap();
    const sources = await this.sourceModel
      .find({ enabled: true, ...notDeletedFilter() })
      .sort({ sortOrder: 1, displayName: 1 })
      .limit(catalogCap)
      .select({ _id: 1, displayName: 1, kind: 1, note: 1 })
      .lean()
      .exec();

    const catalog = sources.map((s) => ({
      id: String(s._id),
      displayName: String(s.displayName ?? ''),
      kind: String((s as { kind?: string }).kind ?? ''),
      note: truncateNote(String((s as { note?: string }).note ?? ''), 120),
    }));
    const allowedIds = new Set(catalog.map((c) => c.id));

    const system = `你是信源推荐助手。只输出合法 JSON 对象，不要 markdown。
用户会给出「监控话题描述」和「候选信源列表」（每项含 id、displayName、kind、note）。
请输出格式：{"title":"10～40字的简短标题，与话题同语言","sourceIds":["24位hex的id",...]}
要求：
1. title 概括话题，可读。
2. sourceIds 只能从候选列表的 id 中选择，不要编造 id；数量 1～${this.maxSources()}，优先选最能覆盖话题多样性的信源。
3. 若几乎没有相关源，仍尽量选弱相关，至少 1 个 id（必须在列表中）。`;

    const userPayload = JSON.stringify({ description: desc, sources: catalog }, null, 0);

    let title = desc.slice(0, 40);
    let sourceIdStrs: string[] = [];
    try {
      const out = (await this.llm.completeJson<LlmMonitorCreate>(system, userPayload)) as LlmMonitorCreate;
      const t = typeof out.title === 'string' ? out.title.trim().slice(0, 200) : '';
      if (t) title = t;
      const arr = Array.isArray(out.sourceIds) ? out.sourceIds : [];
      const seen = new Set<string>();
      for (let i = 0; i < arr.length && sourceIdStrs.length < this.maxSources(); i++) {
        const id = String(arr[i] ?? '').trim();
        if (!Types.ObjectId.isValid(id)) continue;
        if (!allowedIds.has(id)) continue;
        if (seen.has(id)) continue;
        seen.add(id);
        sourceIdStrs.push(id);
      }
    } catch {
      throw new ServiceUnavailableException('monitor_llm_failed');
    }

    if (sourceIdStrs.length === 0) {
      throw new BadRequestException('monitor_no_sources_recommended');
    }
    if (catalog.length === 0) {
      throw new BadRequestException('monitor_no_enabled_sources');
    }

    const emb = await this.embeddings.embedBatch([desc]);
    const vec = emb[0];
    if (!vec?.length) {
      throw new ServiceUnavailableException('monitor_embedding_failed');
    }

    const embeddingModel = this.config.get<string>('FEED_EMBEDDING_MODEL')?.trim() || 'text-embedding-3-small';
    const uid = new Types.ObjectId(userId);
    const doc = await this.monitorModel.create({
      userId: uid,
      title,
      description: desc,
      sourceIds: sourceIdStrs.map((id) => new Types.ObjectId(id)),
      descriptionEmbedding: vec,
      embeddingModel,
      deletedAt: null,
    });

    return this.serializeMonitor(doc);
  }

  async listFeedItems(monitorId: string, userId: string, q: ListMonitorFeedQueryDto) {
    const monitor = await this.loadOwnedMonitor(monitorId, userId);
    const m = monitor.toObject() as {
      descriptionEmbedding: number[];
      sourceIds: Types.ObjectId[];
    };
    const queryVec = m.descriptionEmbedding;
    if (!Array.isArray(queryVec) || queryVec.length === 0) {
      throw new ServiceUnavailableException('monitor_missing_embedding');
    }

    const recentHours = q.recentHours ?? this.defaultRecentHours();
    const cutoff = new Date(Date.now() - recentHours * 3600000);
    const minSim = q.minSimilarity ?? this.defaultMinCosine();
    const cap = this.timelineCandidateCap();
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 30;

    const sourceIds = (monitor.sourceIds ?? []).map((x) => new Types.ObjectId(String(x)));
    if (sourceIds.length === 0) {
      return { items: [], total: 0, page, pageSize, recentHours, monitorId, minSimilarity: minSim };
    }

    const candidates = await this.feedItemModel
      .find({
        sourceId: { $in: sourceIds },
        llmStatus: 'done',
        'simEmbedFull.0': { $exists: true },
        $expr: {
          $gte: [{ $ifNull: ['$publishedAt', '$createdAt'] }, cutoff],
        },
      })
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(cap)
      .populate({ path: 'sourceId', select: 'displayName' })
      .lean()
      .exec();

    const scored: { doc: Record<string, unknown>; score: number }[] = [];
    for (let i = 0; i < candidates.length; i++) {
      const row = candidates[i] as Record<string, unknown>;
      const emb = row.simEmbedFull as number[] | undefined;
      if (!Array.isArray(emb) || emb.length === 0) continue;
      if (emb.length !== queryVec.length) continue;
      const score = cosineSimilarity(queryVec, emb);
      if (score < minSim) continue;
      scored.push({ doc: row, score });
    }
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const ta = new Date((a.doc.publishedAt as Date | null) ?? (a.doc.createdAt as Date)).getTime();
      const tb = new Date((b.doc.publishedAt as Date | null) ?? (b.doc.createdAt as Date)).getTime();
      return tb - ta;
    });

    const total = scored.length;
    const slice = scored.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);
    const items = slice.map((s) => ({
      ...serializeFeedItem(s.doc),
      relevanceScore: Math.round(s.score * 1000) / 1000,
    }));

    return { items, total, page, pageSize, recentHours, monitorId, minSimilarity: minSim };
  }

  async patchSources(monitorId: string, userId: string, dto: PatchMonitorSourcesDto): Promise<MonitorPublic> {
    const monitor = await this.loadOwnedMonitor(monitorId, userId);
    const resolved = await this.resolveValidSourceObjectIds(dto.sourceIds);
    monitor.sourceIds = resolved;
    await monitor.save();
    return this.serializeMonitor(monitor);
  }

  private async resolveValidSourceObjectIds(ids: string[]): Promise<Types.ObjectId[]> {
    const unique = [...new Set(ids.map((x) => x.trim()).filter((x) => Types.ObjectId.isValid(x)))];
    if (unique.length === 0) return [];
    const oids = unique.map((id) => new Types.ObjectId(id));
    const found = await this.sourceModel
      .find({
        _id: { $in: oids },
        enabled: true,
        ...notDeletedFilter(),
      })
      .select({ _id: 1 })
      .lean()
      .exec();
    const foundSet = new Set(found.map((f) => String(f._id)));
    const ordered: Types.ObjectId[] = [];
    for (let i = 0; i < oids.length; i++) {
      const id = oids[i];
      if (foundSet.has(String(id))) ordered.push(id);
    }
    if (ordered.length !== unique.length) {
      throw new BadRequestException('monitor_invalid_or_disabled_source');
    }
    return ordered;
  }

  async softDelete(monitorId: string, userId: string): Promise<void> {
    const monitor = await this.loadOwnedMonitor(monitorId, userId);
    monitor.deletedAt = new Date();
    await monitor.save();
  }
}
