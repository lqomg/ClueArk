import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import {
  AggregationPolicy,
  AggregationPolicyDocument,
  AGGREGATION_POLICY_KEY,
} from './schemas/aggregation-policy.schema';
import type { UpdateAggregationPolicyDto } from './dto/update-aggregation-policy.dto';

export type ResolvedClusterParams = {
  lookbackDays: number;
  maxPairHours: number;
  simTitle: number;
  simFull: number;
  maxItems: number;
  embeddingBatchSize: number;
  clusterCronDisabled: boolean;
};

@Injectable()
export class AggregationPolicyService {
  constructor(
    @InjectModel(AggregationPolicy.name) private readonly policyModel: Model<AggregationPolicyDocument>,
    private readonly config: ConfigService,
  ) {}

  async hasPersistedDocument(): Promise<boolean> {
    const n = await this.policyModel.countDocuments({ key: AGGREGATION_POLICY_KEY }).exec();
    return n > 0;
  }

  /** 聚类与定时任务使用：已落库字段优先，否则回退 .env */
  async getResolvedClusterParams(): Promise<ResolvedClusterParams> {
    const doc = await this.policyModel.findOne({ key: AGGREGATION_POLICY_KEY }).lean().exec();
    const envCron = process.env.FEED_CLUSTER_CRON_DISABLED === 'true';
    const rawLookback = doc?.lookbackDays ?? Number(this.config.get('FEED_CLUSTER_LOOKBACK_DAYS') || 7);
    const rawPair = doc?.maxPairHours ?? Number(this.config.get('FEED_CLUSTER_MAX_PAIR_HOURS') || 48);
    const rawTitle = doc?.simTitle ?? Number(this.config.get('FEED_CLUSTER_SIM_TITLE') || 0.9);
    const rawFull = doc?.simFull ?? Number(this.config.get('FEED_CLUSTER_SIM_FULL') || 0.88);
    const rawMaxItems = doc?.maxItems ?? Number(this.config.get('FEED_CLUSTER_MAX_ITEMS') || 2500);
    const rawBatch = doc?.embeddingBatchSize ?? Number(this.config.get('FEED_EMBEDDING_BATCH_SIZE'));
    const embeddingBatchSize = Math.min(
      2048,
      Math.max(1, Number.isFinite(rawBatch) && rawBatch > 0 ? Math.floor(rawBatch) : 10),
    );
    return {
      lookbackDays: Math.min(30, Math.max(1, Math.floor(Number(rawLookback)) || 7)),
      maxPairHours: Math.min(168, Math.max(1, Math.floor(Number(rawPair)) || 48)),
      simTitle: Math.min(0.999, Math.max(0.5, Number(rawTitle) || 0.9)),
      simFull: Math.min(0.999, Math.max(0.5, Number(rawFull) || 0.88)),
      maxItems: Math.min(5000, Math.max(100, Math.floor(Number(rawMaxItems)) || 2500)),
      embeddingBatchSize,
      clusterCronDisabled: doc?.clusterCronDisabled !== undefined ? Boolean(doc.clusterCronDisabled) : envCron,
    };
  }

  async getForAdmin(): Promise<ResolvedClusterParams & { persisted: boolean }> {
    const effective = await this.getResolvedClusterParams();
    const persisted = await this.hasPersistedDocument();
    return { ...effective, persisted };
  }

  async update(dto: UpdateAggregationPolicyDto): Promise<ResolvedClusterParams & { persisted: boolean }> {
    const $set: Record<string, unknown> = {};
    if (dto.lookbackDays !== undefined) $set.lookbackDays = dto.lookbackDays;
    if (dto.maxPairHours !== undefined) $set.maxPairHours = dto.maxPairHours;
    if (dto.simTitle !== undefined) $set.simTitle = dto.simTitle;
    if (dto.simFull !== undefined) $set.simFull = dto.simFull;
    if (dto.maxItems !== undefined) $set.maxItems = dto.maxItems;
    if (dto.embeddingBatchSize !== undefined) $set.embeddingBatchSize = dto.embeddingBatchSize;
    if (dto.clusterCronDisabled !== undefined) $set.clusterCronDisabled = dto.clusterCronDisabled;
    if (Object.keys($set).length === 0) {
      return this.getForAdmin();
    }
    await this.policyModel
      .findOneAndUpdate(
        { key: AGGREGATION_POLICY_KEY },
        { $set: $set, $setOnInsert: { key: AGGREGATION_POLICY_KEY } },
        { upsert: true, new: true },
      )
      .exec();
    return this.getForAdmin();
  }
}
