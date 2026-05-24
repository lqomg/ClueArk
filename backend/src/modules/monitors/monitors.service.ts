import { createHash } from 'crypto';
import { BadRequestException, Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import { LLM_CHAT } from '../llm/llm.tokens';
import type { LlmChatPort } from '../llm/llm.types';
import { Monitor, MonitorDocument } from './schemas/monitor.schema';
import { Source, SourceDocument } from '../sources/schemas/source.schema';
import { FeedSimEmbeddingService } from '../feed-items/feed-sim-embedding.service';
import { serializeFeedItem } from '../feed-items/feed-item.serialize';
import { dedupeScoredByCluster } from '../feed-items/feed-cluster-timeline.util';
import { MonitorPipelineService } from '../monitor-pipeline/monitor-pipeline.service';
import { UsersService } from '../users/users.service';
import { MonitorSnapshotService } from './monitor-snapshot.service';
import { MonitoredSourcesService } from './monitored-sources.service';
import { JobSchedulerService } from '../job-center/job-scheduler.service';
import { VectorStoreService } from '../vector-store/vector-store.service';
import {
  dateKeyInTimeZone,
  formatReferenceNowIsoForLlm,
  formatReferenceNowReadableZh,
  sevenDayTrendDateKeys,
} from '../../common/utils/timezone.utils';
import type { CreateMonitorDto } from './dto/create-monitor.dto';
import type { ListMonitorFeedQueryDto } from './dto/list-monitor-feed.query.dto';
import type { ListMonitorIntelligenceQueryDto } from './dto/list-monitor-intelligence.query.dto';
import type { PatchMonitorSourcesDto } from './dto/patch-monitor-sources.dto';
import { LoggerService } from '../logger';
import { MonitorBriefRun, MonitorBriefRunDocument } from './schemas/monitor-brief-run.schema';
import {
  BRIEF_LLM_SYSTEM_VERSION,
  DEFAULT_BRIEF_PROFILE_ID,
  getBriefProfileById,
  resolveBriefProfiles,
  resolveWindow,
  type BriefProfile,
  type ResolvedWindow,
} from './brief-profiles';

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

type LlmMonitorBriefResponse = {
  paragraphs?: unknown;
  citedItemIds?: unknown;
};

/** 聚合指标（不含 weeklyBrief；count7d 供 LLM 上下文，不对前端单独暴露） */
export type MonitorIntelligenceAggregate = Omit<
  MonitorIntelligencePublic,
  'monitorId' | 'recentHours' | 'minCosine' | 'weeklyBrief'
> & { count7d: number };

export type MonitorPublic = {
  id: string;
  title: string;
  description: string;
  topicPrompt: string;
  keywords: string[];
  entities: string[];
  sourceIds: string[];
  /** 时间线最低余弦相似度（0～1），存库默认 0.43 */
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
  /** 异步研判摘要元数据；无成功记录时可为 null */
  briefMeta?: {
    profileId: string;
    periodKey: string;
    windowLabel: string;
    completedAt: string | null;
    runId: string | null;
  };
};

/** 总览侧栏卡片用轻量指标（与情报同一时间窗逻辑一致） */
export type MonitorOverviewCardPublic = {
  monitorId: string;
  heatIndex: number | null;
  newLast24h: number;
  lastActivityAt: string | null;
  trend: { date: string; count: number }[];
};

/** GET /monitors 每条内嵌的轻量指标（不含 monitorId，与父级 id 一致） */
export type MonitorListMetricsPublic = Omit<MonitorOverviewCardPublic, 'monitorId'>;

export type MonitorListItemPublic = MonitorPublic & {
  snapshotStatus: string;
  metrics: MonitorListMetricsPublic;
};

const MONITOR_MIN_SOURCES=10;
const MONITOR_MAX_SOURCES=30;


@Injectable()
export class MonitorsService {
  private readonly logger: LoggerService;

  constructor(
    @InjectModel(Monitor.name) private readonly monitorModel: Model<MonitorDocument>,
    @InjectModel(MonitorBriefRun.name) private readonly briefRunModel: Model<MonitorBriefRunDocument>,
    @InjectModel(Source.name) private readonly sourceModel: Model<SourceDocument>,
    private readonly config: ConfigService,
    private readonly embeddings: FeedSimEmbeddingService,
    private readonly snapshotService: MonitorSnapshotService,
    private readonly monitoredSources: MonitoredSourcesService,
    private readonly scheduler: JobSchedulerService,
    private readonly vectorStore: VectorStoreService,
    private readonly pipeline: MonitorPipelineService,
    loggerService: LoggerService,
    @Inject(LLM_CHAT) private readonly llm: LlmChatPort,
    private readonly usersService: UsersService,
  ) {
    this.logger = loggerService.createLogger(MonitorsService.name);
  }


  private defaultRecentHours(): number {
    const raw = Number(this.config.get('MONITOR_DEFAULT_RECENT_HOURS'));
    return Number.isFinite(raw) && raw >= 1 && raw <= 2160 ? Math.floor(raw) : 720;
  }

  private llmCatalogCap(): number {
    const raw = Number(this.config.get('MONITOR_LLM_SOURCE_CATALOG_CAP'));
    return Number.isFinite(raw) && raw >= 20 && raw <= 500 ? Math.floor(raw) : 200;
  }

  private briefEvidenceCap(): number {
    const raw = Number(this.config.get('MONITOR_BRIEF_EVIDENCE_CAP'));
    return Number.isFinite(raw) && raw >= 3 && raw <= 40 ? Math.floor(raw) : 14;
  }

  private briefSummaryMaxChars(): number {
    const raw = Number(this.config.get('MONITOR_BRIEF_SUMMARY_MAX_CHARS'));
    return Number.isFinite(raw) && raw >= 80 && raw <= 4000 ? Math.floor(raw) : 480;
  }

  private briefRecommendMaxChars(): number {
    const raw = Number(this.config.get('MONITOR_BRIEF_RECOMMEND_MAX_CHARS'));
    return Number.isFinite(raw) && raw >= 0 && raw <= 2000 ? Math.floor(raw) : 240;
  }

  private serializeMonitor(doc: MonitorDocument | Record<string, unknown>): MonitorPublic {
    const d = doc as Record<string, unknown>;
    const ids = (d.sourceIds as Types.ObjectId[] | undefined) ?? [];
    const mc = d.minCosine;
    const minCosine =
      typeof mc === 'number' && Number.isFinite(mc) ? Math.min(1, Math.max(0, mc)) : 0.43;
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

  /**
   * 监控列表：每条含与情报同一时间窗下的轻量聚合指标（Heat、24h 增量、7 日趋势等），
   * 供研判页/管理页仅依赖 GET /monitors + GET /monitors/:id/intelligence。
   */
  async listForUser(userId: string, recentHours?: number): Promise<MonitorListItemPublic[]> {
    const uid = new Types.ObjectId(userId);
    const rh = recentHours ?? this.defaultRecentHours();
    const docs = await this.monitorModel
      .find({ userId: uid, deletedAt: null })
      .sort({ createdAt: -1 })
      .exec();
    const viewerTz = await this.usersService.getTimeZoneOrDefault(userId);
    const cards = await Promise.all(docs.map((doc) => this.buildOverviewCard(doc, rh, viewerTz)));
    this.logger.debug(`monitor_list_for_user userId=${userId} recentHours=${rh} count=${docs.length}`);
    return docs.map((d, i) => {
      const m = this.serializeMonitor(d);
      const c = cards[i];
      return {
        ...m,
        snapshotStatus: String(d.snapshotStatus ?? 'pending'),
        metrics: {
          heatIndex: c.heatIndex,
          newLast24h: c.newLast24h,
          lastActivityAt: c.lastActivityAt,
          trend: c.trend,
        },
      };
    });
  }

  async getOne(monitorId: string, userId: string): Promise<MonitorPublic> {
    const doc = await this.loadOwnedMonitor(monitorId, userId);
    this.logger.debug(`monitor_get_one monitorId=${monitorId} userId=${userId}`);
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

  private minSimFromMonitor(monitor: MonitorDocument): number {
    const rawMin = monitor.minCosine;
    return typeof rawMin === 'number' && Number.isFinite(rawMin) ? Math.min(1, Math.max(0, rawMin)) : 0.43;
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
    const minN = MONITOR_MIN_SOURCES;
    const maxN = MONITOR_MAX_SOURCES;

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

    const uid = new Types.ObjectId(userId);
    const doc = await this.monitorModel.create({
      userId: uid,
      title,
      description: expandedDescription,
      topicPrompt,
      keywords,
      entities,
      sourceIds: sourceIdStrs.map((id) => new Types.ObjectId(id)),
      deletedAt: null,
    });

    const monitorId = String(doc._id);
    await this.pipeline.upsertMonitorPoint(doc, vec);
    await this.monitoredSources.applyMonitorSourceDiff([], sourceIdStrs);
    await this.scheduler.enqueueReindexMonitor(monitorId, true, { trigger: 'api' });
    await this.scheduler.enqueueComputeSnapshot(monitorId, this.defaultRecentHours(), 2, {
      trigger: 'api',
    });

    this.logger.log(
      `monitor_created id=${monitorId} userId=${userId} sources=${sourceIdStrs.length}`,
    );
    return this.serializeMonitor(doc);
  }

  async listClusterFeedItems(monitorId: string, clusterId: string, userId: string) {
    const monitor = await this.loadOwnedMonitor(monitorId, userId);
    return this.snapshotService.listClusterItemsForMonitor(monitor, clusterId);
  }

  async listFeedItems(monitorId: string, userId: string, q: ListMonitorFeedQueryDto) {
    const monitor = await this.loadOwnedMonitor(monitorId, userId);
    const recentHours = q.recentHours ?? this.defaultRecentHours();
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 30;

    const vec = await this.vectorStore.getMonitorVector(monitorId);
    const rawMin0 = monitor.minCosine;
    const minSimFallback =
      typeof rawMin0 === 'number' && Number.isFinite(rawMin0) ? Math.min(1, Math.max(0, rawMin0)) : 0.43;
    if (!vec?.length) {
      this.logger.debug(
        `monitor_list_feed_items monitorId=${monitorId} page=${page} no_qdrant_vector total=0`,
      );
      return { items: [], total: 0, page, pageSize, recentHours, monitorId, minCosine: minSimFallback };
    }

    const { items, total, minSim } = await this.snapshotService.listFeedPage(
      monitor,
      recentHours,
      page,
      pageSize,
    );

    this.logger.debug(
      `monitor_list_feed_items monitorId=${monitorId} page=${page} recentHours=${recentHours} total=${total} returned=${items.length}`,
    );
    return { items, total, page, pageSize, recentHours, monitorId, minCosine: minSim };
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
      0.35 * n(count24h, 0, 10) +
      0.25 * n(avgRelevance, 0.42, 0.92) +
      0.1 * n(boundSourceCount, 8, 24) +
      0.3 * n(count7d, 0, 50);
    return Math.round(raw * 100) / 10;
  }

  private emptySevenDayTrend(viewerTimeZone: string): { date: string; count: number }[] {
    return sevenDayTrendDateKeys(new Date(), viewerTimeZone).map((date) => ({ date, count: 0 }));
  }

  /**
   * 从 scored 聚合图表与指标；不包含 weeklyBrief。
   * trend 按 viewerTimeZone 日历日分桶；newLast24h / count7d 仍为 UTC 毫秒窗口。
   */
  private aggregateIntelligenceFromScored(
    monitor: MonitorDocument,
    recentHours: number,
    scored: { doc: Record<string, unknown>; score: number }[],
    minSim: number,
    viewerTimeZone: string,
  ): MonitorIntelligenceAggregate {
    const nowMs = Date.now();
    const h24 = nowMs - 24 * 3600000;
    const h168 = nowMs - 168 * 3600000;

    let newLast24h = 0;
    let count7d = 0;
    let sumScore = 0;
    const tagCount = new Map<string, number>();

    for (let i = 0; i < scored.length; i++) {
      const row = scored[i].doc;
      const t = new Date(row.publishedAt as Date).getTime();
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
      scored.length > 0 ? new Date(scored[0].doc.publishedAt as Date).toISOString() : null;

    const trendKeys = sevenDayTrendDateKeys(new Date(nowMs), viewerTimeZone);
    const trendMap = new Map<string, number>();
    for (let k = 0; k < trendKeys.length; k++) {
      trendMap.set(trendKeys[k], 0);
    }
    for (let i = 0; i < scored.length; i++) {
      const dt = new Date(scored[i].doc.publishedAt as Date);
      const key = dateKeyInTimeZone(dt, viewerTimeZone);
      if (trendMap.has(key)) trendMap.set(key, (trendMap.get(key) ?? 0) + 1);
    }
    const trend = trendKeys.map((date) => ({ date, count: trendMap.get(date) ?? 0 }));

    const chartKeywords = [...tagCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 16)
      .map(([name, count]) => ({ name, count }));

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
      trend,
      chartKeywords,
      latestItems,
      count7d,
    };
  }

  /** 同簇只保留首条（scored 已按时间/分数排序），再截断条数上限 */
  private selectBriefEvidenceRows(
    scored: { doc: Record<string, unknown>; score: number }[],
    cap: number,
  ): { doc: Record<string, unknown>; score: number }[] {
    return dedupeScoredByCluster(scored).slice(0, cap);
  }

  private briefLogSkippedEnabled(): boolean {
    const v = this.config.get<string>('MONITOR_BRIEF_LOG_SKIPPED')?.trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
  }

  private computeBriefInputFingerprint(params: {
    monitorId: string;
    monitorUpdatedAt: Date | null | undefined;
    profileId: string;
    windowMode: string;
    periodKey: string;
    minSim: number;
    agg: MonitorIntelligenceAggregate;
    evidenceRows: { doc: Record<string, unknown>; score: number }[];
  }): string {
    const idParts = params.evidenceRows.map((e) => {
      const d = e.doc;
      const id = String(d._id);
      const u = d.updatedAt ? new Date(d.updatedAt as Date).toISOString() : '';
      return `${id}:${u}`;
    });
    const mu = params.monitorUpdatedAt ? new Date(params.monitorUpdatedAt).toISOString() : '';
    const payload = {
      monitorId: params.monitorId,
      monitorUpdatedAt: mu,
      profileId: params.profileId,
      windowMode: params.windowMode,
      periodKey: params.periodKey,
      minSim: params.minSim,
      sys: BRIEF_LLM_SYSTEM_VERSION,
      m: params.agg.metrics,
      c7: params.agg.count7d,
      hi: params.agg.heatIndex,
      ck: params.agg.chartKeywords.slice(0, 8),
      ev: idParts,
    };
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  private buildEvidenceSnapshot(
    evidenceRows: { doc: Record<string, unknown>; score: number }[],
    summaryMax: number,
  ): Record<string, unknown>[] {
    const out: Record<string, unknown>[] = [];
    for (let i = 0; i < evidenceRows.length; i++) {
      const row = evidenceRows[i].doc;
      const ser = serializeFeedItem(row);
      let summary = ser.summary;
      if (summary.length > summaryMax) summary = `${summary.slice(0, summaryMax)}…`;
      const cid = row.clusterId as Types.ObjectId | null | undefined;
      out.push({
        feedItemId: ser.id,
        title: ser.title,
        summary,
        publishedAt: ser.publishedAt,
        sourceId: ser.sourceId,
        sourceDisplayName: ser.sourceDisplayName,
        relevanceScore: Math.round(evidenceRows[i].score * 1000) / 1000,
        clusterId: cid ? String(cid) : null,
        updatedAt: row.updatedAt ? new Date(row.updatedAt as Date).toISOString() : null,
      });
    }
    return out;
  }

  private validateLlmBrief(
    out: LlmMonitorBriefResponse,
    allowedIds: Set<string>,
  ): { paragraphs: string[]; citedItemIds: string[] } | null {
    const raw = out.paragraphs;
    if (!Array.isArray(raw) || raw.length === 0) return null;
    const paragraphs: string[] = [];
    for (let i = 0; i < raw.length && paragraphs.length < 4; i++) {
      const p = String(raw[i] ?? '').trim();
      if (p) paragraphs.push(p);
    }
    if (paragraphs.length < 2 || paragraphs.length > 4) return null;
    const idsRaw = out.citedItemIds;
    if (!Array.isArray(idsRaw)) return null;
    const citedItemIds: string[] = [];
    for (let i = 0; i < idsRaw.length; i++) {
      const id = String(idsRaw[i] ?? '').trim();
      if (!id) continue;
      if (!allowedIds.has(id)) return null;
      citedItemIds.push(id);
    }
    return { paragraphs, citedItemIds };
  }

  private buildEvidenceItemsForLlm(
    evidenceRows: { doc: Record<string, unknown>; score: number }[],
  ): {
    evidenceItems: Record<string, unknown>[];
    allowedIds: Set<string>;
  } {
    const summaryMax = this.briefSummaryMaxChars();
    const recMax = this.briefRecommendMaxChars();
    const evidenceItems = evidenceRows.map((s) => {
      const row = s.doc;
      const ser = serializeFeedItem(row);
      let summary = ser.summary;
      if (summary.length > summaryMax) summary = `${summary.slice(0, summaryMax)}…`;
      let recommendReason = ser.recommendReason ?? '';
      if (recMax > 0 && recommendReason.length > recMax) {
        recommendReason = `${recommendReason.slice(0, recMax)}…`;
      } else if (recMax === 0) {
        recommendReason = '';
      }
      return {
        id: ser.id,
        title: ser.title,
        summary,
        publishedAt: ser.publishedAt,
        sourceDisplayName: ser.sourceDisplayName,
        relevanceScore: Math.round(s.score * 1000) / 1000,
        tags: ser.tags,
        recommendReason,
      };
    });
    return { evidenceItems, allowedIds: new Set(evidenceItems.map((e) => String(e.id))) };
  }

  private async buildWeeklyBriefViaLlm(params: {
    monitor: MonitorDocument;
    agg: MonitorIntelligenceAggregate;
    evidenceRows: { doc: Record<string, unknown>; score: number }[];
    briefContext: Record<string, unknown>;
    ownerTimeZone: string;
    referenceNow: Date;
  }): Promise<{ paragraphs: string[]; citedItemIds: string[] } | null> {
    const { monitor, agg, evidenceRows, briefContext, ownerTimeZone, referenceNow } = params;
    const pub = this.serializeMonitor(monitor);
    const monitorPayload = {
      title: pub.title,
      description: pub.description,
      topicPrompt: pub.topicPrompt,
      keywords: pub.keywords,
      entities: pub.entities,
    };
    const { evidenceItems, allowedIds } = this.buildEvidenceItemsForLlm(evidenceRows);
    const referenceNowIso = formatReferenceNowIsoForLlm(referenceNow, ownerTimeZone);
    const referenceNowReadableZh = formatReferenceNowReadableZh(referenceNow, ownerTimeZone);
    const system = `你是情报监控「研判摘要」写作助手。只输出合法 JSON，不要 markdown 代码块。
输出格式：{"paragraphs":["段落1","段落2",...],"citedItemIds":["条目id",...]}
要求：
1. paragraphs 共 2～3 段中文（情报综述语气），每段 30～120 字，全文总字数不超过 300。
2. 第 1 段必须直接切入 evidenceItems 中的实质线索：主体、事件、分歧或趋势判断；禁止复述仪表盘已有信息——不得写时间窗口径、窗内总条数、24h 新增、热度指数、关键词榜排名、按日条数峰值或「共监测到 X 条」类套话。禁止以「本分析窗/近 X 小时/某日至某日 + 条数或峰值」这类统计总起句。凡叙述具体事件、发布或关键节点时，须写出可核对的时间：优先用相对表述（刚刚、N 分钟前、N 小时前、今天、昨天、本周等），必须以 user 中的 referenceNowIso / referenceNowReadableZh 与 userTimeZone 为「现在」参照，结合各条 publishedAt（ISO UTC）换算，与证据一致，不得编造。
3. 第 2、3 段同样遵守第 2 条时间规则；涉及 briefContext 汇总指标数字时全文至多 1～2 个且须与 briefContext 一致；证据中的事件日期/时点不受该条数限制，忌堆砌。
4. 叙事须基于 evidenceItems 的标题/摘要/标签/推荐语及 publishedAt；不得捏造证据中未出现的公司、产品、金额、日期。
5. citedItemIds 为本次写作实际依据的条目 id 列表，须全部为 evidenceItems 中的 id，可为空数组。
6. 段落中若需强调术语，可使用 Markdown 加粗：**术语**（仅此一种内联格式）。`;

    const user = JSON.stringify({
      monitor: monitorPayload,
      briefContext,
      evidenceItems,
      userTimeZone: ownerTimeZone,
      referenceNowIso,
      referenceNowReadableZh,
    });

    const raw = (await this.llm.completeJson<LlmMonitorBriefResponse>(system, user)) as LlmMonitorBriefResponse;
    return this.validateLlmBrief(raw, allowedIds);
  }

  private async findLatestSucceededBriefRun(
    monitorOid: Types.ObjectId,
    profileId: string,
    minCosine: number,
  ): Promise<MonitorBriefRunDocument | null> {
    return this.briefRunModel
      .findOne({
        monitorId: monitorOid,
        profileId,
        status: 'succeeded',
        minCosine,
      })
      .sort({ completedAt: -1 })
      .exec();
  }

  /** BullMQ worker：单监控 + 单研判 profile */
  async runBriefForMonitorId(
    monitorId: string,
    profileId: string,
    jobId?: string,
  ): Promise<void> {
    const monitor = await this.monitorModel.findById(monitorId).exec();
    if (!monitor || monitor.deletedAt) return;
    const profiles = resolveBriefProfiles(this.config);
    const profile = getBriefProfileById(profiles, profileId);
    if (!profile) return;
    await this.runBriefPipelineForMonitor(monitor, profile, new Date(), jobId);
  }

  async runBriefPipelineForMonitor(
    monitor: MonitorDocument,
    profile: BriefProfile,
    now: Date,
    jobId?: string,
  ): Promise<void> {
    const monitorId = monitor._id as Types.ObjectId;
    const userId = monitor.userId as Types.ObjectId;
    const monitorIdStr = String(monitorId);
    const jobRef =
      jobId && Types.ObjectId.isValid(jobId) ? { jobId: new Types.ObjectId(jobId) } : {};
    const qdrantVec = await this.vectorStore.getMonitorVector(monitorIdStr);
    if (!qdrantVec?.length) {
      this.logger.debug(`monitor_brief_skip_no_vector monitorId=${monitorIdStr}`);
      return;
    }

    let window: ResolvedWindow;
    try {
      window = resolveWindow(profile, now.getTime(), this.defaultRecentHours());
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`monitor_brief_resolve_window monitorId=${monitorIdStr} err=${msg}`);
      return;
    }

    const { scored, minSim } = await this.snapshotService.fetchScoredForMonitor(
      monitor,
      window.periodStart.getTime(),
      window.periodEnd.getTime(),
    );
    const ownerTz = await this.usersService.getTimeZoneOrDefault(String(userId));
    const agg = this.aggregateIntelligenceFromScored(
      monitor,
      window.rollingRecentHoursEffective,
      scored,
      minSim,
      ownerTz,
    );
    const cap = this.briefEvidenceCap();
    const evidenceRows = this.selectBriefEvidenceRows(scored, cap);
    const fp = this.computeBriefInputFingerprint({
      monitorId: monitorIdStr,
      monitorUpdatedAt: (monitor.toObject() as { updatedAt?: Date }).updatedAt,
      profileId: profile.profileId,
      windowMode: profile.windowMode,
      periodKey: window.periodKey,
      minSim,
      agg,
      evidenceRows,
    });

    const lastOk = await this.findLatestSucceededBriefRun(monitorId, profile.profileId, minSim);
    if (lastOk && lastOk.inputFingerprint === fp) {
      if (this.briefLogSkippedEnabled()) {
        const t0 = Date.now();
        await this.briefRunModel.create({
          ...jobRef,
          monitorId,
          userId,
          profileId: profile.profileId,
          windowMode: profile.windowMode,
          periodKey: window.periodKey,
          periodStart: window.periodStart,
          periodEnd: window.periodEnd,
          minCosine: minSim,
          inputFingerprint: fp,
          status: 'skipped_unchanged',
          evidenceSnapshot: [],
          briefContextSnapshot: null,
          monitorSnapshot: null,
          systemPromptVersion: BRIEF_LLM_SYSTEM_VERSION,
          paragraphs: [],
          citedItemIds: [],
          errorMessage: '',
          durationMs: Date.now() - t0,
          startedAt: new Date(t0),
          completedAt: new Date(),
        });
        this.logger.log(
          `monitor_brief_skipped_unchanged_logged monitorId=${monitorIdStr} profileId=${profile.profileId} periodKey=${window.periodKey}`,
        );
      } else {
        this.logger.debug(
          `monitor_brief_skipped_unchanged monitorId=${monitorIdStr} profileId=${profile.profileId} periodKey=${window.periodKey}`,
        );
      }
      return;
    }

    const summaryMax = this.briefSummaryMaxChars();
    const evidenceSnapshot = this.buildEvidenceSnapshot(evidenceRows, summaryMax);
    const pub = this.serializeMonitor(monitor);
    const monitorSnapshot = {
      title: pub.title,
      description: pub.description,
      topicPrompt: pub.topicPrompt,
      keywords: pub.keywords,
      entities: pub.entities,
      sourceIds: pub.sourceIds,
      minCosine: pub.minCosine,
    };

    const briefContext: Record<string, unknown> = {
      profileId: profile.profileId,
      windowMode: profile.windowMode,
      periodKey: window.periodKey,
      windowLabel: window.windowLabel,
      periodStart: window.periodStart.toISOString(),
      periodEnd: window.periodEnd.toISOString(),
      rollingRecentHours: window.rollingRecentHoursEffective,
      minCosine: minSim,
      systemPromptVersion: BRIEF_LLM_SYSTEM_VERSION,
      totalInWindow: agg.metrics.totalInWindow,
      newLast24h: agg.metrics.newLast24h,
      count7d: agg.count7d,
      heatIndex: agg.heatIndex,
      boundSourceCount: agg.metrics.boundSourceCount,
      chartKeywords: agg.chartKeywords.slice(0, 12),
      trend7d: agg.trend,
    };

    const startedAt = new Date();
    if (scored.length === 0) {
      const paragraphs = [
        '当前时间窗内无达到相似度阈值的条目。',
        '以上为系统自动结论；有新线索进入时间窗后，定时任务将重新生成研判摘要。',
      ];
      await this.briefRunModel.create({
        ...jobRef,
        monitorId,
        userId,
        profileId: profile.profileId,
        windowMode: profile.windowMode,
        periodKey: window.periodKey,
        periodStart: window.periodStart,
        periodEnd: window.periodEnd,
        minCosine: minSim,
        inputFingerprint: fp,
        status: 'succeeded',
        evidenceSnapshot: [],
        briefContextSnapshot: { ...briefContext, totalInWindow: 0 },
        monitorSnapshot,
        systemPromptVersion: BRIEF_LLM_SYSTEM_VERSION,
        paragraphs,
        citedItemIds: [],
        errorMessage: '',
        durationMs: Date.now() - startedAt.getTime(),
        startedAt,
        completedAt: new Date(),
      });
      this.logger.log(
        `monitor_brief_empty_window_succeeded monitorId=${monitorIdStr} profileId=${profile.profileId} periodKey=${window.periodKey}`,
      );
      return;
    }

    try {
      const llmOut = await this.buildWeeklyBriefViaLlm({
        monitor,
        agg,
        evidenceRows,
        briefContext,
        ownerTimeZone: ownerTz,
        referenceNow: now,
      });
      const completedAt = new Date();
      if (!llmOut) {
        await this.briefRunModel.create({
          ...jobRef,
          monitorId,
          userId,
          profileId: profile.profileId,
          windowMode: profile.windowMode,
          periodKey: window.periodKey,
          periodStart: window.periodStart,
          periodEnd: window.periodEnd,
          minCosine: minSim,
          inputFingerprint: fp,
          status: 'failed',
          evidenceSnapshot,
          briefContextSnapshot: briefContext,
          monitorSnapshot,
          systemPromptVersion: BRIEF_LLM_SYSTEM_VERSION,
          paragraphs: [],
          citedItemIds: [],
          errorMessage: 'llm_invalid_response',
          durationMs: completedAt.getTime() - startedAt.getTime(),
          startedAt,
          completedAt,
        });
        this.logger.warn(
          `monitor_brief_llm_invalid monitorId=${monitorIdStr} profileId=${profile.profileId}`,
        );
        return;
      }
      await this.briefRunModel.create({
        ...jobRef,
        monitorId,
        userId,
        profileId: profile.profileId,
        windowMode: profile.windowMode,
        periodKey: window.periodKey,
        periodStart: window.periodStart,
        periodEnd: window.periodEnd,
        minCosine: minSim,
        inputFingerprint: fp,
        status: 'succeeded',
        evidenceSnapshot,
        briefContextSnapshot: briefContext,
        monitorSnapshot,
        systemPromptVersion: BRIEF_LLM_SYSTEM_VERSION,
        paragraphs: llmOut.paragraphs,
        citedItemIds: llmOut.citedItemIds,
        errorMessage: '',
        durationMs: completedAt.getTime() - startedAt.getTime(),
        startedAt,
        completedAt,
      });
      this.logger.log(
        `monitor_brief_succeeded monitorId=${monitorIdStr} profileId=${profile.profileId} paragraphs=${llmOut.paragraphs.length} ms=${completedAt.getTime() - startedAt.getTime()}`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const completedAt = new Date();
      await this.briefRunModel.create({
        ...jobRef,
        monitorId,
        userId,
        profileId: profile.profileId,
        windowMode: profile.windowMode,
        periodKey: window.periodKey,
        periodStart: window.periodStart,
        periodEnd: window.periodEnd,
        minCosine: minSim,
        inputFingerprint: fp,
        status: 'failed',
        evidenceSnapshot,
        briefContextSnapshot: briefContext,
        monitorSnapshot,
        systemPromptVersion: BRIEF_LLM_SYSTEM_VERSION,
        paragraphs: [],
        citedItemIds: [],
        errorMessage: msg.slice(0, 2000),
        durationMs: completedAt.getTime() - startedAt.getTime(),
        startedAt,
        completedAt,
      });
      this.logger.warn(
        `monitor_brief_llm_exception monitorId=${monitorIdStr} profileId=${profile.profileId} err=${msg.slice(0, 300)}`,
      );
    }
  }

  private async buildOverviewCard(
    monitor: MonitorDocument,
    recentHours: number,
    viewerTimeZone: string,
  ): Promise<MonitorOverviewCardPublic> {
    const monitorId = String(monitor._id);
    const vec = await this.vectorStore.getMonitorVector(monitorId);
    if (!vec?.length) {
      return {
        monitorId,
        heatIndex: null,
        newLast24h: 0,
        lastActivityAt: null,
        trend: this.emptySevenDayTrend(viewerTimeZone),
      };
    }
    const snap = await this.snapshotService.getSnapshotLean(monitorId, recentHours);
    if (snap?.status === 'ready' && snap.metrics) {
      const m = snap.metrics as {
        heatIndex?: number | null;
        newLast24h?: number;
        lastActivityAt?: string | null;
        trend?: { date: string; count: number }[];
      };
      return {
        monitorId,
        heatIndex: m.heatIndex ?? null,
        newLast24h: m.newLast24h ?? 0,
        lastActivityAt: m.lastActivityAt ?? null,
        trend:
          Array.isArray(m.trend) && m.trend.length > 0 ? m.trend : this.emptySevenDayTrend(viewerTimeZone),
      };
    }
    const nowMs = Date.now();
    const { scored, minSim } = await this.snapshotService.fetchScoredForMonitor(
      monitor,
      nowMs - recentHours * 3600000,
      nowMs,
    );
    const agg = this.aggregateIntelligenceFromScored(monitor, recentHours, scored, minSim, viewerTimeZone);
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
    const viewerTz = await this.usersService.getTimeZoneOrDefault(userId);
    const recentHours = q.recentHours ?? this.defaultRecentHours();
    const profileId = (q.briefProfile ?? DEFAULT_BRIEF_PROFILE_ID).trim().slice(0, 64) || DEFAULT_BRIEF_PROFILE_ID;
    const profiles = resolveBriefProfiles(this.config);
    const profile = getBriefProfileById(profiles, profileId);

    const minSimFallback = this.minSimFromMonitor(monitor);
    const boundSourceCount = (monitor.sourceIds ?? []).length;
    const vec = await this.vectorStore.getMonitorVector(monitorId);

    if (!vec?.length) {
      this.logger.debug(
        `monitor_get_intelligence_no_vector monitorId=${monitorId} userId=${userId} recentHours=${recentHours} briefProfile=${profile.profileId}`,
      );
      return {
        monitorId,
        recentHours,
        minCosine: minSimFallback,
        lastActivityAt: null,
        metrics: { newLast24h: 0, totalInWindow: 0, boundSourceCount },
        heatIndex: null,
        weeklyBrief: ['无法生成 AI 研判摘要：该监控缺少描述向量。请重新创建监控或联系管理员。'],
        trend: this.emptySevenDayTrend(viewerTz),
        chartKeywords: [],
        latestItems: [],
        briefMeta: undefined,
      };
    }

    const snap = await this.snapshotService.getSnapshotLean(monitorId, recentHours);
    let minSim = minSimFallback;
    let intelWithoutBrief: Omit<MonitorIntelligencePublic, 'monitorId' | 'recentHours' | 'minCosine' | 'weeklyBrief' | 'briefMeta'>;

    if (snap?.status === 'ready' && snap.metrics) {
      const m = snap.metrics as {
        heatIndex?: number | null;
        newLast24h?: number;
        totalInWindow?: number;
        lastActivityAt?: string | null;
        trend?: { date: string; count: number }[];
      };
      minSim = this.minSimFromMonitor(monitor);
      intelWithoutBrief = {
        lastActivityAt: m.lastActivityAt ?? null,
        metrics: {
          newLast24h: m.newLast24h ?? 0,
          totalInWindow: m.totalInWindow ?? 0,
          boundSourceCount,
        },
        heatIndex: m.heatIndex ?? null,
        trend:
          Array.isArray(m.trend) && m.trend.length > 0 ? m.trend : this.emptySevenDayTrend(viewerTz),
        chartKeywords: Array.isArray(snap.chartKeywords)
          ? (snap.chartKeywords as { name: string; count: number }[])
          : [],
        latestItems: Array.isArray(snap.latestItems)
          ? (snap.latestItems as Array<ReturnType<typeof serializeFeedItem> & { relevanceScore: number }>)
          : [],
      };
    } else {
      const nowMs = Date.now();
      const { scored, minSim: ms } = await this.snapshotService.fetchScoredForMonitor(
        monitor,
        nowMs - recentHours * 3600000,
        nowMs,
      );
      minSim = ms;
      const agg = this.aggregateIntelligenceFromScored(monitor, recentHours, scored, minSim, viewerTz);
      const { count7d: _c7, ...rest } = agg;
      intelWithoutBrief = rest;
    }

    const oid = new Types.ObjectId(monitorId);
    const latestRun = await this.findLatestSucceededBriefRun(oid, profile.profileId, minSim);
    let weeklyBrief: string[];
    let briefMeta: MonitorIntelligencePublic['briefMeta'];
    if (latestRun && latestRun.paragraphs?.length) {
      weeklyBrief = latestRun.paragraphs as string[];
      briefMeta = {
        profileId: latestRun.profileId,
        periodKey: latestRun.periodKey,
        windowLabel:
          typeof latestRun.briefContextSnapshot?.['windowLabel'] === 'string'
            ? (latestRun.briefContextSnapshot['windowLabel'] as string)
            : '',
        completedAt: latestRun.completedAt ? latestRun.completedAt.toISOString() : null,
        runId: String(latestRun._id),
      };
    } else {
      weeklyBrief = ['研判摘要尚未生成，请等待定时任务（默认每小时）执行后再查看。'];
      briefMeta = {
        profileId: profile.profileId,
        periodKey: '',
        windowLabel: '',
        completedAt: null,
        runId: null,
      };
    }

    this.logger.debug(
      `monitor_get_intelligence monitorId=${monitorId} userId=${userId} recentHours=${recentHours} briefProfile=${profile.profileId} latestRun=${latestRun && latestRun.paragraphs?.length ? String(latestRun._id) : 'none'}`,
    );
    return {
      monitorId,
      recentHours,
      minCosine: minSim,
      ...intelWithoutBrief,
      weeklyBrief,
      briefMeta,
    };
  }

  /** 将 Mongo 中最新 sourceIds/minCosine 等同步到 Qdrant 监控点 payload（向量不变） */
  private async syncMonitorVectorPayload(monitor: MonitorDocument): Promise<void> {
    const monitorId = String(monitor._id);
    let vec = await this.vectorStore.getMonitorVector(monitorId);
    if (!vec?.length) {
      const emb = await this.embeddings.embedBatch([monitor.description]);
      vec = emb[0];
      if (!vec?.length) {
        this.logger.warn(`monitor_sync_vector_skip monitorId=${monitorId} reason=embed_failed`);
        return;
      }
    }
    await this.pipeline.upsertMonitorPoint(monitor, vec);
  }

  private sourceIdsChanged(prevIds: string[], nextIds: string[]): boolean {
    if (prevIds.length !== nextIds.length) return true;
    const next = new Set(nextIds);
    return prevIds.some((id) => !next.has(id));
  }

  async patchSources(monitorId: string, userId: string, dto: PatchMonitorSourcesDto): Promise<MonitorPublic> {
    const monitor = await this.loadOwnedMonitor(monitorId, userId);
    const prevIds = (monitor.sourceIds ?? []).map((x) => String(x));
    const resolved = await this.resolveValidSourceObjectIds(dto.sourceIds);
    monitor.sourceIds = resolved;
    if (dto.minCosine !== undefined) {
      monitor.minCosine = dto.minCosine;
    }
    await monitor.save();
    const nextIds = resolved.map((x) => String(x));
    const sourcesChanged = this.sourceIdsChanged(prevIds, nextIds);
    const minCosineUpdated = dto.minCosine !== undefined;

    await this.syncMonitorVectorPayload(monitor);
    await this.monitorModel
      .updateOne({ _id: monitor._id }, { $set: { snapshotStatus: 'stale' } })
      .exec();
    await this.monitoredSources.applyMonitorSourceDiff(prevIds, nextIds);
    await this.scheduler.enqueueComputeSnapshot(monitorId, this.defaultRecentHours(), 2, {
      trigger: 'api',
    });
    if (sourcesChanged && nextIds.length > 0) {
      await this.scheduler.enqueueReindexMonitor(monitorId, true, { trigger: 'api' });
    }
    this.logger.log(
      `monitor_patch_sources monitorId=${monitorId} userId=${userId} sourceCount=${resolved.length} minCosineUpdated=${minCosineUpdated} sourcesChanged=${sourcesChanged} snapshot=stale`,
    );
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
    await this.softDeleteMonitorDoc(monitor, userId);
  }

  /** 运营后台：跨用户软删监控 */
  async softDeleteForAdmin(monitorId: string): Promise<void> {
    if (!Types.ObjectId.isValid(monitorId)) {
      throw new NotFoundException('monitor_not_found');
    }
    const monitor = await this.monitorModel
      .findOne({ _id: new Types.ObjectId(monitorId), ...notDeletedFilter() })
      .exec();
    if (!monitor) {
      throw new NotFoundException('monitor_not_found');
    }
    await this.softDeleteMonitorDoc(monitor, String(monitor.userId));
  }

  private async softDeleteMonitorDoc(monitor: MonitorDocument, logUserId: string): Promise<void> {
    const monitorId = String(monitor._id);
    const prevIds = (monitor.sourceIds ?? []).map((x) => String(x));
    monitor.deletedAt = new Date();
    await monitor.save();
    await this.monitoredSources.applyMonitorSourceDiff(prevIds, []);
    await this.vectorStore.deleteMonitor(monitorId);
    this.logger.log(`monitor_soft_delete monitorId=${monitorId} userId=${logUserId}`);
  }
}
