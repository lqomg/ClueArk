import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MonitorDevelopmentDocument = HydratedDocument<MonitorDevelopment>;

export const DEVELOPMENT_TYPES = [
  'update',
  'new_fact',
  'escalation',
  'official_statement',
  'correction',
  'contradiction',
  'milestone',
  'trend',
  'policy_change',
  'market_move',
  'regulatory',
  'technical_breakthrough',
  'community_reaction',
  'background',
  'duplicate',
] as const;
export type DevelopmentType = (typeof DEVELOPMENT_TYPES)[number];

export const DEVELOPMENT_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export type DevelopmentSeverity = (typeof DEVELOPMENT_SEVERITIES)[number];

@Schema({ _id: false })
export class DevelopmentUpdateBeat {
  @Prop({ type: Date, required: true })
  at: Date;

  @Prop({ type: Types.ObjectId, ref: 'FeedItem', default: null })
  feedItemId: Types.ObjectId | null;

  @Prop({ default: '', trim: true, maxlength: 80 })
  title: string;
}

export const DevelopmentUpdateBeatSchema = SchemaFactory.createForClass(DevelopmentUpdateBeat);

@Schema({ timestamps: true, collection: 'monitor_developments' })
export class MonitorDevelopment {
  @Prop({ type: Types.ObjectId, ref: 'Monitor', required: true, index: true })
  monitorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 300 })
  title: string;

  @Prop({ required: true, trim: true, maxlength: 4000 })
  summary: string;

  @Prop({ default: '', trim: true, maxlength: 800 })
  rationale: string;

  @Prop({ type: String, enum: DEVELOPMENT_TYPES, default: 'update', index: true })
  type: DevelopmentType;

  @Prop({ type: String, enum: DEVELOPMENT_SEVERITIES, default: 'medium', index: true })
  severity: DevelopmentSeverity;

  @Prop({ type: Number, default: 0.5, min: 0, max: 1 })
  noveltyScore: number;

  @Prop({ type: Number, default: 0.5, min: 0, max: 1 })
  confidence: number;

  /** 对该专题为何重要（可选；缺省时 UI 用 summary） */
  @Prop({ default: '', trim: true, maxlength: 500 })
  whyItMatters: string;

  /** 下一步确认点（可选） */
  @Prop({ default: '', trim: true, maxlength: 300 })
  watchNext: string;

  /** 结构化事实块；写入前经 normalizeStructuredFact */
  @Prop({ type: Object, default: null })
  structuredFact: Record<string, unknown> | null;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'FeedItem' }], default: [] })
  evidenceItemIds: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId }], default: [] })
  clusterIds: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'FeedItem', default: null })
  primaryEvidenceItemId: Types.ObjectId | null;

  /** 阶段 4 门禁接入前仅占位 */
  @Prop({ type: [{ type: Types.ObjectId }], default: [] })
  alertIds: Types.ObjectId[];

  /** 阶段 4 门禁接入前仅占位 */
  @Prop({ type: Types.ObjectId, default: null })
  gateDecisionId: Types.ObjectId | null;

  /** 合并作用域键：clusterId 或 feedItemId */
  @Prop({ required: true, trim: true, maxlength: 64, index: true })
  mergeScopeKey: string;

  @Prop({ type: Date, required: true, index: true })
  occurredAt: Date;

  @Prop({ type: Date, required: true, index: true })
  timelineAt: Date;

  /** instant=有钟点；day=仅日历日（展示勿出假 HH:mm） */
  @Prop({ type: String, enum: ['instant', 'day'], default: 'instant' })
  timePrecision: 'instant' | 'day';

  /** 最近一次实质更新（新建或 textChanged）；勿用 Mongo updatedAt */
  @Prop({ type: Date, default: null, index: true })
  lastMeaningfulAt: Date | null;

  @Prop({ type: [DevelopmentUpdateBeatSchema], default: [] })
  updates: DevelopmentUpdateBeat[];

  @Prop({ default: '', trim: true, maxlength: 16 })
  locale: string;
}

export const MonitorDevelopmentSchema = SchemaFactory.createForClass(MonitorDevelopment);
MonitorDevelopmentSchema.index({ monitorId: 1, timelineAt: -1 });
MonitorDevelopmentSchema.index({ monitorId: 1, occurredAt: -1, _id: -1 });
MonitorDevelopmentSchema.index({ monitorId: 1, mergeScopeKey: 1 }, { unique: true });
MonitorDevelopmentSchema.index({ monitorId: 1, clusterIds: 1 });
MonitorDevelopmentSchema.index({ userId: 1, createdAt: -1 });
