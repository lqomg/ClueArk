import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  MonitorReadCursor,
  MonitorReadCursorDocument,
} from './schemas/monitor-read-cursor.schema';

@Injectable()
export class MonitorReadCursorService {
  constructor(
    @InjectModel(MonitorReadCursor.name)
    private readonly cursorModel: Model<MonitorReadCursorDocument>,
  ) {}

  async getCursorsForUser(
    userId: string,
    monitorIds: string[],
  ): Promise<
    Map<string, { lastReadAt: Date; lastHomeVisitAt: Date | null; lastReportSeenAt: Date | null }>
  > {
    const out = new Map<
      string,
      { lastReadAt: Date; lastHomeVisitAt: Date | null; lastReportSeenAt: Date | null }
    >();
    if (!Types.ObjectId.isValid(userId) || !monitorIds.length) return out;
    const oids = monitorIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    if (!oids.length) return out;
    const rows = await this.cursorModel
      .find({
        userId: new Types.ObjectId(userId),
        monitorId: { $in: oids },
      })
      .select({ monitorId: 1, lastReadAt: 1, lastHomeVisitAt: 1, lastReportSeenAt: 1 })
      .lean()
      .exec();
    for (const row of rows) {
      out.set(String(row.monitorId), {
        lastReadAt: row.lastReadAt,
        lastHomeVisitAt: row.lastHomeVisitAt ?? null,
        lastReportSeenAt: row.lastReportSeenAt ?? null,
      });
    }
    return out;
  }

  /** 首页巡视：更新所有可读专题的 lastHomeVisitAt（不抬 lastReadAt） */
  async markHomeVisit(userId: string, monitorIds: string[], at = new Date()): Promise<void> {
    if (!Types.ObjectId.isValid(userId) || !monitorIds.length) return;
    const ops = monitorIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((monitorId) => ({
        updateOne: {
          filter: {
            userId: new Types.ObjectId(userId),
            monitorId: new Types.ObjectId(monitorId),
          },
          update: {
            $set: { lastHomeVisitAt: at },
            $setOnInsert: {
              userId: new Types.ObjectId(userId),
              monitorId: new Types.ObjectId(monitorId),
              lastReadAt: at,
            },
          },
          upsert: true,
        },
      }));
    if (!ops.length) return;
    await this.cursorModel.bulkWrite(ops, { ordered: false });
  }
}
