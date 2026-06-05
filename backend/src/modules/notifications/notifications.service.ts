import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { I18nService } from 'nestjs-i18n';
import { FeedItem, FeedItemDocument } from '../feed-items/schemas/feed-item.schema';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { REDIS_CHANNEL_NOTIFICATION } from './notifications.constants';
import {
  feedContextFromDoc,
  feedContextWithLlm,
  toNotificationListItemDto,
} from './notification-list.presenter';
import { JobQueueAdapter } from '../job-center/job-queue.adapter';
import { LoggerService } from '../logger';
import { FeedItemLlmService } from '../feed-items/feed-item-llm.service';
import { UserPreferencesService } from '../users/user-preferences.service';
import { resolveAppDefaultLocale, type SupportedLocale } from '../../common/utils/locale.utils';

export type CreateNotificationParams = {
  userId: string;
  monitorId: string;
  feedItemId: string;
  /** 事件簇 id（pipeline 增量聚簇后）；通知 dedupe 按 monitorId:clusterId */
  clusterId: string;
  score: number;
  title: string;
  link: string;
  monitorTitle: string;
};

@Injectable()
export class NotificationsService {
  private readonly logger: LoggerService;
  private lastNotifyByMonitor = new Map<string, number>();

  constructor(
    @InjectModel(Notification.name) private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(FeedItem.name) private readonly feedItemModel: Model<FeedItemDocument>,
    private readonly config: ConfigService,
    private readonly jobQueue: JobQueueAdapter,
    private readonly feedItemLlmService: FeedItemLlmService,
    private readonly userPreferences: UserPreferencesService,
    private readonly i18n: I18nService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createLogger(NotificationsService.name);
  }

  private cooldownDisabled(): boolean {
    const v = this.config.get<string>('NOTIFICATION_COOLDOWN_DISABLED')?.trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
  }

  private cooldownMs(): number {
    const raw = Number(this.config.get('NOTIFICATION_COOLDOWN_SEC'));
    return (Number.isFinite(raw) && raw >= 0 ? raw : 300) * 1000;
  }

