import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
export type MonitorSnapshotDocument = HydratedDocument<MonitorSnapshot>;
export type MonitorSnapshotStatus = "computing" | "ready" | "failed";
@Schema({ _id: false })
export class MonitorSnapshotMetrics {
  @Prop({ type: Number, default: null })
  heatIndex: number | null;
  @Prop({ type: Number, default: 0 })
  newLast24h: number;
  @Prop({ type: Number, default: 0 })
  totalInWindow: number;
  @Prop({ type: String, default: null })
  lastActivityAt: string | null;
  @Prop({ type: [{ date: String, count: Number }], default: [] })
  trend: { date: string; count: number }[];
}
@Schema({ timestamps: true, collection: "monitor_snapshots" })
export class MonitorSnapshot {
  @Prop({ type: Types.ObjectId, ref: "Monitor", required: true, index: true })
  monitorId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  userId: Types.ObjectId;
  @Prop({ type: Number, required: true })
  recentHours: number;
  @Prop({
    type: String,
    enum: ["computing", "ready", "failed"],
    required: true,
  })
  status: MonitorSnapshotStatus;
  @Prop({ type: Date, default: null })
  computedAt: Date | null;
  @Prop({ trim: true, maxlength: 128, default: "" })
  fingerprint: string;
  @Prop({ trim: true, maxlength: 2000, default: "" })
  errorMessage: string;
  @Prop({ type: MonitorSnapshotMetrics, default: () => ({}) })
  metrics: MonitorSnapshotMetrics;
  @Prop({ type: [Object], default: [] })
  chartKeywords: { name: string; count: number }[];
  @Prop({ type: [Object], default: [] })
  latestItems: Record<string, unknown>[];
}
export const MonitorSnapshotSchema =
  SchemaFactory.createForClass(MonitorSnapshot);
MonitorSnapshotSchema.index({ monitorId: 1, recentHours: 1 }, { unique: true });
