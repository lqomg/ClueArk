import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Monitor, MonitorDocument } from '../monitors/schemas/monitor.schema';
import { MonitorSnapshotService } from '../monitors/monitor-snapshot.service';
import { LoggerService } from '../logger';
import type { ListDashboardFeedQueryDto } from './dto/list-dashboard-feed.query.dto';

/** 参与混排的监控数量上限（控制 Qdrant 扇出） */
const DASHBOARD_FEED_MAX_MONITORS = 24;
/** 单监控拉取条数硬上限 */
const DASHBOARD_PER_MONITOR_CAP = 50;

export type DashboardFeedItemPublic = Awaited<
  ReturnType<MonitorSnapshotService['listFeedPage']>
>['items'][number] & {
  monitorId: string;
  monitorTitle: string;
};

export type DashboardFeedPublic = {
  items: DashboardFeedItemPublic[];
  total: number;
  page: number;
  pageSize: number;
  recentHours: number;
};

@Injectable()
export class DashboardService {
  private readonly logger;

  constructor(
    @InjectModel(Monitor.name) private readonly monitorModel: Model<MonitorDocument>,
    private readonly snapshotService: MonitorSnapshotService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createLogger(DashboardService.name);
  }

  async listFeed(userId: string, q: ListDashboardFeedQueryDto): Promise<DashboardFeedPublic> {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 40;
    const recentHours = q.recentHours ?? 168;
    const uid = new Types.ObjectId(userId);

    const filter: Record<string, unknown> = { userId: uid, deletedAt: null };
    if (q.monitorId) {
      filter._id = new Types.ObjectId(q.monitorId);
    }

    const monitors = await this.monitorModel
      .find(filter)
      .sort({ updatedAt: -1 })
      .limit(q.monitorId ? 1 : DASHBOARD_FEED_MAX_MONITORS)
      .exec();

    if (monitors.length === 0) {
      return { items: [], total: 0, page, pageSize, recentHours };
    }

    const perMonitorTake = Math.min(
      DASHBOARD_PER_MONITOR_CAP,
      Math.max(12, Math.ceil((page * pageSize) / monitors.length) + 4),
    );

    const batches = await Promise.all(
      monitors.map(async (monitor) => {
        try {
          const { items } = await this.snapshotService.listFeedPage(
            monitor,
            recentHours,
            1,
            perMonitorTake,
          );
          const monitorId = String(monitor._id);
          return items.map((item) => ({
            ...item,
            monitorId,
            monitorTitle: monitor.title,
          }));
        } catch (err) {
          this.logger.warn(
            `dashboard_feed_monitor_failed monitorId=${String(monitor._id)} err=${err instanceof Error ? err.message : String(err)}`,
          );
          return [] as DashboardFeedItemPublic[];
        }
      }),
    );

    let merged = batches.flat();
    merged.sort((a, b) => {
      const ta = Date.parse(a.publishedAt);
      const tb = Date.parse(b.publishedAt);
      if (tb !== ta) return tb - ta;
      return (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0);
    });

    const needle = q.q?.trim().toLowerCase();
    if (needle) {
      merged = merged.filter((item) => {
        const hay = `${item.title} ${item.summary ?? ''} ${item.monitorTitle} ${item.sourceDisplayName}`.toLowerCase();
        return hay.includes(needle);
      });
    }

    const total = merged.length;
    const skip = (page - 1) * pageSize;
    const items = merged.slice(skip, skip + pageSize);

    this.logger.debug(
      `dashboard_list_feed userId=${userId} monitors=${monitors.length} perMonitorTake=${perMonitorTake} total=${total} returned=${items.length} page=${page}`,
    );

    return { items, total, page, pageSize, recentHours };
  }
}
