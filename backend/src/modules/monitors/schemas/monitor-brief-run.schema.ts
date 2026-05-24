import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MonitorBriefRunDocument = HydratedDocument<MonitorBriefRun>;

export type MonitorBriefRunStatus = 'skipped_unchanged' | 'succeeded' | 'failed';

@Schema({ timestamps: true, collection: 'monitor_brief_runs' })
export class MonitorBriefRun {
  @Prop({ type: Types.ObjectId, ref: 'Job', default: null, index: true })
  jobId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Monitor', required: true, index: true })
  monitorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 64, index: true })
  profileId: string;

  @Prop({ required: true, enum: ['rolling_hours', 'calendar_range'] })
  windowMode: 'rolling_hours' | 'calendar_range';

  @Prop({ required: true, trim: true, maxlength: 256, index: true })
  periodKey: string;

  @Prop({ type: Date, required: true })
  periodStart: Date;

  @Prop({ type: Date, required: true })
  periodEnd: Date;

  @Prop({ type: Number, required: true })
  minCosine: number;

  @Prop({ required: true, trim: true, maxlength: 128 })
  inputFingerprint: string;

  @Prop({ type: String, enum: ['skipped_unchanged', 'succeeded', 'failed'], required: true, index: true })
  status: MonitorBriefRunStatus;

  @Prop({ type: [Object], default: [] })
  evidenceSnapshot: Record<string, unknown>[];

  @Prop({ type: Object, default: null })
  briefContextSnapshot: Record<string, unknown> | null;

  @Prop({ type: Object, default: null })
  monitorSnapshot: Record<string, unknown> | null;

  @Prop({ trim: true, maxlength: 64, default: '' })
  systemPromptVersion: string;

  @Prop({ type: [String], default: [] })
  paragraphs: string[];

  @Prop({ type: [String], default: [] })
  citedItemIds: string[];

  @Prop({ trim: true, maxlength: 4000, default: '' })
  errorMessage: string;

  @Prop({ type: Number, default: null })
  durationMs: number | null;

  @Prop({ type: Date, default: null })
  startedAt: Date | null;

  @Prop({ type: Date, default: null, index: true })
  completedAt: Date | null;
}

export const MonitorBriefRunSchema = SchemaFactory.createForClass(MonitorBriefRun);

MonitorBriefRunSchema.index({ monitorId: 1, profileId: 1, status: 1, completedAt: -1 });
MonitorBriefRunSchema.index({ monitorId: 1, profileId: 1, periodKey: 1, completedAt: -1 });
