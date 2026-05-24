import { Injectable } from "@nestjs/common";
import { LoggerService } from "../logger";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Monitor, MonitorDocument } from "./schemas/monitor.schema";
import {
  MonitorSnapshot,
  MonitorSnapshotDocument,
} from "./schemas/monitor-snapshot.schema";
import {
  FeedItem,
  FeedItemDocument,
} from "../feed-items/schemas/feed-item.schema";
import { VectorStoreService } from "../vector-store/vector-store.service";
import { UsersService } from "../users/users.service";
import {
  dateKeyInTimeZone,
  sevenDayTrendDateKeys,
} from "../../common/utils/timezone.utils";
import { serializeFeedItem } from "../feed-items/feed-item.serialize";
import {
  buildClusterStatsMap,
  dedupeScoredByCluster,
  feedClusterGroupKey,
} from "../feed-items/feed-cluster-timeline.util";

export type MonitorFeedTimelineItem = ReturnType<typeof serializeFeedItem> & {
  relevanceScore: number;
  clusterId: string | null;
  clusterItemCount: number;
  clusterSourceCount: number;
};
@Injectable()
export class MonitorSnapshotService {
  private readonly logger: LoggerService;
  constructor(
    @InjectModel(Monitor.name)
    private readonly monitorModel: Model<MonitorDocument>,
    @InjectModel(MonitorSnapshot.name)
    private readonly snapshotModel: Model<MonitorSnapshotDocument>,
    @InjectModel(FeedItem.name)
    private readonly feedItemModel: Model<FeedItemDocument>,
    private readonly vectorStore: VectorStoreService,
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createLogger(MonitorSnapshotService.name);
  }
  private timelineCap(): number {
    const raw = Number(this.config.get("MONITOR_TIMELINE_CANDIDATE_CAP"));
    return Number.isFinite(raw) && raw >= 100 && raw <= 20000
      ? Math.floor(raw)
      : 3000;
  }
  private heatIndexFromSignals(
    count24h: number,
    count7d: number,
    avgRelevance: number,
    boundSourceCount: number,
    totalInWindow: number,
  ): number | null {
    if (totalInWindow === 0) return null;
    const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
    const n = (x: number, lo: number, hi: number) =>
      hi <= lo ? 0 : clamp01((x - lo) / (hi - lo));
    const raw =
      0.35 * n(count24h, 0, 10) +
      0.25 * n(avgRelevance, 0.42, 0.92) +
      0.1 * n(boundSourceCount, 8, 24) +
      0.3 * n(count7d, 0, 50);
    return Math.round(raw * 100) / 10;
  }
  async fetchScoredForMonitor(
    monitor: MonitorDocument,
    periodStartMs: number,
    periodEndMs: number,
  ): Promise<{
    scored: { doc: Record<string, unknown>; score: number }[];
    minSim: number;
  }> {
    const minSim =
      typeof monitor.minCosine === "number" &&
      Number.isFinite(monitor.minCosine)
        ? Math.min(1, Math.max(0, monitor.minCosine))
        : 0.43;
    const sourceIds = (monitor.sourceIds ?? []).map((x) => String(x));
    const queryVec = await this.vectorStore.getMonitorVector(
      String(monitor._id),
    );
    if (!queryVec?.length) {
      return { scored: [], minSim };
    }
    const hits = await this.vectorStore.searchFeedItemsByMonitorVector(
      queryVec,
      sourceIds,
      periodStartMs,
      periodEndMs,
      this.timelineCap(),
      minSim,
    );
    const ids = hits.map((h) => new Types.ObjectId(h.feedItemId));
    const mongoRows = ids.length
      ? await this.feedItemModel
          .find({ _id: { $in: ids } })
          .populate({ path: "sourceId", select: "displayName" })
          .lean()
          .exec()
      : [];
    const mongoMap = new Map(mongoRows.map((r) => [String(r._id), r]));
    const scored = hits
      .map((h) => {
        const doc = mongoMap.get(h.feedItemId);
        if (!doc) return null;
        return { doc: doc as Record<string, unknown>, score: h.score };
      })
      .filter(
        (x): x is { doc: Record<string, unknown>; score: number } => x != null,
      );
    scored.sort((a, b) => {
      const ta = new Date(a.doc.publishedAt as Date).getTime();
      const tb = new Date(b.doc.publishedAt as Date).getTime();
      if (tb !== ta) return tb - ta;
      return b.score - a.score;
    });
    return { scored, minSim };
  }

