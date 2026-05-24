import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { JOB_STATUSES, JOB_TRIGGERS, JOB_TYPES, WORKER_KINDS, type JobStatus, type JobTrigger, type JobType, type WorkerKind } from '../job.types';

export type JobDocument = HydratedDocument<Job>;

@Schema({ timestamps: true, collection: 'jobs' })
export class Job {
  @Prop({ type: String, enum: JOB_TYPES, required: true, index: true })
  type: JobType;

  @Prop({ type: String, enum: JOB_STATUSES, required: true, index: true })
  status: JobStatus;

  @Prop({ required: true, trim: true, maxlength: 64 })
  queue: string;

  @Prop({ type: String, enum: JOB_TRIGGERS, required: true })
  trigger: JobTrigger;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  payload: Record<string, unknown>;

  @Prop({ trim: true, maxlength: 256, index: true, default: null })
  dedupeKey: string | null;

  @Prop({ trim: true, maxlength: 64, default: null })
  bullJobId: string | null;

  @Prop({ type: Types.ObjectId, ref: 'Job', default: null, index: true })
  parentJobId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Source', default: null, index: true })
  sourceId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Monitor', default: null, index: true })
  monitorId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'FeedItem', default: null, index: true })
  feedItemId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  userId: Types.ObjectId | null;

  @Prop({ type: Number, default: 0 })
  attempts: number;

  @Prop({ type: Number, default: 3 })
  maxAttempts: number;

  @Prop({ type: Number, default: 0 })
  priority: number;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  resultSummary: Record<string, unknown> | null;

  @Prop({ trim: true, maxlength: 4000, default: '' })
  errorMessage: string;

  @Prop({ type: String, enum: WORKER_KINDS, default: 'backend' })
  workerKind: WorkerKind;

  @Prop({ type: Date, required: true })
  scheduledAt: Date;

  @Prop({ type: Date, default: null })
  queuedAt: Date | null;

  @Prop({ type: Date, default: null })
  startedAt: Date | null;

  @Prop({ type: Date, default: null, index: true })
  completedAt: Date | null;

  @Prop({ type: Number, default: null })
  durationMs: number | null;
}

export const JobSchema = SchemaFactory.createForClass(Job);

JobSchema.index({ type: 1, status: 1, createdAt: -1 });
JobSchema.index(
  { dedupeKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      dedupeKey: { $type: 'string' },
      status: { $in: ['pending', 'queued', 'active'] },
    },
  },
);