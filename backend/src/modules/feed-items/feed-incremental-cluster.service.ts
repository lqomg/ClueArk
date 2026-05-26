import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AggregationPolicyService } from '../aggregation-policy/aggregation-policy.service';
import { LoggerService } from '../logger';
import { cosineSimilarity } from './feed-similarity.util';
import { FeedItem, FeedItemDocument } from './schemas/feed-item.schema';

export type ResolveClusterResult = {
  clusterId: Types.ObjectId;
  simEmbedTitle: number[];
  bestSimilarity: number;
  merged: boolean;
};

type CandidateRow = {
  _id: Types.ObjectId;
  publishedAt: Date;
  clusterId: Types.ObjectId | null;
  simEmbedTitle: number[];
};

@Injectable()
export class FeedIncrementalClusterService {
  private readonly logger: LoggerService;

  constructor(
    @InjectModel(FeedItem.name) private readonly feedItemModel: Model<FeedItemDocument>,
    private readonly aggregationPolicy: AggregationPolicyService,
    private readonly config: ConfigService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createLogger(FeedIncrementalClusterService.name);
  }

  private candidateCap(): number {
    const raw = Number(this.config.get('PIPELINE_CLUSTER_CANDIDATE_CAP'));
    return Number.isFinite(raw) && raw >= 50 && raw <= 2000 ? Math.floor(raw) : 300;
  }

  /**
   * 单条 pipeline：与近期候选比标题向量，写入 clusterId + simEmbedTitle。
   * 新事件 clusterId = 自身 _id；并入已有簇时 clusterId = candidate.clusterId ?? candidate._id。
   */
  async resolveAndPersist(
    feedItemId: Types.ObjectId,
    publishedAt: Date,
    titleVector: number[],
  ): Promise<ResolveClusterResult> {
    const p = await this.aggregationPolicy.getResolvedClusterParams();
    const lookbackMs = p.lookbackDays * 86400000;
    const maxPairMs = p.maxPairHours * 3600000;
    const cutoff = new Date(Date.now() - lookbackMs);
    const thr = p.simTitle;
    const cap = this.candidateCap();

    const candidates = (await this.feedItemModel
      .find({
        _id: { $ne: feedItemId },
        createdAt: { $gte: cutoff },
        'simEmbedTitle.0': { $exists: true },
      })
      .select({ _id: 1, publishedAt: 1, clusterId: 1, simEmbedTitle: 1 })
      .sort({ publishedAt: -1 })
      .limit(cap)
      .lean()
      .exec()) as unknown as CandidateRow[];

    const itemMs = publishedAt.getTime();
    let bestSim = 0;
    let best: CandidateRow | null = null;

    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      const dt = Math.abs(c.publishedAt.getTime() - itemMs);
      if (dt > maxPairMs) continue;
      const sim = cosineSimilarity(titleVector, c.simEmbedTitle);
      if (sim > bestSim) {
        bestSim = sim;
        best = c;
      }
    }

    let clusterId: Types.ObjectId;
    let merged = false;
    if (best && bestSim >= thr) {
      clusterId = (best.clusterId ?? best._id) as Types.ObjectId;
      merged = true;
    } else {
      clusterId = feedItemId;
    }

    await this.feedItemModel
      .updateOne(
        { _id: feedItemId },
        { $set: { simEmbedTitle: titleVector, clusterId } },
      )
      .exec();

    this.logger.debug(
      `event=incremental_cluster feedItemId=${String(feedItemId)} clusterId=${String(clusterId)} merged=${merged} bestSim=${bestSim.toFixed(4)} thr=${thr} candidates=${candidates.length}`,
    );

    return {
      clusterId,
      simEmbedTitle: titleVector,
      bestSimilarity: bestSim,
      merged,
    };
  }
}
