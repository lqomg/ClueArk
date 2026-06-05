import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MonitorDocument = Monitor & Document;

@Schema({ timestamps: true })
export class Monitor {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 200 })
  title: string;

  @Prop({ required: true, trim: true, maxlength: 4000 })
  description: string;

  @Prop({ default: '', trim: true, maxlength: 2000 })
  topicPrompt: string;

  @Prop({ type: [String], default: [] })
  keywords: string[];

  @Prop({ type: [String], default: [] })
  entities: string[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Source' }], default: [] })
  sourceIds: Types.ObjectId[];

  @Prop({ type: Number, default: 0.43 })
  minCosine: number;

  @Prop({
    type: String,
    enum: ['pending', 'computing', 'ready', 'failed', 'stale'],
    default: 'pending',
    index: true,
  })
  snapshotStatus: string;

  @Prop({ type: Date, default: null })
  snapshotComputedAt: Date | null;

  /** 异步创建：processing → ready | failed；历史数据默认 ready */
  @Prop({
    type: String,
    enum: ['processing', 'ready', 'failed'],
    default: 'ready',
    index: true,
  })
  createStatus: string;

  @Prop({
    type: String,
    enum: ['understand', 'describe', 'sources', 'embedding', 'saving', 'snapshot', 'done'],
    default: 'done',
  })
  createStep: string;

  @Prop({ default: '', trim: true, maxlength: 500 })
  createError: string;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;
}

export const MonitorSchema = SchemaFactory.createForClass(Monitor);

MonitorSchema.index({ userId: 1, deletedAt: 1, createdAt: -1 });
