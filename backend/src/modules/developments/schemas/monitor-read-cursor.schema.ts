import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'monitor_read_cursors' })
export class MonitorReadCursor {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Monitor', required: true, index: true })
  monitorId: Types.ObjectId;

  /** 用户上次读完该专题进展时间线的时间（UTC） */
  @Prop({ type: Date, required: true })
  lastReadAt: Date;

  /** 首页巡视时间（跨专题）；缺省时用 lastReadAt */
  @Prop({ type: Date, default: null })
  lastHomeVisitAt: Date | null;

  @Prop({ type: Date, default: null })
  lastReportSeenAt: Date | null;
}

export type MonitorReadCursorDocument = HydratedDocument<MonitorReadCursor>;
export const MonitorReadCursorSchema = SchemaFactory.createForClass(MonitorReadCursor);
MonitorReadCursorSchema.index({ userId: 1, monitorId: 1 }, { unique: true });
