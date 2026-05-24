import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export const AGGREGATION_POLICY_KEY = 'default';

export type AggregationPolicyDocument = AggregationPolicy & Document;

/** pipeline 增量事件簇可调参数（单例，key=default） */
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
}

export const AggregationPolicySchema = SchemaFactory.createForClass(AggregationPolicy);
