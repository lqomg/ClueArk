import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { FeedItem, FeedItemDocument } from './schemas/feed-item.schema';
import type { ListFeedItemsQueryDto } from './dto/list-feed-items.query.dto';

export function serializeFeedItem(doc: Record<string, unknown>) {
  const sid = doc.sourceId;
  let sourceDisplayName = '';
  let sourceIdStr = '';
  if (sid && typeof sid === 'object' && '_id' in sid) {
    const o = sid as { _id: Types.ObjectId; displayName?: string };
    sourceIdStr = String(o._id);
    sourceDisplayName = o.displayName ?? '';
  } else if (sid instanceof Types.ObjectId) {
    sourceIdStr = String(sid);
  } else if (typeof sid === 'string') {
    sourceIdStr = sid;
  }

  const rawTags = doc.llmTags;
  const tags = Array.isArray(rawTags) && rawTags.length ? rawTags.map(String) : [];
  const recommendReason = String(doc.llmRecommendReason ?? '');
  const llmStatus = doc.llmStatus as string | undefined;

  return {
    id: String(doc._id),
    sourceId: sourceIdStr,
    sourceDisplayName,
    title: doc.title as string,
    link: doc.link as string,
    summary: (doc.summary as string) ?? '',
    publishedAt: doc.publishedAt ? (doc.publishedAt as Date).toISOString() : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    tags,
    recommendReason,
    llmStatus: llmStatus ?? 'pending',
  };
}

function stripAggFields(doc: Record<string, unknown>) {
  const x = { ...doc };
  delete x._sortPub;
  delete x._groupKey;
  delete x.simEmbedTitle;
  delete x.simEmbedFull;
  return x;
}

function serializeFeedListRow(
  doc: Record<string, unknown>,
  opts: {
    clusterItemCount: number;
    clusterSourceCount: number;
    minPub: Date | null | undefined;
    maxPub: Date | null | undefined;
  },
) {
  const base = serializeFeedItem(doc);
  return {
    ...base,
    itemTitle: base.title,
    clusterId: doc.clusterId ? String(doc.clusterId) : null,
    clusterItemCount: opts.clusterItemCount,
    clusterSourceCount: opts.clusterSourceCount,
    clusterEarliestAt: opts.minPub ? new Date(opts.minPub).toISOString() : null,
    clusterLatestAt: opts.maxPub ? new Date(opts.maxPub).toISOString() : null,
  };
}

/** publishedAt 优先，缺省用 createdAt，与列表 _sortPub 语义一致 */
function applyRecentHoursFilter(filter: Record<string, unknown>, recentHours: number) {
  const cutoff = new Date(Date.now() - recentHours * 3600000);
  filter.$expr = {
    $gte: [{ $ifNull: ['$publishedAt', '$createdAt'] }, cutoff],
  };
}

type GroupAggRow = {
  doc: Record<string, unknown>;
  clusterItemCount: number;
  clusterSourceCount?: number;
  minPub?: Date;
  maxPub?: Date;
};

@Injectable()
export class FeedItemsService {
  constructor(@InjectModel(FeedItem.name) private readonly feedItemModel: Model<FeedItemDocument>) {}

  /** 同一相似簇下的条目（用于「查看全部」） */
  async listByClusterId(clusterId: string) {
    const k = clusterId?.trim() ?? '';
    if (!Types.ObjectId.isValid(k)) throw new BadRequestException('invalid_cluster_id');
    const oid = new Types.ObjectId(k);
    const rows = await this.feedItemModel
      .find({ clusterId: oid, llmStatus: { $in: ['done', 'skipped'] } })
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(80)
      .populate({ path: 'sourceId', select: 'displayName createdBy' })
      .lean()
      .exec();
    return {
      clusterId: k,
      items: rows.map((r) => {
        const src = r.sourceId as { displayName?: string } | Types.ObjectId | undefined;
        const name = src && typeof src === 'object' && 'displayName' in src ? String(src.displayName ?? '') : '';
        return {
          id: String(r._id),
          sourceDisplayName: name,
          title: r.title,
          link: r.link,
          publishedAt: r.publishedAt ? (r.publishedAt as Date).toISOString() : null,
        };
      }),
    };
  }

  async list(q: ListFeedItemsQueryDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 30;
    const filter: Record<string, unknown> = { llmStatus: { $in: ['done', 'skipped'] } };
    if (q.sourceId) {
      filter.sourceId = new Types.ObjectId(q.sourceId);
    }
    if (q.recentHours != null) {
      applyRecentHoursFilter(filter, q.recentHours);
    }

    const featured = q.mode === 'featured';
    const mode = featured ? 'featured' : 'all';
    const useClusters = !q.sourceId && q.groupByCluster !== false;
    if (!useClusters) {
      const out = await this.listFlat(filter, page, pageSize, featured, mode);
      return q.recentHours != null ? { ...out, recentHours: q.recentHours } : out;
    }
    const out = await this.listGroupedByCluster(filter, page, pageSize, featured, mode);
    return q.recentHours != null ? { ...out, recentHours: q.recentHours } : out;
  }

