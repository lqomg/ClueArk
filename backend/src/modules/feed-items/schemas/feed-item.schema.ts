import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FeedItemDocument = FeedItem & Document;

@Schema({ timestamps: true })
export class FeedItem {
  @Prop({ type: Types.ObjectId, ref: 'Source', required: true, index: true })
  sourceId: Types.ObjectId;

  /** 信源内 upsert 稳定键：规范化 link 或 guid 的 sha256 hex（不作跨源合并） */
  @Prop({ required: true, maxlength: 64 })
  itemKey: string;

  @Prop({ required: true, trim: true, maxlength: 2048 })
  link: string;

  @Prop({ required: true, trim: true, maxlength: 500 })
  title: string;

  @Prop({ default: '', trim: true, maxlength: 8000 })
  summary: string;

  @Prop({ type: Date, default: null, index: true })
  publishedAt: Date | null;

  @Prop({ default: '', trim: true, maxlength: 512 })
  guid: string;

  /** LLM 富化：pending → processing → done | failed */
  @Prop({ type: String, enum: ['pending', 'processing', 'done', 'failed', 'skipped'], default: 'pending', index: true })
  llmStatus: 'pending' | 'processing' | 'done' | 'failed' | 'skipped';

  @Prop({ type: [String], default: [] })
  llmTags: string[];

  @Prop({ default: '', trim: true, maxlength: 2000 })
  llmRecommendReason: string;

  /** 精选排序权重 0～100，未富化可为 null */
  @Prop({ type: Number, default: null, min: 0, max: 100 })
  llmPriority: number | null;

  @Prop({ default: '', trim: true, maxlength: 128 })
  llmModel: string;

  @Prop({ default: '', trim: true, maxlength: 2000 })
  llmError: string;

  /** 相似报道聚类：同簇共享最小 _id；未合并为 null */
  @Prop({ type: Types.ObjectId, default: null, index: true })
  clusterId: Types.ObjectId | null;

  /** 标题向量（仅聚类任务读写，列表接口不返回） */
  @Prop({ type: [Number], default: undefined })
  simEmbedTitle?: number[];

  /** 标题+摘要向量 */
  @Prop({ type: [Number], default: undefined })
  simEmbedFull?: number[];
}

export const FeedItemSchema = SchemaFactory.createForClass(FeedItem);

FeedItemSchema.index(
  { sourceId: 1, itemKey: 1 },
  { unique: true },
);

FeedItemSchema.index({ publishedAt: -1, createdAt: -1 });
FeedItemSchema.index({ llmStatus: 1, createdAt: 1 });
FeedItemSchema.index({ llmPriority: -1, publishedAt: -1 });
FeedItemSchema.index({ clusterId: 1, publishedAt: -1 });
