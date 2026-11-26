import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, type PipelineStage } from 'mongoose';
import { resolvePersistLocale } from '../../common/utils/locale.utils';
import { FeedItem, FeedItemDocument } from '../feed-items/schemas/feed-item.schema';
import { Source, SourceDocument } from '../sources/schemas/source.schema';
import { normalizeStructuredFact } from './structured-fact.util';
import {
  DEVELOPMENT_SEVERITIES,
  DEVELOPMENT_TYPES,
  MonitorDevelopment,
  MonitorDevelopmentDocument,
  type DevelopmentSeverity,
  type DevelopmentType,
} from './schemas/monitor-development.schema';

export type DevelopmentUpdateBeatDto = {
  at: string;
  feedItemId: string | null;
  title: string;
};

export type DevelopmentListItem = {
  id: string;
  monitorId: string;
  title: string;
  summary: string;
  rationale: string;
  whyItMatters: string;
  watchNext: string;
  structuredFact: Record<string, unknown> | null;
  type: DevelopmentType;
  severity: DevelopmentSeverity;
  noveltyScore: number;
  confidence: number;
  evidenceItemIds: string[];
  clusterIds: string[];
  primaryEvidenceItemId: string | null;
  mergeScopeKey?: string;
  primarySourceDisplayName?: string;
  primarySourceAvatarUrl?: string | null;
  primaryEvidence?: {
    feedItemId: string;
    title: string;
    link: string;
  } | null;
  sourcePreviews?: Array<{
    sourceId: string;
    displayName: string;
    avatarUrl: string | null;
  }>;
  alertIds: string[];
  gateDecisionId: string | null;
  occurredAt: string;
  timelineAt: string;
  timePrecision: 'instant' | 'day';
  lastMeaningfulAt: string | null;
  updates: DevelopmentUpdateBeatDto[];
  locale: string;
  createdAt: string | null;
};

export type CreateDevelopmentInput = {
  monitorId: string;
  userId: string;
  title: string;
  summary: string;
  rationale?: string;
  whyItMatters?: string;
  watchNext?: string;
  structuredFact?: Record<string, unknown> | null;
  type?: DevelopmentType;
  severity?: DevelopmentSeverity;
  noveltyScore?: number;
  confidence?: number;
  evidenceItemIds: string[];
  clusterIds?: string[];
  primaryEvidenceItemId?: string | null;
  alertIds?: string[];
  gateDecisionId?: string | null;
  mergeScopeKey: string;
  occurredAt: Date;
  timelineAt?: Date;
  timePrecision?: 'instant' | 'day';
  locale?: string;
  lastMeaningfulAt?: Date;
  updates?: Array<{ at: Date; feedItemId: Types.ObjectId | null; title: string }>;
  /** upsert_text 更新文案；evidence_only 只追加证据（默认 upsert_text） */
  mergeMode?: 'upsert_text' | 'evidence_only';
};

export type UpsertDevelopmentResult = {
  development: DevelopmentListItem;
  created: boolean;
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

function toIso(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  const d = new Date(String(value ?? ''));
  if (Number.isNaN(d.getTime())) return new Date(0).toISOString();
  return d.toISOString();
}

function toIdList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x)).filter((id) => Types.ObjectId.isValid(id));
}

function toObjectIds(ids: string[]): Types.ObjectId[] {
  return [...new Set(ids.filter((id) => Types.ObjectId.isValid(id)))].map(
    (id) => new Types.ObjectId(id),
  );
}

function normalizeTimePrecision(raw: unknown): 'instant' | 'day' {
  return raw === 'day' ? 'day' : 'instant';
}

@Injectable()
export class DevelopmentsService {
  constructor(
    @InjectModel(MonitorDevelopment.name)
    private readonly developmentModel: Model<MonitorDevelopmentDocument>,
    @InjectModel(FeedItem.name)
    private readonly feedItemModel: Model<FeedItemDocument>,
    @InjectModel(Source.name)
    private readonly sourceModel: Model<SourceDocument>,
  ) {}

