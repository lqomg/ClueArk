import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
export type NotificationDocument = HydratedDocument<Notification>;
@Schema({ timestamps: true, collection: "notifications" })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  userId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: "Monitor", required: true, index: true })
  monitorId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: "FeedItem", required: true })
  feedItemId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: "FeedItem", default: null, index: true })
  clusterId: Types.ObjectId | null;
  @Prop({ required: true, trim: true, maxlength: 128, index: true })
  dedupeKey: string;
  @Prop({ type: Number, required: true })
  score: number;
  @Prop({ required: true, trim: true, maxlength: 500 })
  title: string;
  @Prop({ required: true, trim: true, maxlength: 2048 })
  link: string;
  @Prop({ trim: true, maxlength: 200 })
  monitorTitle: string;
  @Prop({ type: Date, default: null, index: true })
  readAt: Date | null;
}
export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ dedupeKey: 1 }, { unique: true });
NotificationSchema.index({ userId: 1, createdAt: -1 });
