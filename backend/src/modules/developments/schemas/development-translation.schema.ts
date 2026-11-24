import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DevelopmentTranslationDocument = DevelopmentTranslation & Document;

@Schema({ timestamps: true, collection: 'development_translations' })
export class DevelopmentTranslation {
  @Prop({ type: Types.ObjectId, ref: 'MonitorDevelopment', required: true, index: true })
  developmentId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 16, index: true })
  locale: string;

  @Prop({ required: true, trim: true, maxlength: 500 })
  title: string;

  @Prop({ default: '', trim: true, maxlength: 4000 })
  summary: string;

  @Prop({ default: '', trim: true, maxlength: 64 })
  model: string;

  /** 原文 title+summary 指纹；缺失或与当前原文不一致则视为缓存失效 */
  @Prop({ default: '', trim: true, maxlength: 64 })
  sourceHash: string;
}

export const DevelopmentTranslationSchema = SchemaFactory.createForClass(DevelopmentTranslation);

DevelopmentTranslationSchema.index({ developmentId: 1, locale: 1 }, { unique: true });
