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

  /** 用户创建时输入的简短监控意图（原始） */
  @Prop({ default: '', trim: true, maxlength: 2000 })
  topicPrompt: string;

  @Prop({ type: [String], default: [] })
  keywords: string[];

  @Prop({ type: [String], default: [] })
  entities: string[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Source' }], default: [] })
  sourceIds: Types.ObjectId[];

  @Prop({ type: [Number], required: true })
  descriptionEmbedding: number[];

  @Prop({ trim: true, maxlength: 128, default: '' })
  embeddingModel: string;

  /** 时间线过滤：条目与监控描述向量的最低余弦相似度（0～1） */
  @Prop({ type: Number, default: 0.43 })
  minCosine: number;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;
}

export const MonitorSchema = SchemaFactory.createForClass(Monitor);

MonitorSchema.index({ userId: 1, deletedAt: 1, createdAt: -1 });