  serialize(doc: MonitorDevelopmentDocument | Record<string, unknown>): DevelopmentListItem {
    const row = doc as Record<string, unknown>;
    const typeRaw = String(row.type ?? 'update');
    const severityRaw = String(row.severity ?? 'medium');
    return {
      id: String(row._id ?? ''),
      monitorId: String(row.monitorId ?? ''),
      title: String(row.title ?? ''),
      summary: String(row.summary ?? ''),
      rationale: String(row.rationale ?? ''),
      whyItMatters: String(row.whyItMatters ?? '').slice(0, 500),
      watchNext: String(row.watchNext ?? '').slice(0, 300),
      structuredFact: normalizeStructuredFact(row.structuredFact),
      type: (DEVELOPMENT_TYPES as readonly string[]).includes(typeRaw)
        ? (typeRaw as DevelopmentType)
        : 'update',
      severity: (DEVELOPMENT_SEVERITIES as readonly string[]).includes(severityRaw)
        ? (severityRaw as DevelopmentSeverity)
        : 'medium',
      noveltyScore: clamp01(Number(row.noveltyScore ?? 0.5)),
      confidence: clamp01(Number(row.confidence ?? 0.5)),
      evidenceItemIds: toIdList(row.evidenceItemIds),
      clusterIds: toIdList(row.clusterIds),
      primaryEvidenceItemId: row.primaryEvidenceItemId
        ? String(row.primaryEvidenceItemId)
        : null,
      mergeScopeKey: row.mergeScopeKey ? String(row.mergeScopeKey) : undefined,
      alertIds: toIdList(row.alertIds),
      gateDecisionId: row.gateDecisionId ? String(row.gateDecisionId) : null,
      occurredAt: toIso(row.occurredAt),
      timelineAt: toIso(row.timelineAt ?? row.occurredAt),
      timePrecision: normalizeTimePrecision(row.timePrecision),
      lastMeaningfulAt: row.lastMeaningfulAt ? toIso(row.lastMeaningfulAt) : null,
      updates: Array.isArray(row.updates)
        ? (row.updates as Array<{ at?: unknown; feedItemId?: unknown; title?: unknown }>)
            .map((u) => ({
              at: toIso(u.at),
              feedItemId: u.feedItemId ? String(u.feedItemId) : null,
              title: String(u.title ?? '').slice(0, 80),
            }))
            .filter((u) => Boolean(u.at))
        : [],
      locale: String(row.locale ?? '').trim(),
      createdAt: row.createdAt ? toIso(row.createdAt) : null,
    };
  }

  /** 供阶段 4 门禁流水线写入；按 mergeScopeKey upsert。 */
  async create(input: CreateDevelopmentInput): Promise<DevelopmentListItem> {
    return (await this.upsertByScope(input)).development;
  }

