import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export const AGGREGATION_POLICY_KEY = 'default';

export type AggregationPolicyDocument = AggregationPolicy & Document;

/** 相似聚类/聚合可调参数（单例，key=default） */
@Schema({ timestamps: true, collection: 'aggregation_policies' })
export class AggregationPolicy {
  @Prop({ type: String, required: true, unique: true, default: AGGREGATION_POLICY_KEY })
  key: string;

  @Prop({ type: Number, min: 1, max: 30 })
  lookbackDays?: number;

  @Prop({ type: Number, min: 1, max: 168 })
  maxPairHours?: number;

  @Prop({ type: Number, min: 0.5, max: 0.999 })
  simTitle?: number;

  @Prop({ type: Number, min: 0.5, max: 0.999 })
  simFull?: number;

  @Prop({ type: Number, min: 100, max: 5000 })
  maxItems?: number;

  @Prop({ type: Number, min: 1, max: 2048 })
  embeddingBatchSize?: number;

  /** true 时跳过定时相似聚类（手动 POST cluster/run 仍可用） */
  @Prop({ type: Boolean })
  clusterCronDisabled?: boolean;
}

export const AggregationPolicySchema = SchemaFactory.createForClass(AggregationPolicy);
