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

  @Prop({ default: '', trim: true, maxlength: 50000 })
  summary: string;

  /** 有效发布时间（入库必填；无可靠来源时间时用抓取时刻） */
  @Prop({ type: Date, required: true, index: true })
  publishedAt: Date;

  @Prop({ default: '', trim: true, maxlength: 512 })
  guid: string;

  /** 相似报道聚类：同簇共享最小 _id；未合并为 null */
  @Prop({ type: Types.ObjectId, default: null, index: true })
  clusterId: Types.ObjectId | null;

  /** 标题向量（仅聚类任务读写，列表接口不返回） */
  @Prop({ type: [Number], default: undefined })
  simEmbedTitle?: number[];

  /** 标题+摘要向量 */
  @Prop({ type: [Number], default: undefined })
  simEmbedFull?: number[];

  /** 监控 pipeline：pending | embedded | matched | failed */
  @Prop({ type: String, default: null, index: true })
  pipelineStatus?: string | null;

  @Prop({ type: Date, default: null })
  embeddedAt?: Date | null;
}

export const FeedItemSchema = SchemaFactory.createForClass(FeedItem);

FeedItemSchema.index(
  { sourceId: 1, itemKey: 1 },
  { unique: true },
);

FeedItemSchema.index({ publishedAt: -1, createdAt: -1 });
FeedItemSchema.index({ clusterId: 1, sourceId: 1, publishedAt: -1 });