  async upsertByScope(input: CreateDevelopmentInput): Promise<UpsertDevelopmentResult> {
    const evidenceOids = toObjectIds(input.evidenceItemIds);
    const clusterOids = toObjectIds(input.clusterIds ?? []);
    const alertOids = toObjectIds(input.alertIds ?? []);
    const primary =
      input.primaryEvidenceItemId && Types.ObjectId.isValid(input.primaryEvidenceItemId)
        ? new Types.ObjectId(input.primaryEvidenceItemId)
        : evidenceOids[0] ?? null;
    const occurredAt = input.occurredAt;
    const mergeScopeKey = input.mergeScopeKey.trim().slice(0, 64);
    if (!mergeScopeKey) {
      throw new Error('development_merge_scope_required');
    }
    const timelineAt = input.timelineAt ?? occurredAt;
    const mergeMode = input.mergeMode === 'evidence_only' ? 'evidence_only' : 'upsert_text';
    const title = input.title.slice(0, 300);
    const summary = input.summary.slice(0, 4000);
    const insertBeat =
      input.updates?.[0] ??
      ({
        at: occurredAt,
        feedItemId: primary,
        title: title.slice(0, 80),
      } as const);

    const existing = await this.developmentModel
      .findOne({
        monitorId: new Types.ObjectId(input.monitorId),
        mergeScopeKey,
      })
      .select({ _id: 1, title: 1, summary: 1 })
      .lean()
      .exec();

    const setOnExisting: Record<string, unknown> = {};
    if (existing && mergeMode === 'upsert_text' && title && summary) {
      const prevTitle = String(existing.title ?? '').trim();
      const prevSummary = String(existing.summary ?? '').trim();
      if (prevTitle !== title || prevSummary !== summary) {
        setOnExisting.title = title;
        setOnExisting.summary = summary;
        setOnExisting.whyItMatters = String(input.whyItMatters ?? '').slice(0, 500);
        setOnExisting.watchNext = String(input.watchNext ?? '').slice(0, 300);
        setOnExisting.severity = input.severity ?? 'medium';
        setOnExisting.lastMeaningfulAt = input.lastMeaningfulAt ?? occurredAt;
        if (input.noveltyScore !== undefined) {
          setOnExisting.noveltyScore = clamp01(input.noveltyScore);
        }
        if (input.confidence !== undefined) {
          setOnExisting.confidence = clamp01(input.confidence);
        }
      }
    }

    const result = await this.developmentModel
      .findOneAndUpdate(
        {
          monitorId: new Types.ObjectId(input.monitorId),
          mergeScopeKey,
        },
        {
          $setOnInsert: {
            monitorId: new Types.ObjectId(input.monitorId),
            userId: new Types.ObjectId(input.userId),
            title,
            summary,
            rationale: String(input.rationale ?? '').slice(0, 800),
            whyItMatters: String(input.whyItMatters ?? '').slice(0, 500),
            watchNext: String(input.watchNext ?? '').slice(0, 300),
            structuredFact: normalizeStructuredFact(input.structuredFact),
            type: input.type ?? 'update',
            severity: input.severity ?? 'medium',
            noveltyScore: clamp01(input.noveltyScore ?? 0.5),
            confidence: clamp01(input.confidence ?? 0.5),
            primaryEvidenceItemId: primary,
            gateDecisionId:
              input.gateDecisionId && Types.ObjectId.isValid(input.gateDecisionId)
                ? new Types.ObjectId(input.gateDecisionId)
                : null,
            mergeScopeKey,
            locale: resolvePersistLocale(input.title, input.summary, input.locale),
            timePrecision: normalizeTimePrecision(input.timePrecision),
            lastMeaningfulAt: input.lastMeaningfulAt ?? occurredAt,
            updates: input.updates?.length ? input.updates : [insertBeat],
          },
          ...(Object.keys(setOnExisting).length ? { $set: setOnExisting } : {}),
          $addToSet: {
            evidenceItemIds: { $each: evidenceOids },
            clusterIds: { $each: clusterOids },
            alertIds: { $each: alertOids },
          },
          $min: {
            occurredAt,
            timelineAt,
          },
        },
        { new: true, upsert: true, includeResultMetadata: true },
      )
      .exec();

    const metadata = result as unknown as {
      value?: MonitorDevelopmentDocument | Record<string, unknown> | null;
      lastErrorObject?: { updatedExisting?: boolean };
    };
    const doc = metadata.value ?? (result as unknown as MonitorDevelopmentDocument);
    if (!doc) {
      throw new Error('development_upsert_empty_result');
    }
    return {
      development: this.serialize(doc),
      created: metadata.lastErrorObject?.updatedExisting === false,
    };
  }

  async listByIds(monitorId: string, ids: string[]): Promise<DevelopmentListItem[]> {
    if (!Types.ObjectId.isValid(monitorId) || !ids.length) return [];
    const oids = [
      ...new Set(ids.map((id) => String(id ?? '').trim()).filter((id) => Types.ObjectId.isValid(id))),
    ].map((id) => new Types.ObjectId(id));
    if (!oids.length) return [];
    const found = await this.developmentModel
      .find({
        monitorId: new Types.ObjectId(monitorId),
        _id: { $in: oids },
      })
      .lean()
      .exec();
    const items = (found as Record<string, unknown>[]).map((r) => this.serialize(r));
    await this.hydratePrimarySources(items);
    return items;
  }

  /**
   * 门禁热路径：按 timelineAt 新→旧拉进展目录（含 mergeScopeKey）。
   */
  async listCatalogForGate(
    monitorId: string,
    limit: number,
  ): Promise<
    Array<{
      id: string;
      title: string;
      summary: string;
      timelineAt: string;
      mergeScopeKey: string;
    }>
  > {
    const cap = Math.min(200, Math.max(1, Math.floor(Number(limit)) || 120));
    if (!Types.ObjectId.isValid(monitorId)) return [];
    const rows = await this.developmentModel
      .find({ monitorId: new Types.ObjectId(monitorId) })
      .select({ _id: 1, title: 1, summary: 1, timelineAt: 1, mergeScopeKey: 1 })
      .sort({ timelineAt: -1, _id: -1 })
      .limit(cap)
      .lean()
      .exec();
    return rows.map((r) => ({
      id: String(r._id),
      title: String(r.title ?? ''),
      summary: String(r.summary ?? ''),
      timelineAt: toIso(r.timelineAt),
      mergeScopeKey: String(r.mergeScopeKey ?? ''),
    }));
  }

