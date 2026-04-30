import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MonitorDocument = Monitor & Document;

@Schema({ timestamps: true })
export class Monitor {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 200 })
  title: string;

  @Prop({ required: true, trim: true, maxlength: 2000 })
  description: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Source' }], default: [] })
  sourceIds: Types.ObjectId[];

  @Prop({ type: [Number], required: true })
  descriptionEmbedding: number[];

  @Prop({ trim: true, maxlength: 128, default: '' })
  embeddingModel: string;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;
}

export const MonitorSchema = SchemaFactory.createForClass(Monitor);

MonitorSchema.index({ userId: 1, deletedAt: 1, createdAt: -1 });
