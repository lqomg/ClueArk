import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FeedItemLlmDocument = HydratedDocument<FeedItemLlm>;

export type FeedItemLlmStatus = 'pending' | 'processing' | 'done' | 'failed' | 'skipped';

export type FeedItemLlmLocaleContent = {
  tags: string[];
  recommendReason: string;
};

@Schema({ collection: 'feed_item_llm', timestamps: true })
export class FeedItemLlm {
  @Prop({ type: Types.ObjectId, ref: 'FeedItem', required: true, unique: true, index: true })
  feedItemId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['pending', 'processing', 'done', 'failed', 'skipped'],
    default: 'pending',
    index: true,
  })
  status: FeedItemLlmStatus;

  @Prop({ type: [String], default: [] })
  tagKeys: string[];

  @Prop({ type: Object, default: {} })
  locales: Record<string, FeedItemLlmLocaleContent>;

  @Prop({ default: '', trim: true, maxlength: 128 })
  llmModel: string;

  @Prop({ default: '', trim: true, maxlength: 2000 })
  llmError: string;
}

export const FeedItemLlmSchema = SchemaFactory.createForClass(FeedItemLlm);

FeedItemLlmSchema.index({ status: 1, updatedAt: 1 });
