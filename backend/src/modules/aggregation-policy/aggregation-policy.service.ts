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

/** pipeline 增量事件簇：窗口 + 标题向量相似度阈值 */
export type ResolvedClusterParams = {
  lookbackDays: number;
  maxPairHours: number;
  simTitle: number;
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

  /** 增量聚簇使用：已落库字段优先，否则回退 .env */
  async getResolvedClusterParams(): Promise<ResolvedClusterParams> {
    const doc = await this.policyModel.findOne({ key: AGGREGATION_POLICY_KEY }).lean().exec();
    const rawLookback = doc?.lookbackDays ?? Number(this.config.get('EVENT_CLUSTER_LOOKBACK_DAYS') ?? this.config.get('FEED_CLUSTER_LOOKBACK_DAYS') ?? 7);
    const rawPair = doc?.maxPairHours ?? Number(this.config.get('EVENT_CLUSTER_MAX_PAIR_HOURS') ?? this.config.get('FEED_CLUSTER_MAX_PAIR_HOURS') ?? 48);
    const rawTitle =
      doc?.simTitle ??
      Number(this.config.get('PIPELINE_EVENT_SIM_TITLE') ?? this.config.get('FEED_CLUSTER_SIM_TITLE') ?? 0.92);
    return {
      lookbackDays: Math.min(30, Math.max(1, Math.floor(Number(rawLookback)) || 7)),
      maxPairHours: Math.min(168, Math.max(1, Math.floor(Number(rawPair)) || 48)),
      simTitle: Math.min(0.999, Math.max(0.5, Number(rawTitle) || 0.92)),
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
