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
import type { ListMonitorIntelligenceQueryDto } from './dto/list-monitor-intelligence.query.dto';
import type { PatchMonitorSourcesDto } from './dto/patch-monitor-sources.dto';
import { LoggerService } from "../logger";

function notDeletedFilter(): Record<string, unknown> {
  return { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };
}

function truncateNote(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

type LlmMonitorPlan = {
  title?: unknown;
  description?: unknown;
  keywords?: unknown;
  entities?: unknown;
};

type LlmMonitorSourcesPick = {
  sourceIds?: unknown;
};

export type MonitorPublic = {
  id: string;
  title: string;
  description: string;
  topicPrompt: string;
  keywords: string[];
  entities: string[];
  sourceIds: string[];
  /** 时间线最低余弦相似度（0～1），存库默认 0.52 */
  minCosine: number;
  createdAt: Date;
  updatedAt: Date;
};

export type MonitorIntelligencePublic = {
  monitorId: string;
  recentHours: number;
  minCosine: number;
  lastActivityAt: string | null;
  metrics: {
    newLast24h: number;
    totalInWindow: number;
    boundSourceCount: number;
  };
  heatIndex: number | null;
  weeklyBrief: string[];
  trend: { date: string; count: number }[];
  chartKeywords: { name: string; count: number }[];
  latestItems: Array<ReturnType<typeof serializeFeedItem> & { relevanceScore: number }>;
};

/** 总览侧栏卡片用轻量指标（与情报同一时间窗逻辑一致） */
export type MonitorOverviewCardPublic = {
  monitorId: string;
  heatIndex: number | null;
  newLast24h: number;
  lastActivityAt: string | null;
  trend: { date: string; count: number }[];
};

@Injectable()
export class MonitorsService {
  private readonly logger: LoggerService;
  constructor(
    @InjectModel(Monitor.name) private readonly monitorModel: Model<MonitorDocument>,
    @InjectModel(FeedItem.name) private readonly feedItemModel: Model<FeedItemDocument>,
    @InjectModel(Source.name) private readonly sourceModel: Model<SourceDocument>,
    private readonly config: ConfigService,
    private readonly embeddings: FeedSimEmbeddingService,
    loggerService: LoggerService,
    @Inject(LLM_CHAT) private readonly llm: LlmChatPort,
  ) {
    this.logger =loggerService.createLogger(MonitorsService.name);
   }

  private maxSources(): number {
    const raw = Number(this.config.get('MONITOR_MAX_SOURCES'));
    return Number.isFinite(raw) && raw >= 1 && raw <= 50 ? Math.floor(raw) : 20;
  }

  /** 创建监控时 LLM 至少选择的信源数量 */
  private minSources(): number {
    const raw = Number(this.config.get('MONITOR_MIN_SOURCES'));
    return Number.isFinite(raw) && raw >= 1 && raw <= 50 ? Math.floor(raw) : 10;
  }

  private timelineCandidateCap(): number {
    const raw = Number(this.config.get('MONITOR_TIMELINE_CANDIDATE_CAP'));
    return Number.isFinite(raw) && raw >= 100 && raw <= 20000 ? Math.floor(raw) : 3000;
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
    const mc = d.minCosine;
    const minCosine =
      typeof mc === 'number' && Number.isFinite(mc) ? Math.min(1, Math.max(0, mc)) : 0.52;
    const kw = d.keywords;
    const ent = d.entities;
    const keywords = Array.isArray(kw) ? kw.map((x) => String(x).trim()).filter(Boolean).slice(0, 40) : [];
    const entities = Array.isArray(ent) ? ent.map((x) => String(x).trim()).filter(Boolean).slice(0, 40) : [];
    return {
      id: String(d._id),
      title: String(d.title ?? ''),
      description: String(d.description ?? ''),
      topicPrompt: String(d.topicPrompt ?? ''),
      keywords,
      entities,
      sourceIds: ids.map((x) => String(x)),
      minCosine,
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

  /** 总览页一次返回监控列表 + 各监控侧栏卡片指标，减少多次 intelligence 往返 */
  async listOverviewForUser(
    userId: string,
    recentHours?: number,
  ): Promise<{ monitors: MonitorPublic[]; cards: MonitorOverviewCardPublic[] }> {
    const uid = new Types.ObjectId(userId);
    const rh = recentHours ?? this.defaultRecentHours();
    const docs = await this.monitorModel
      .find({ userId: uid, deletedAt: null })
      .sort({ createdAt: -1 })
      .exec();
    const monitors = docs.map((d) => this.serializeMonitor(d));
    const cards = await Promise.all(docs.map((doc) => this.buildOverviewCard(doc, rh)));
    return { monitors, cards };
  }

  async getOne(monitorId: string, userId: string): Promise<MonitorPublic> {
    const doc = await this.loadOwnedMonitor(monitorId, userId);
    return this.serializeMonitor(doc);
  }

  private parseStringList(raw: unknown, max: number): string[] {
    if (!Array.isArray(raw)) return [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < raw.length && out.length < max; i++) {
      const s = String(raw[i] ?? '').trim();
      if (!s || seen.has(s)) continue;
      seen.add(s);
      out.push(s.slice(0, 64));
    }
    return out;
  }

  private padSourceIdsFromCatalog(
    picked: string[],
    catalogOrderedIds: string[],
    allowed: Set<string>,
    minN: number,
    maxN: number,
  ): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const id of picked) {
      if (!Types.ObjectId.isValid(id) || !allowed.has(id) || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
      if (out.length >= maxN) return out;
    }
    for (const id of catalogOrderedIds) {
      if (out.length >= maxN) break;
      if (!allowed.has(id) || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
    if (out.length < minN) {
      return out;
    }
    return out.slice(0, maxN);
  }

  /**
   * 与 listFeedItems 相同的候选拉取、余弦过滤与排序；供时间线分页与情报聚合复用。
   */
  private async buildScoredMonitorFeed(
    monitor: MonitorDocument,
    recentHours: number,
  ): Promise<{ scored: { doc: Record<string, unknown>; score: number }[]; minSim: number }> {
    const m = monitor.toObject() as {
      descriptionEmbedding: number[];
      sourceIds: Types.ObjectId[];
      minCosine?: number;
    };
    const queryVec = m.descriptionEmbedding;
    if (!Array.isArray(queryVec) || queryVec.length === 0) {
      throw new ServiceUnavailableException('monitor_missing_embedding');
    }

    const cutoff = new Date(Date.now() - recentHours * 3600000);
    const rawMin = m.minCosine;
    const minSim =
      typeof rawMin === 'number' && Number.isFinite(rawMin) ? Math.min(1, Math.max(0, rawMin)) : 0.52;
    const cap = this.timelineCandidateCap();

    const sourceIds = (monitor.sourceIds ?? []).map((x) => new Types.ObjectId(String(x)));
    if (sourceIds.length === 0) {
      return { scored: [], minSim };
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
      const ta = new Date((a.doc.publishedAt as Date | null | undefined) ?? (a.doc.createdAt as Date)).getTime();
      const tb = new Date((b.doc.publishedAt as Date | null | undefined) ?? (b.doc.createdAt as Date)).getTime();
      if (tb !== ta) return tb - ta;
      return b.score - a.score;
    });

    return { scored, minSim };
  }

  async create(userId: string, dto: CreateMonitorDto): Promise<MonitorPublic> {
    if (!this.embeddings.isEnabled()) {
      throw new ServiceUnavailableException('monitor_embedding_required');
    }
    const topicPrompt = dto.topic.trim();
    if (!topicPrompt) throw new BadRequestException('topic_required');

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
    const catalogOrderedIds = catalog.map((c) => c.id);
    const minN = this.minSources();
    const maxN = this.maxSources();

    if (catalog.length < minN) {
      throw new BadRequestException('monitor_catalog_too_small_for_min_sources');
    }

    const planSystem = `你是情报监控规划助手。只输出合法 JSON，不要 markdown。
用户会给出「监控意图（可能很短）」。
请输出：{"title":"10～40字标题，与意图同语言","description":"正式监控说明，不少于80个字符，用于检索与展示；客观概括范围与边界","keywords":["若干关键词，2～5项"],"entities":["若干实体名，2～5项"]}
要求：
1. description 必须介于 80 - 120 个字符（中文按字符计）。
2. keywords / entities 简洁、可去重，勿空数组。
3. 不要输出信源 id。`;

    let title = topicPrompt.slice(0, 40);
    let expandedDescription = '';
    let keywords: string[] = [];
    let entities: string[] = [];

    try {
      const plan = (await this.llm.completeJson<LlmMonitorPlan>(planSystem, JSON.stringify({ topic: topicPrompt }))) as LlmMonitorPlan;
      const t = typeof plan.title === 'string' ? plan.title.trim().slice(0, 200) : '';
      if (t) title = t;
      const d = typeof plan.description === 'string' ? plan.description.trim() : '';
      expandedDescription = d;
      keywords = this.parseStringList(plan.keywords, 20);
      entities = this.parseStringList(plan.entities, 20);
    } catch {
      throw new ServiceUnavailableException('monitor_llm_plan_failed');
    }

    const srcSystem = `你是信源选择助手。只输出合法 JSON，不要 markdown。
输入包含「监控说明」与「候选信源列表」（id、displayName、kind、note）。
输出格式：{"sourceIds":["24位hex的Mongo id",...]}
要求：
1. sourceIds 只能从候选 id 中选，禁止编造；去重；数量在 ${minN}～${maxN} 之间。
2. 优先多样性与话题覆盖。`;

    const srcPayload = JSON.stringify(
      { description: expandedDescription, keywords, entities, sources: catalog },
      null,
      0,
    );

    let sourceIdStrs: string[] = [];
    try {
      const out = (await this.llm.completeJson<LlmMonitorSourcesPick>(srcSystem, srcPayload)) as LlmMonitorSourcesPick;
      const arr = Array.isArray(out.sourceIds) ? out.sourceIds : [];
      const seen = new Set<string>();
      for (let i = 0; i < arr.length && sourceIdStrs.length < maxN; i++) {
        const id = String(arr[i] ?? '').trim();
        if (!Types.ObjectId.isValid(id)) continue;
        if (!allowedIds.has(id)) continue;
        if (seen.has(id)) continue;
        seen.add(id);
        sourceIdStrs.push(id);
      }
    } catch {
      throw new ServiceUnavailableException('monitor_llm_sources_failed');
    }

    sourceIdStrs = this.padSourceIdsFromCatalog(sourceIdStrs, catalogOrderedIds, allowedIds, minN, maxN);
    if (sourceIdStrs.length < minN) {
      throw new BadRequestException('monitor_not_enough_sources');
    }

    const emb = await this.embeddings.embedBatch([expandedDescription]);
    const vec = emb[0];
    if (!vec?.length) {
      throw new ServiceUnavailableException('monitor_embedding_failed');
    }

    const embeddingModel = this.config.get<string>('FEED_EMBEDDING_MODEL')?.trim() || 'text-embedding-3-small';
    const uid = new Types.ObjectId(userId);
    const doc = await this.monitorModel.create({
      userId: uid,
      title,
      description: expandedDescription,
      topicPrompt,
      keywords,
      entities,
      sourceIds: sourceIdStrs.map((id) => new Types.ObjectId(id)),
      descriptionEmbedding: vec,
      embeddingModel,
      deletedAt: null,
    });

    return this.serializeMonitor(doc);
  }

  async listFeedItems(monitorId: string, userId: string, q: ListMonitorFeedQueryDto) {
    const monitor = await this.loadOwnedMonitor(monitorId, userId);
    const recentHours = q.recentHours ?? this.defaultRecentHours();
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 30;

    const m0 = monitor.toObject() as { descriptionEmbedding: number[] };
    const queryVec = m0.descriptionEmbedding;
    if (!Array.isArray(queryVec) || queryVec.length === 0) {
      const rawMin0 = monitor.minCosine;
      const minSim0 =
        typeof rawMin0 === 'number' && Number.isFinite(rawMin0) ? Math.min(1, Math.max(0, rawMin0)) : 0.52;
      return { items: [], total: 0, page, pageSize, recentHours, monitorId, minCosine: minSim0 };
    }

    const { scored, minSim } = await this.buildScoredMonitorFeed(monitor, recentHours);
    const total = scored.length;
    const slice = scored.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);
    const items = slice.map((s) => ({
      ...serializeFeedItem(s.doc),
      relevanceScore: Math.round(s.score * 1000) / 1000,
    }));

    return { items, total, page, pageSize, recentHours, monitorId, minCosine: minSim };
  }

  private utcDateKey(d: Date): string {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private heatIndexFromSignals(
    count24h: number,
    count7d: number,
    avgRelevance: number,
    boundSourceCount: number,
    totalInWindow: number,
  ): number | null {
    if (totalInWindow === 0) return null;
    const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
    const n = (x: number, lo: number, hi: number) => (hi <= lo ? 0 : clamp01((x - lo) / (hi - lo)));
    const raw =
      0.35 * n(count24h, 0, 20) +
      0.25 * n(avgRelevance, 0.52, 0.92) +
      0.2 * n(boundSourceCount, 8, 24) +
      0.2 * n(count7d, 0, 100);
    return Math.round(raw * 100) / 10;
  }

  private emptySevenDayTrend(): { date: string; count: number }[] {
    const now = Date.now();
    const out: { date: string; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(now - (6 - d) * 86400000);
      out.push({ date: this.utcDateKey(day), count: 0 });
    }
    return out;
  }

  private intelligenceFromScored(
    monitor: MonitorDocument,
    recentHours: number,
    scored: { doc: Record<string, unknown>; score: number }[],
    minSim: number,
  ): Omit<MonitorIntelligencePublic, 'monitorId' | 'recentHours' | 'minCosine'> {
    const now = Date.now();
    const h24 = now - 24 * 3600000;
    const h168 = now - 168 * 3600000;

    let newLast24h = 0;
    let count7d = 0;
    let sumScore = 0;
    const tagCount = new Map<string, number>();

    for (let i = 0; i < scored.length; i++) {
      const row = scored[i].doc;
      const t = new Date((row.publishedAt as Date | null | undefined) ?? (row.createdAt as Date)).getTime();
      const sc = scored[i].score;
      sumScore += sc;
      if (t >= h24) newLast24h += 1;
      if (t >= h168) count7d += 1;
      const rawTags = row.llmTags;
      if (Array.isArray(rawTags)) {
        for (let j = 0; j < rawTags.length; j++) {
          const tag = String(rawTags[j] ?? '').trim();
          if (!tag) continue;
          tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1);
        }
      }
    }

    const totalInWindow = scored.length;
    const avgRelevance = totalInWindow > 0 ? sumScore / totalInWindow : 0;
    const boundSourceCount = (monitor.sourceIds ?? []).length;
    const heatIndex = this.heatIndexFromSignals(newLast24h, count7d, avgRelevance, boundSourceCount, totalInWindow);

    const lastActivityAt =
      scored.length > 0
        ? new Date(
            (scored[0].doc.publishedAt as Date | null | undefined) ?? (scored[0].doc.createdAt as Date),
          ).toISOString()
        : null;

    const trendMap = new Map<string, number>();
    for (let d = 0; d < 7; d++) {
      const day = new Date(now - (6 - d) * 86400000);
      trendMap.set(this.utcDateKey(day), 0);
    }
    for (let i = 0; i < scored.length; i++) {
      const dt = new Date((scored[i].doc.publishedAt as Date | null | undefined) ?? (scored[i].doc.createdAt as Date));
      const key = this.utcDateKey(dt);
      if (trendMap.has(key)) trendMap.set(key, (trendMap.get(key) ?? 0) + 1);
    }
    const trend = [...trendMap.entries()].map(([date, count]) => ({ date, count }));

    const chartKeywords = [...tagCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 16)
      .map(([name, count]) => ({ name, count }));

    const topKw = chartKeywords.map((k) => k.name);
    const weeklyBrief: string[] = [];
    weeklyBrief.push(
      `在当前时间窗（近 ${recentHours} 小时）内，与监控描述语义匹配且达到相似度阈值（≥${minSim}）的条目共 ${totalInWindow} 条；其中过去 24 小时新增 ${newLast24h} 条，近 7 日（按条目发布时间计）共 ${count7d} 条。`,
    );
    if (topKw.length > 0) {
      weeklyBrief.push(`从条目标签聚合的高频词包括：${topKw.slice(0, 10).join('、')}。以上为基于站内采集数据的自动摘要，具体线索请查看时间线。`);
    } else {
      weeklyBrief.push('暂无足够标签聚合关键词；请确认信源已产出且条目已完成富化。');
    }

    const latestItems = scored.slice(0, 5).map((s) => ({
      ...serializeFeedItem(s.doc),
      relevanceScore: Math.round(s.score * 1000) / 1000,
    }));

    return {
      lastActivityAt,
      metrics: {
        newLast24h,
        totalInWindow,
        boundSourceCount,
      },
      heatIndex,
      weeklyBrief,
      trend,
      chartKeywords,
      latestItems,
    };
  }

  private async buildOverviewCard(
    monitor: MonitorDocument,
    recentHours: number,
  ): Promise<MonitorOverviewCardPublic> {
    const monitorId = String(monitor._id);
    const m0 = monitor.toObject() as { descriptionEmbedding: number[] };
    if (!Array.isArray(m0.descriptionEmbedding) || m0.descriptionEmbedding.length === 0) {
      return {
        monitorId,
        heatIndex: null,
        newLast24h: 0,
        lastActivityAt: null,
        trend: this.emptySevenDayTrend(),
      };
    }
    const { scored, minSim } = await this.buildScoredMonitorFeed(monitor, recentHours);
    const agg = this.intelligenceFromScored(monitor, recentHours, scored, minSim);
    return {
      monitorId,
      heatIndex: agg.heatIndex,
      newLast24h: agg.metrics.newLast24h,
      lastActivityAt: agg.lastActivityAt,
      trend: agg.trend,
    };
  }

  async getIntelligence(
    monitorId: string,
    userId: string,
    q: ListMonitorIntelligenceQueryDto,
  ): Promise<MonitorIntelligencePublic> {
    const monitor = await this.loadOwnedMonitor(monitorId, userId);
    const recentHours = q.recentHours ?? this.defaultRecentHours();

    const m0 = monitor.toObject() as { descriptionEmbedding: number[] };
    const queryVec = m0.descriptionEmbedding;
    const rawMin0 = monitor.minCosine;
    const minSimFallback =
      typeof rawMin0 === 'number' && Number.isFinite(rawMin0) ? Math.min(1, Math.max(0, rawMin0)) : 0.52;

    if (!Array.isArray(queryVec) || queryVec.length === 0) {
      return {
        monitorId,
        recentHours,
        minCosine: minSimFallback,
        lastActivityAt: null,
        metrics: { newLast24h: 0, totalInWindow: 0, boundSourceCount: (monitor.sourceIds ?? []).length },
        heatIndex: null,
        weeklyBrief: ['该监控缺少描述向量，无法聚合情报；请重新创建或联系管理员。'],
        trend: this.emptySevenDayTrend(),
        chartKeywords: [],
        latestItems: [],
      };
    }

    const { scored, minSim } = await this.buildScoredMonitorFeed(monitor, recentHours);
    const agg = this.intelligenceFromScored(monitor, recentHours, scored, minSim);
    return {
      monitorId,
      recentHours,
      minCosine: minSim,
      ...agg,
    };
  }

  async patchSources(monitorId: string, userId: string, dto: PatchMonitorSourcesDto): Promise<MonitorPublic> {
    const monitor = await this.loadOwnedMonitor(monitorId, userId);
    const resolved = await this.resolveValidSourceObjectIds(dto.sourceIds);
    monitor.sourceIds = resolved;
    if (dto.minCosine !== undefined) {
      monitor.minCosine = dto.minCosine;
    }
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