  private async listFlat(
    filter: Record<string, unknown>,
    page: number,
    pageSize: number,
    featured: boolean,
    mode: 'all' | 'featured',
  ) {
    if (!featured) {
      const [total, rows] = await Promise.all([
        this.feedItemModel.countDocuments(filter).exec(),
        this.feedItemModel
          .find(filter)
          .sort({ publishedAt: -1, createdAt: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .populate({ path: 'sourceId', select: 'displayName createdBy' })
          .lean()
          .exec(),
      ]);
      const items = rows.map((d) => serializeFeedItem(d as unknown as Record<string, unknown>));
      return { items, total, page, pageSize, mode, clusterGrouped: false };
    }

    const stages: PipelineStage[] = [
      { $match: filter },
      { $sort: { publishedAt: -1, createdAt: -1 } },
      { $skip: (page - 1) * pageSize },
      { $limit: pageSize },
    ];
    const countPipeline: PipelineStage[] = [{ $match: filter }, { $count: 'n' }];
    const [countAgg, rows] = await Promise.all([
      this.feedItemModel.aggregate<{ n: number }>(countPipeline).exec(),
      this.feedItemModel.aggregate<Record<string, unknown>>(stages).exec(),
    ]);
    const populated = await this.feedItemModel.populate(rows, {
      path: 'sourceId',
      select: 'displayName createdBy',
    });
    const total = countAgg[0]?.n ?? 0;
    const items = populated.map((d) => serializeFeedItem(d as unknown as Record<string, unknown>));
    return { items, total, page, pageSize, mode, clusterGrouped: false };
  }

  private async listGroupedByCluster(
    filter: Record<string, unknown>,
    page: number,
    pageSize: number,
    featured: boolean,
    mode: 'all' | 'featured',
  ) {
    const preSort: PipelineStage[] = [
      { $match: filter },
      {
        $addFields: {
          _sortPub: { $ifNull: ['$publishedAt', '$createdAt'] },
        },
      },
      { $sort: { _sortPub: -1, createdAt: -1 } },
      {
        $addFields: {
          _groupKey: { $ifNull: ['$clusterId', '$_id'] },
        },
      },
      {
        $group: {
          _id: '$_groupKey',
          doc: { $first: '$$ROOT' },
          clusterItemCount: { $sum: 1 },
          minPub: { $min: '$_sortPub' },
          maxPub: { $max: '$_sortPub' },
          _uniqueSources: { $addToSet: '$sourceId' },
        },
      },
      {
        $addFields: {
          clusterSourceCount: { $size: { $ifNull: ['$_uniqueSources', []] } },
        },
      },
      {
        $project: {
          _uniqueSources: 0,
        },
      },
      ...(featured ? [{ $match: { clusterItemCount: { $gt: 1 } } } as PipelineStage] : []),
      { $sort: { maxPub: -1, minPub: -1 } } as PipelineStage,
    ];

    const dataPipeline: PipelineStage[] = [...preSort, { $skip: (page - 1) * pageSize }, { $limit: pageSize }];

    const countPipeline: PipelineStage[] = featured
      ? [
          { $match: filter },
          {
            $addFields: {
              _gk: { $ifNull: ['$clusterId', '$_id'] },
            },
          },
          { $group: { _id: '$_gk', clusterItemCount: { $sum: 1 } } },
          { $match: { clusterItemCount: { $gt: 1 } } },
          { $count: 'n' },
        ]
      : [
          { $match: filter },
          {
            $addFields: {
              _sortPub: { $ifNull: ['$publishedAt', '$createdAt'] },
              _gk: { $ifNull: ['$clusterId', '$_id'] },
            },
          },
          { $group: { _id: '$_gk' } },
          { $count: 'n' },
        ];

    const [countAgg, rows] = await Promise.all([
      this.feedItemModel.aggregate<{ n: number }>(countPipeline).exec(),
      this.feedItemModel.aggregate<GroupAggRow>(dataPipeline).exec(),
    ]);
    const total = countAgg[0]?.n ?? 0;

    const prepared = rows.map((r) => ({
      plain: stripAggFields(r.doc as Record<string, unknown>),
      clusterItemCount: r.clusterItemCount,
      clusterSourceCount: Math.max(1, r.clusterSourceCount ?? 1),
      minPub: r.minPub,
      maxPub: r.maxPub,
    }));

    await this.feedItemModel.populate(
      prepared.map((p) => p.plain),
      { path: 'sourceId', select: 'displayName createdBy' },
    );

    const items = prepared.map((p) =>
      serializeFeedListRow(p.plain, {
        clusterItemCount: p.clusterItemCount,
        clusterSourceCount: p.clusterSourceCount,
        minPub: p.minPub,
        maxPub: p.maxPub,
      }),
    );

    return { items, total, page, pageSize, mode, clusterGrouped: true };
  }
}
