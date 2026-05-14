import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FeedItem, FeedItemDocument } from './schemas/feed-item.schema';
import { FeedSimEmbeddingService } from './feed-sim-embedding.service';
import { AggregationPolicyService } from '../aggregation-policy/aggregation-policy.service';
import { cosineSimilarity } from './feed-similarity.util';
import { FEED_MIN_SUMMARY_LEN_FOR_LLM } from './feed-llm.constants';

type LeanItem = {
  _id: Types.ObjectId;
  sourceId: Types.ObjectId;
  title: string;
  summary: string;
  publishedAt: Date;
  createdAt: Date;
  simEmbedTitle?: number[];
  simEmbedFull?: number[];
};

function sortKey(it: LeanItem): number {
  return it.publishedAt.getTime();
}

function prepTitle(t: string): string {
  return t.trim().slice(0, 512);
}

function prepFull(title: string, summary: string): string {
  const s = summary.trim();
  const head = title.trim();
  return (head + (s ? `\n\n${s}` : '')).slice(0, 8000);
}

@Injectable()
export class FeedClusterService {
  private readonly logger = new Logger(FeedClusterService.name);

  constructor(
    @InjectModel(FeedItem.name) private readonly feedItemModel: Model<FeedItemDocument>,
    private readonly embeddings: FeedSimEmbeddingService,
    private readonly aggregationPolicy: AggregationPolicyService,
  ) {}

  /**
   * 按时间窗口内向量相似度聚类；未配置 FEED_EMBEDDING_API_KEY 时跳过。
   * 每小时可调用；会清空窗口内 clusterId 后重算。
   */
  async run(): Promise<{ itemsInWindow: number; pairsMerged: number; clustersMulti: number }> {
    if (!this.embeddings.isEnabled()) {
      this.logger.warn('FEED_EMBEDDING_API_KEY 未配置，跳过相似聚类');
      return { itemsInWindow: 0, pairsMerged: 0, clustersMulti: 0 };
    }
    this.logger.log('开始相似聚类');
    const p = await this.aggregationPolicy.getResolvedClusterParams();
    const lookbackDays = p.lookbackDays;
    const maxPairH = p.maxPairHours;
    const thrTitle = p.simTitle;
    const thrFull = p.simFull;
    const maxItems = p.maxItems;

    const cutoff = new Date(Date.now() - lookbackDays * 86400000);
    const rows = (await this.feedItemModel
      .find({ createdAt: { $gte: cutoff } })
      .select({ sourceId: 1, title: 1, summary: 1, publishedAt: 1, createdAt: 1, simEmbedTitle: 1, simEmbedFull: 1 })
      .sort({ createdAt: -1 })
      .limit(maxItems)
      .lean()
      .exec()) as unknown as LeanItem[];

    if (rows.length === 0) {
      return { itemsInWindow: 0, pairsMerged: 0, clustersMulti: 0 };
    }

    const ids = rows.map((r) => r._id);
    await this.feedItemModel.updateMany({ _id: { $in: ids } }, { $set: { clusterId: null } }).exec();

    const needTitle: { idx: number; text: string; needFull: boolean; fullText: string }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const hasT = Array.isArray(r.simEmbedTitle) && r.simEmbedTitle.length > 0;
      const hasF = Array.isArray(r.simEmbedFull) && r.simEmbedFull.length > 0;
      if (!hasT || !hasF) {
        const titleText = prepTitle(r.title);
        const summary = (r.summary ?? '').trim();
        const needFull = summary.length >= FEED_MIN_SUMMARY_LEN_FOR_LLM;
        const fullText = needFull ? prepFull(r.title, summary) : titleText;
        needTitle.push({ idx: i, text: titleText, needFull, fullText });
      }
    }

