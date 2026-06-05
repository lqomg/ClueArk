import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FeedItemTranslationDocument = FeedItemTranslation & Document;

@Schema({ timestamps: true, collection: 'feed_item_translations' })
export class FeedItemTranslation {
  @Prop({ type: Types.ObjectId, ref: 'FeedItem', required: true, index: true })
  feedItemId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 16, index: true })
  locale: string;

  @Prop({ required: true, trim: true, maxlength: 500 })
  title: string;

  @Prop({ default: '', trim: true, maxlength: 50000 })
  summary: string;

  @Prop({ default: '', trim: true, maxlength: 64 })
  model: string;
}

export const FeedItemTranslationSchema = SchemaFactory.createForClass(FeedItemTranslation);

FeedItemTranslationSchema.index({ feedItemId: 1, locale: 1 }, { unique: true });
