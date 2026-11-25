import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MonitorGateDecisionDocument = HydratedDocument<MonitorGateDecision>;

export const GATE_FINAL_ACTIONS = ['wake', 'drop'] as const;
export type GateFinalAction = (typeof GATE_FINAL_ACTIONS)[number];

export const GATE_STAGE_NAMES = ['admission', 'llm'] as const;
export type GateStageName = (typeof GATE_STAGE_NAMES)[number];

@Schema({ _id: false })
export class GateDecisionStage {
  @Prop({ type: String, enum: GATE_STAGE_NAMES, required: true })
  stage: GateStageName;

  @Prop({ required: true, trim: true, maxlength: 32 })
  action: string;

  @Prop({ default: '', trim: true, maxlength: 64 })
  reasonCode: string;

  @Prop({ default: '', trim: true, maxlength: 500 })
  reasonText: string;

  @Prop({ type: Number, default: null })
  score: number | null;
}

export const GateDecisionStageSchema = SchemaFactory.createForClass(GateDecisionStage);

@Schema({ _id: false })
export class GateDecisionLlmMeta {
  @Prop({ default: '', trim: true, maxlength: 16 })
  action: string;

  @Prop({ default: '', trim: true, maxlength: 500 })
  reason: string;

  @Prop({ type: Number, default: null })
  latencyMs: number | null;

  @Prop({ type: Boolean, default: false })
  failed: boolean;
}

export const GateDecisionLlmMetaSchema = SchemaFactory.createForClass(GateDecisionLlmMeta);

@Schema({ timestamps: true, collection: 'monitor_gate_decisions' })
export class MonitorGateDecision {
  @Prop({ type: Types.ObjectId, ref: 'Monitor', required: true, index: true })
  monitorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'FeedItem', required: true, index: true })
  feedItemId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Source', required: true, index: true })
  sourceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'FeedItem', default: null, index: true })
  clusterId: Types.ObjectId | null;

  @Prop({ type: String, enum: GATE_FINAL_ACTIONS, required: true, index: true })
  finalAction: GateFinalAction;

  @Prop({ type: [GateDecisionStageSchema], default: [] })
  stages: GateDecisionStage[];

  @Prop({ type: Types.ObjectId, ref: 'MonitorDevelopment', default: null })
  developmentId: Types.ObjectId | null;

  @Prop({ type: GateDecisionLlmMetaSchema, default: null })
  llm: GateDecisionLlmMeta | null;

  @Prop({ default: '', trim: true, maxlength: 300 })
  itemTitle: string;

  @Prop({ type: Date, default: null })
  itemPublishedAt: Date | null;

  @Prop({ type: String, enum: ['admitted', 'missed', null], default: null })
  admissionOutcome: 'admitted' | 'missed' | null;

  /** TTL 锚点：90 天后自动过期 */
  @Prop({ type: Date, required: true })
  expireAt: Date;
}

export const MonitorGateDecisionSchema = SchemaFactory.createForClass(MonitorGateDecision);
MonitorGateDecisionSchema.index({ monitorId: 1, createdAt: -1 });
MonitorGateDecisionSchema.index({ monitorId: 1, finalAction: 1, createdAt: -1 });
MonitorGateDecisionSchema.index({ monitorId: 1, feedItemId: 1 }, { unique: true });
MonitorGateDecisionSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