    const BATCH = p.embeddingBatchSize;
    for (let b = 0; b < needTitle.length; b += BATCH) {
      const chunk = needTitle.slice(b, b + BATCH);
      const titles = chunk.map((c) => c.text);
      const fullPosByK = Array.from({ length: chunk.length }, () => -1);
      const fulls: string[] = [];
      for (let k = 0; k < chunk.length; k++) {
        if (chunk[k].needFull) {
          fullPosByK[k] = fulls.length;
          fulls.push(chunk[k].fullText);
        }
      }

      const et = await this.embeddings.embedBatch(titles);
      const ef = fulls.length ? await this.embeddings.embedBatch(fulls) : [];
      const bulk: { updateOne: { filter: { _id: Types.ObjectId }; update: { $set: Record<string, unknown> } } }[] = [];
      for (let k = 0; k < chunk.length; k++) {
        const row = rows[chunk[k].idx];
        const titleEmb = et[k];
        const pos = fullPosByK[k];
        const fullEmb = pos >= 0 ? ef[pos] : titleEmb;
        bulk.push({
          updateOne: {
            filter: { _id: row._id },
            update: { $set: { simEmbedTitle: titleEmb, simEmbedFull: fullEmb } },
          },
        });
        row.simEmbedTitle = titleEmb;
        row.simEmbedFull = fullEmb;
      }
      if (bulk.length) await this.feedItemModel.bulkWrite(bulk, { ordered: false });
    }

    rows.sort((a, b) => sortKey(a) - sortKey(b));
    const n = rows.length;
    const parent = Array.from({ length: n }, (_, i) => i);

    function find(i: number): number {
      if (parent[i] !== i) parent[i] = find(parent[i]);
      return parent[i];
    }
    function union(i: number, j: number) {
      const ri = find(i);
      const rj = find(j);
      if (ri !== rj) parent[ri] = rj;
    }

    const maxPairMs = maxPairH * 3600000;
    let pairsMerged = 0;
    for (let i = 0; i < n; i++) {
      const ti = sortKey(rows[i]);
      const ta = rows[i].simEmbedTitle;
      const fa = rows[i].simEmbedFull;
      if (!ta?.length || !fa?.length) continue;
      for (let j = i + 1; j < n; j++) {
        const tj = sortKey(rows[j]);
        if (tj - ti > maxPairMs) break;
        const tb = rows[j].simEmbedTitle;
        const fb = rows[j].simEmbedFull;
        if (!tb?.length || !fb?.length) continue;
        if (cosineSimilarity(ta, tb) < thrTitle) continue;
        if (cosineSimilarity(fa, fb) < thrFull) continue;
        if (find(i) !== find(j)) pairsMerged += 1;
        union(i, j);
      }
    }

    const rootToMembers = new Map<number, number[]>();
    for (let i = 0; i < n; i++) {
      const r = find(i);
      if (!rootToMembers.has(r)) rootToMembers.set(r, []);
      rootToMembers.get(r)!.push(i);
    }

    let clustersMulti = 0;
    const writes: { updateOne: { filter: { _id: Types.ObjectId }; update: { $set: { clusterId: Types.ObjectId | null } } } }[] =
      [];
    for (const idxs of rootToMembers.values()) {
      if (idxs.length < 2) {
        writes.push({
          updateOne: {
            filter: { _id: rows[idxs[0]]._id },
            update: { $set: { clusterId: null } },
          },
        });
        continue;
      }
      clustersMulti += 1;
      let minId = rows[idxs[0]]._id;
      for (let k = 1; k < idxs.length; k++) {
        const id = rows[idxs[k]]._id;
        if (id.toString() < minId.toString()) minId = id;
      }
      for (const idx of idxs) {
        writes.push({
          updateOne: {
            filter: { _id: rows[idx]._id },
            update: { $set: { clusterId: minId } },
          },
        });
      }
    }

    if (writes.length) {
      await this.feedItemModel.bulkWrite(writes, { ordered: false });
    }

    this.logger.log(
      `相似聚类完成：窗口 ${rows.length} 条，合并对 ${pairsMerged}，多源簇 ${clustersMulti}（标题≥${thrTitle} 全文≥${thrFull}，${maxPairH}h 内）`,
    );
    return { itemsInWindow: rows.length, pairsMerged, clustersMulti };
  }
}