  async getSnapshotLean(monitorId: string, recentHours: number) {
    return this.snapshotModel
      .findOne({
        monitorId: new Types.ObjectId(monitorId),
        recentHours,
      })
      .lean()
      .exec();
  }

  async listFeedPage(
    monitor: MonitorDocument,
    recentHours: number,
    page: number,
    pageSize: number,
  ): Promise<{
    items: MonitorFeedTimelineItem[];
    total: number;
    minSim: number;
  }> {
    const nowMs = Date.now();
    const periodStartMs = nowMs - recentHours * 3600000;
    const { scored, minSim } = await this.fetchScoredForMonitor(monitor, periodStartMs, nowMs);
    const statsMap = buildClusterStatsMap(scored);
    const deduped = dedupeScoredByCluster(scored);
    const total = deduped.length;
    const slice = deduped.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);
    const items = slice.map((s) => {
      const key = feedClusterGroupKey(s.doc);
      const stats = statsMap.get(key) ?? { clusterItemCount: 1, clusterSourceCount: 1 };
      const cid = s.doc.clusterId as Types.ObjectId | null | undefined;
      return {
        ...serializeFeedItem(s.doc),
        relevanceScore: Math.round(s.score * 1000) / 1000,
        clusterId: cid ? String(cid) : null,
        clusterItemCount: stats.clusterItemCount,
        clusterSourceCount: stats.clusterSourceCount,
      };
    });
    return { items, total, minSim };
  }

  /** 监控绑定信源内、同一相似簇的其它报道（展开「查看」） */
  async listClusterItemsForMonitor(
    monitor: MonitorDocument,
    clusterId: string,
  ): Promise<{
    clusterId: string;
    items: Array<{
      id: string;
      sourceDisplayName: string;
      title: string;
      link: string;
      publishedAt: string;
    }>;
  }> {
    const k = clusterId?.trim() ?? "";
    if (!Types.ObjectId.isValid(k)) {
      return { clusterId: k, items: [] };
    }
    const sourceIds = (monitor.sourceIds ?? []).map((x) => new Types.ObjectId(String(x)));
    if (sourceIds.length === 0) {
      return { clusterId: k, items: [] };
    }
    const rows = await this.feedItemModel
      .find({
        clusterId: new Types.ObjectId(k),
        sourceId: { $in: sourceIds },
      })
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(80)
      .populate({ path: "sourceId", select: "displayName" })
      .lean()
      .exec();
    const items = rows.map((r) => {
      const ser = serializeFeedItem(r as unknown as Record<string, unknown>);
      return {
        id: ser.id,
        sourceDisplayName: ser.sourceDisplayName,
        title: ser.title,
        link: ser.link,
        publishedAt: ser.publishedAt,
      };
    });
    return { clusterId: k, items };
  }

  async computeSnapshot(monitorId: string, recentHours: number): Promise<void> {
    const t0 = Date.now();
    this.logger.debug(
      `event=snapshot_start monitorId=${monitorId} recentHours=${recentHours}`,
    );
    const monitor = await this.monitorModel.findById(monitorId).exec();
    if (!monitor || monitor.deletedAt) {
      this.logger.debug(
        `event=snapshot_skip monitorId=${monitorId} reason=not_found_or_deleted`,
      );
      return;
    }
    const userId = monitor.userId as Types.ObjectId;
    await this.monitorModel
      .updateOne(
        { _id: monitor._id },
        { $set: { snapshotStatus: "computing" } },
      )
      .exec();
    await this.snapshotModel
      .updateOne(
        { monitorId: monitor._id, recentHours },
        {
          $set: {
            userId,
            status: "computing",
            errorMessage: "",
          },
        },
        { upsert: true },
      )
      .exec();
    try {
      const viewerTz = await this.usersService.getTimeZoneOrDefault(
        String(userId),
      );
      const minSim =
        typeof monitor.minCosine === "number" &&
        Number.isFinite(monitor.minCosine)
          ? Math.min(1, Math.max(0, monitor.minCosine))
          : 0.43;
      const sourceIds = (monitor.sourceIds ?? []).map((x) => String(x));
      const nowMs = Date.now();
      const periodStartMs = nowMs - recentHours * 3600000;
      const { scored } = await this.fetchScoredForMonitor(
        monitor,
        periodStartMs,
        nowMs,
      );
      const h24 = nowMs - 24 * 3600000;
      const h168 = nowMs - 168 * 3600000;
      let newLast24h = 0;
      let count7d = 0;
      let sumScore = 0;
      const tagCount = new Map<string, number>();
      for (const s of scored) {
        const t = new Date(s.doc.publishedAt as Date).getTime();
        sumScore += s.score;
        if (t >= h24) newLast24h += 1;
        if (t >= h168) count7d += 1;
        const rawTags = s.doc.llmTags;
        if (Array.isArray(rawTags)) {
          for (const tag of rawTags) {
            const name = String(tag ?? "").trim();
            if (!name) continue;
            tagCount.set(name, (tagCount.get(name) ?? 0) + 1);
          }
        }
      }
      const totalInWindow = scored.length;
      const avgRelevance = totalInWindow > 0 ? sumScore / totalInWindow : 0;
      const heatIndex = this.heatIndexFromSignals(
        newLast24h,
        count7d,
        avgRelevance,
        sourceIds.length,
        totalInWindow,
      );
      const lastActivityAt =
        scored.length > 0
          ? new Date(scored[0].doc.publishedAt as Date).toISOString()
          : null;
      const trendKeys = sevenDayTrendDateKeys(new Date(nowMs), viewerTz);
      const trendMap = new Map<string, number>();
      for (const k of trendKeys) trendMap.set(k, 0);
      for (const s of scored) {
        const key = dateKeyInTimeZone(
          new Date(s.doc.publishedAt as Date),
          viewerTz,
        );
        if (trendMap.has(key)) trendMap.set(key, (trendMap.get(key) ?? 0) + 1);
      }
      const trend = trendKeys.map((date) => ({
        date,
        count: trendMap.get(date) ?? 0,
      }));
      const chartKeywords = [...tagCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 16)
        .map(([name, count]) => ({ name, count }));
      const latestItems = scored.slice(0, 5).map((s) => ({
        ...serializeFeedItem(s.doc),
        relevanceScore: Math.round(s.score * 1000) / 1000,
      }));
      const computedAt = new Date();
      await this.snapshotModel
        .updateOne(
          { monitorId: monitor._id, recentHours },
          {
            $set: {
              userId,
              status: "ready",
              computedAt,
              fingerprint: `${monitorId}:${recentHours}:${computedAt.getTime()}`,
              metrics: { heatIndex, newLast24h, totalInWindow, lastActivityAt, trend },
              chartKeywords,
              latestItems,
              errorMessage: "",
            },
          },
          { upsert: true },
        )
        .exec();
      await this.monitorModel
        .updateOne(
          { _id: monitor._id },
          { $set: { snapshotStatus: "ready", snapshotComputedAt: computedAt } },
        )
        .exec();
      this.logger.debug(
        `event=snapshot_ready monitorId=${monitorId} recentHours=${recentHours} durationMs=${Date.now() - t0} latestItems=${latestItems.length} heatIndex=${heatIndex ?? "null"}`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(
        `event=snapshot_failed monitorId=${monitorId} recentHours=${recentHours} durationMs=${Date.now() - t0} err=${msg}`,
        e instanceof Error ? e.stack : undefined,
      );
      await this.snapshotModel
        .updateOne(
          { monitorId: monitor._id, recentHours },
          { $set: { status: "failed", errorMessage: msg.slice(0, 2000) } },
          { upsert: true },
        )
        .exec();
      await this.monitorModel
        .updateOne({ _id: monitor._id }, { $set: { snapshotStatus: "failed" } })
        .exec();
    }
  }
}