  async listForMonitor(
    monitorId: string,
    opts?: {
      page?: number;
      pageSize?: number;
      recentHours?: number;
      sort?: 'timeline' | 'updated';
    },
  ): Promise<{ items: DevelopmentListItem[]; total: number; page: number; pageSize: number }> {
    const page = Math.max(1, opts?.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, opts?.pageSize ?? 20));
    if (!Types.ObjectId.isValid(monitorId)) {
      return { items: [], total: 0, page, pageSize };
    }
    const monitorOid = new Types.ObjectId(monitorId);
    const since =
      opts?.recentHours && opts.recentHours > 0
        ? new Date(Date.now() - opts.recentHours * 3600_000)
        : null;
    const sortUpdated = opts?.sort === 'updated';
    const filter: Record<string, unknown> = { monitorId: monitorOid };
    if (since) {
      filter[sortUpdated ? 'lastMeaningfulAt' : 'timelineAt'] = { $gte: since };
    }
    const sort = sortUpdated
      ? ({ lastMeaningfulAt: -1, timelineAt: -1, _id: -1 } as const)
      : ({ timelineAt: -1, _id: -1 } as const);
    const [total, found] = await Promise.all([
      this.developmentModel.countDocuments(filter).exec(),
      this.developmentModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean()
        .exec(),
    ]);
    const items = (found as Record<string, unknown>[]).map((r) => this.serialize(r));
    await this.hydratePrimarySources(items);
    return { items, total, page, pageSize };
  }

  /**
   * 首页跨专题进展：按活动戳倒序交叉
   *（max(lastMeaningfulAt, occurredAt, timelineAt)）；游标为 activityAt + _id。
   * 返回 limit+1 条供调用方判断 hasMore。
   */
  async listForUserHomeFeed(
    monitorIds: string[],
    recentHours: number,
    opts?: {
      limit?: number;
      cursorActivityAt?: Date;
      cursorId?: string;
    },
  ): Promise<DevelopmentListItem[]> {
    const hours = Math.min(2160, Math.max(1, Math.floor(Number(recentHours)) || 2160));
    const limit = Math.min(50, Math.max(1, Math.floor(Number(opts?.limit)) || 20));
    const oids = [
      ...new Set(
        monitorIds.map((id) => String(id ?? '').trim()).filter((id) => Types.ObjectId.isValid(id)),
      ),
    ].map((id) => new Types.ObjectId(id));
    if (!oids.length) return [];
    const since = new Date(Date.now() - hours * 3600_000);
    const cursorAt = opts?.cursorActivityAt;
    const cursorIdRaw = String(opts?.cursorId ?? '').trim();
    const activityField = {
      $max: ['$lastMeaningfulAt', '$occurredAt', '$timelineAt'],
    };
    const pipeline: PipelineStage[] = [
      { $match: { monitorId: { $in: oids } } },
      { $addFields: { _activityAt: activityField } },
      {
        $match:
          cursorAt instanceof Date &&
          !Number.isNaN(cursorAt.getTime()) &&
          Types.ObjectId.isValid(cursorIdRaw)
            ? {
                $and: [
                  { _activityAt: { $gte: since } },
                  {
                    $or: [
                      { _activityAt: { $lt: cursorAt } },
                      {
                        _activityAt: cursorAt,
                        _id: { $lt: new Types.ObjectId(cursorIdRaw) },
                      },
                    ],
                  },
                ],
              }
            : { _activityAt: { $gte: since } },
      },
      { $sort: { _activityAt: -1, _id: -1 } },
      { $limit: limit + 1 },
    ];
    const found = await this.developmentModel.aggregate(pipeline).exec();
    const items = (found as Record<string, unknown>[]).map((r) => this.serialize(r));
    await this.hydratePrimarySources(items);
    return items;
  }

  /**
   * 早报：跨专题按 timelineAt 倒序拉窗内进展。
   * `since` 一般为用户当地日 00:00 的 UTC 瞬时。
   */
  async listForMorningBriefing(
    monitorIds: string[],
    since: Date,
    opts?: { limit?: number },
  ): Promise<DevelopmentListItem[]> {
    const limit = Math.min(200, Math.max(1, Math.floor(Number(opts?.limit)) || 200));
    const oids = [
      ...new Set(
        monitorIds.map((id) => String(id ?? '').trim()).filter((id) => Types.ObjectId.isValid(id)),
      ),
    ].map((id) => new Types.ObjectId(id));
    if (!oids.length) return [];
    const sinceAt =
      since instanceof Date && Number.isFinite(since.getTime())
        ? since
        : new Date(Date.now() - 24 * 3600_000);
    const found = await this.developmentModel
      .find({
        monitorId: { $in: oids },
        timelineAt: { $gte: sinceAt },
      })
      .sort({ timelineAt: -1, _id: -1 })
      .limit(limit)
      .lean()
      .exec();
    const items = (found as Record<string, unknown>[]).map((r) => this.serialize(r));
    await this.hydratePrimarySources(items);
    return items;
  }

  async getOne(monitorId: string, developmentId: string): Promise<DevelopmentListItem | null> {
    if (!Types.ObjectId.isValid(monitorId) || !Types.ObjectId.isValid(developmentId)) {
      return null;
    }
    const row = await this.developmentModel
      .findOne({
        _id: new Types.ObjectId(developmentId),
        monitorId: new Types.ObjectId(monitorId),
      })
      .lean()
      .exec();
    if (!row) return null;
    const item = this.serialize(row as Record<string, unknown>);
    await this.hydratePrimarySources([item]);
    return item;
  }

  async getOneOrThrow(monitorId: string, developmentId: string): Promise<DevelopmentListItem> {
    const row = await this.getOne(monitorId, developmentId);
    if (!row) throw new NotFoundException('development_not_found');
    return row;
  }

  async listEvidence(
    monitorId: string,
    developmentId: string,
  ): Promise<{
    items: Array<{
      feedItemId: string;
      title: string;
      link: string;
      summary: string;
      publishedAt: string | null;
      sourceId: string;
      sourceDisplayName: string;
      sourceAvatarUrl: string | null;
      isPrimary: boolean;
    }>;
  }> {
    const development = await this.getOneOrThrow(monitorId, developmentId);
    const ids = [
      ...new Set(
        [
          development.primaryEvidenceItemId || '',
          ...(development.evidenceItemIds ?? []),
        ].filter((id) => Types.ObjectId.isValid(id)),
      ),
    ];
    if (!ids.length) return { items: [] };

    const feedRows = await this.feedItemModel
      .find({ _id: { $in: ids.map((id) => new Types.ObjectId(id)) } })
      .select({ _id: 1, sourceId: 1, title: 1, link: 1, summary: 1, publishedAt: 1 })
      .lean()
      .exec();
    const sourceIds = [...new Set(feedRows.map((f) => String(f.sourceId)))];
    const sources = sourceIds.length
      ? await this.sourceModel
          .find({ _id: { $in: sourceIds.map((id) => new Types.ObjectId(id)) } })
          .select({ _id: 1, displayName: 1, avatarUrl: 1 })
          .lean()
          .exec()
      : [];
    const sourceById = new Map(
      sources.map((s) => [
        String(s._id),
        {
          displayName: String(s.displayName ?? ''),
          avatarUrl: s.avatarUrl ? String(s.avatarUrl) : null,
        },
      ]),
    );
    const feedById = new Map(feedRows.map((f) => [String(f._id), f] as const));
    const primary = development.primaryEvidenceItemId;

    const items = ids
      .map((id) => {
        const f = feedById.get(id);
        if (!f) return null;
        const src = sourceById.get(String(f.sourceId));
        return {
          feedItemId: id,
          title: String(f.title ?? ''),
          link: String(f.link ?? ''),
          summary: String(f.summary ?? '').slice(0, 2000),
          publishedAt:
            f.publishedAt instanceof Date && !Number.isNaN(f.publishedAt.getTime())
              ? f.publishedAt.toISOString()
              : null,
          sourceId: String(f.sourceId),
          sourceDisplayName: src?.displayName || String(f.sourceId),
          sourceAvatarUrl: src?.avatarUrl ?? null,
          isPrimary: Boolean(primary && primary === id),
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    return { items };
  }

  async listForAdmin(opts: {
    page?: number;
    pageSize?: number;
    monitorId?: string;
    userId?: string;
    search?: string;
  }): Promise<{ items: DevelopmentListItem[]; total: number; page: number; pageSize: number }> {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
    const filter: Record<string, unknown> = {};
    if (opts.monitorId && Types.ObjectId.isValid(opts.monitorId)) {
      filter.monitorId = new Types.ObjectId(opts.monitorId);
    }
    if (opts.userId && Types.ObjectId.isValid(opts.userId)) {
      filter.userId = new Types.ObjectId(opts.userId);
    }
    const search = opts.search?.trim();
    if (search) {
      const esc = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [{ title: new RegExp(esc, 'i') }, { summary: new RegExp(esc, 'i') }];
    }
    const [total, found] = await Promise.all([
      this.developmentModel.countDocuments(filter).exec(),
      this.developmentModel
        .find(filter)
        .sort({ timelineAt: -1, _id: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean()
        .exec(),
    ]);
    const items = (found as Record<string, unknown>[]).map((r) => this.serialize(r));
    return { items, total, page, pageSize };
  }

  private async hydratePrimarySources(items: DevelopmentListItem[]): Promise<void> {
    if (!items.length) return;
    const feedIds = [
      ...new Set(
        items.flatMap((item) =>
          [item.primaryEvidenceItemId || '', ...(item.evidenceItemIds ?? [])].filter((id) =>
            Types.ObjectId.isValid(id),
          ),
        ),
      ),
    ];
    if (!feedIds.length) return;

    const feedRows = await this.feedItemModel
      .find({ _id: { $in: feedIds.map((id) => new Types.ObjectId(id)) } })
      .select({ _id: 1, sourceId: 1, title: 1, link: 1 })
      .lean()
      .exec();
    const feedById = new Map(
      feedRows.map((f) => [
        String(f._id),
        {
          sourceId: String(f.sourceId),
          title: String(f.title ?? ''),
          link: String(f.link ?? ''),
        },
      ]),
    );
    const sourceIds = [...new Set([...feedById.values()].map((f) => f.sourceId))];
    const sources = sourceIds.length
      ? await this.sourceModel
          .find({ _id: { $in: sourceIds.map((id) => new Types.ObjectId(id)) } })
          .select({ _id: 1, displayName: 1, avatarUrl: 1 })
          .lean()
          .exec()
      : [];
    const sourceById = new Map(
      sources.map((s) => [
        String(s._id),
        {
          displayName: String(s.displayName ?? ''),
          avatarUrl: s.avatarUrl ? String(s.avatarUrl) : null,
        },
      ]),
    );

    for (const item of items) {
      const ordered = [
        item.primaryEvidenceItemId || '',
        ...(item.evidenceItemIds ?? []),
      ].filter((id) => Types.ObjectId.isValid(id));
      const seen = new Set<string>();
      const previews: NonNullable<DevelopmentListItem['sourcePreviews']> = [];
      for (const fid of ordered) {
        const feed = feedById.get(fid);
        if (!feed) continue;
        if (seen.has(feed.sourceId)) continue;
        seen.add(feed.sourceId);
        const src = sourceById.get(feed.sourceId);
        previews.push({
          sourceId: feed.sourceId,
          displayName: src?.displayName || feed.sourceId,
          avatarUrl: src?.avatarUrl ?? null,
        });
      }
      item.sourcePreviews = previews;

      const primaryId =
        item.primaryEvidenceItemId && Types.ObjectId.isValid(item.primaryEvidenceItemId)
          ? item.primaryEvidenceItemId
          : '';
      const primaryFeed = primaryId ? feedById.get(primaryId) : undefined;
      if (primaryFeed) {
        const src = sourceById.get(primaryFeed.sourceId);
        item.primarySourceDisplayName = src?.displayName || primaryFeed.sourceId;
        item.primarySourceAvatarUrl = src?.avatarUrl ?? null;
        item.primaryEvidence = {
          feedItemId: primaryId,
          title: primaryFeed.title,
          link: primaryFeed.link,
        };
      }
    }
  }
}