  async createFromMatch(params: CreateNotificationParams): Promise<NotificationDocument | null> {
    const clusterId = params.clusterId?.trim();
    if (!clusterId || !Types.ObjectId.isValid(clusterId)) {
      this.logger.warn(
        `event=notification_skip reason=invalid_clusterId monitorId=${params.monitorId} feedItemId=${params.feedItemId}`,
      );
      return null;
    }

    const dedupeKey = `${params.monitorId}:${clusterId}`;
    const existing = await this.notificationModel.findOne({ dedupeKey }).lean().exec();
    if (existing) {
      this.logger.debug(
        `event=notification_skip reason=same_cluster monitorId=${params.monitorId} clusterId=${clusterId} feedItemId=${params.feedItemId}`,
      );
      return null;
    }

    const now = Date.now();
    if (!this.cooldownDisabled()) {
      const last = this.lastNotifyByMonitor.get(params.monitorId) ?? 0;
      if (now - last < this.cooldownMs()) {
        this.logger.debug(
          `event=notification_skip reason=cooldown monitorId=${params.monitorId} clusterId=${clusterId}`,
        );
        return null;
      }
    }

    try {
      const doc = await this.notificationModel.create({
        userId: new Types.ObjectId(params.userId),
        monitorId: new Types.ObjectId(params.monitorId),
        feedItemId: new Types.ObjectId(params.feedItemId),
        clusterId: new Types.ObjectId(clusterId),
        dedupeKey,
        score: params.score,
        title: params.title.slice(0, 500),
        link: params.link.slice(0, 2048),
        monitorTitle: params.monitorTitle.slice(0, 200),
        readAt: null,
      });
      this.lastNotifyByMonitor.set(params.monitorId, now);
      const notificationId = String(doc._id);
      this.logger.debug(
        `event=notification_created notificationId=${notificationId} userId=${params.userId} monitorId=${params.monitorId} clusterId=${clusterId} feedItemId=${params.feedItemId} score=${params.score} title=${params.title.slice(0, 80)}`,
      );
      await this.publishEvent(notificationId, params.userId);
      return doc;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('duplicate key')) {
        this.logger.debug(
          `event=notification_skip reason=duplicate_key monitorId=${params.monitorId} clusterId=${clusterId}`,
        );
        return null;
      }
      throw e;
    }
  }

  private async publishEvent(notificationId: string, userId: string): Promise<void> {
    const conn = this.jobQueue.getConnection();
    if (!conn) {
      this.logger.debug(
        `event=notification_pub_skip notificationId=${notificationId} reason=no_redis_connection`,
      );
      return;
    }
    try {
      await conn.publish(REDIS_CHANNEL_NOTIFICATION, JSON.stringify({ notificationId, userId }));
      this.logger.debug(
        `event=notification_published notificationId=${notificationId} userId=${userId}`,
      );
    } catch (e) {
      this.logger.warn(
        `event=notification_pub_failed notificationId=${notificationId} err=${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private async loadFeedContextByIds(
    feedItemIds: Types.ObjectId[],
    viewerLocale: string,
  ): Promise<Map<string, ReturnType<typeof feedContextFromDoc>>> {
    const map = new Map<string, ReturnType<typeof feedContextFromDoc>>();
    if (!feedItemIds.length) return map;
    const fallback = resolveAppDefaultLocale(this.config.get<string>('APP_DEFAULT_LOCALE'));
    const locale = viewerLocale as SupportedLocale;
    const llmViews = await this.feedItemLlmService.resolveViews(
      feedItemIds.map(String),
      locale,
      fallback,
    );
    const rows = await this.feedItemModel
      .find({ _id: { $in: feedItemIds } })
      .select({ summary: 1, sourceId: 1 })
      .populate({ path: 'sourceId', select: 'displayName' })
      .lean()
      .exec();
    for (const row of rows) {
      const id = String(row._id);
      const base = feedContextFromDoc(row as unknown as Record<string, unknown>);
      const llmView = llmViews.get(id);
      map.set(id, llmView ? feedContextWithLlm(base, llmView) : base);
    }
    return map;
  }

  async countUnread(userId: string): Promise<number> {
    const uid = new Types.ObjectId(userId);
    return this.notificationModel.countDocuments({ userId: uid, readAt: null }).exec();
  }

  async listForUser(userId: string, page: number, pageSize: number) {
    const uid = new Types.ObjectId(userId);
    const viewerLocale = await this.userPreferences.getLocaleOrDefault(userId);
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.notificationModel
        .find({ userId: uid })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean()
        .exec(),
      this.notificationModel.countDocuments({ userId: uid }).exec(),
    ]);

    const feedIds = items.map((n) => n.feedItemId).filter((id) => id != null) as Types.ObjectId[];
    const feedMap = await this.loadFeedContextByIds(feedIds, viewerLocale);
    const alertLabel = this.i18n.t('notification.match.alertLabel', {
      lang: viewerLocale,
      defaultValue: this.i18n.t('notification.match.alertLabel', { lang: 'en' }),
    });

    return {
      items: items.map((n) =>
        toNotificationListItemDto(n, feedMap.get(String(n.feedItemId)), alertLabel),
      ),
      total,
      page,
      pageSize,
    };
  }

  async markRead(userId: string, notificationId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(notificationId)) return false;
    const uid = new Types.ObjectId(userId);
    const nid = new Types.ObjectId(notificationId);
    const res = await this.notificationModel
      .updateOne({ _id: nid, userId: uid }, { $set: { readAt: new Date() } })
      .exec();
    return res.modifiedCount > 0 || res.matchedCount > 0;
  }

  async markAllRead(userId: string): Promise<number> {
    const uid = new Types.ObjectId(userId);
    const res = await this.notificationModel
      .updateMany({ userId: uid, readAt: null }, { $set: { readAt: new Date() } })
      .exec();
    return res.modifiedCount;
  }
}
