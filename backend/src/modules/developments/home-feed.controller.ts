import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators';
import type { JwtValidatedUser } from '../auth/strategies/jwt.strategy';
import { MonitorsService } from '../monitors/monitors.service';
import { UserPreferencesService } from '../users/user-preferences.service';
import type { SupportedLocale } from '../../common/utils/locale.utils';
import { DevelopmentsService, type DevelopmentListItem } from './developments.service';
import { DevelopmentsReadLocalizationService } from './developments-read-localization.service';
import { MonitorReadCursorService } from './monitor-read-cursor.service';
import {
  HOME_FEED_PAGE_LIMIT_DEFAULT,
  HOME_FEED_PAGE_LIMIT_MAX,
  HOME_FEED_RECENT_HOURS_DEFAULT,
  HOME_FEED_RECENT_HOURS_MAX,
  HomeFeedQueryDto,
  type HomeFeedTab,
} from './dto/home-feed.query.dto';
import { MorningBriefingQueryDto } from './dto/morning-briefing.query.dto';
import {
  MorningBriefingService,
  type MorningBriefingResponse,
} from './morning-briefing.service';

const RECENT_HOURS_MIN = 1;

export type HomeFeedItem = {
  id: string;
  monitorId: string;
  monitorTitle: string;
  topicCoverImageUrl: string | null;
  title: string;
  summary: string;
  whyItMatters: string;
  watchNext: string;
  structuredFact: Record<string, unknown> | null;
  type: DevelopmentListItem['type'];
  severity: DevelopmentListItem['severity'];
  occurredAt: string;
  timelineAt: string;
  lastMeaningfulAt: string | null;
  timePrecision: 'instant' | 'day';
  evidenceCount: number;
  sourceCount: number;
  unread: boolean;
  subscribed: boolean;
  primarySourceDisplayName: string;
  primarySourceAvatarUrl: string | null;
  primaryEvidence: {
    feedItemId: string;
    title: string;
    link: string;
  } | null;
  evidenceItemIds: string[];
  sourcePreviews: NonNullable<DevelopmentListItem['sourcePreviews']>;
};

export type HomeFeedResponse = {
  generatedAt: string;
  recentHours: number;
  tab: HomeFeedTab;
  items: HomeFeedItem[];
  unreadCount: number;
  readableMonitorCount: number;
  /** 开源暂不提供值守报备 */
  dutyReport: null;
  nextCursor: string | null;
  hasMore: boolean;
};

type FeedCursor = { activityAt: string; id: string };

function clampRecentHours(raw: number | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return HOME_FEED_RECENT_HOURS_DEFAULT;
  return Math.min(HOME_FEED_RECENT_HOURS_MAX, Math.max(RECENT_HOURS_MIN, Math.floor(n)));
}

function clampLimit(raw: number | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return HOME_FEED_PAGE_LIMIT_DEFAULT;
  return Math.min(HOME_FEED_PAGE_LIMIT_MAX, Math.max(1, Math.floor(n)));
}

/** 首页游标排序键：与专题时间线一致，取活动戳与主戳的较晚者 */
export function homeFeedActivityAtIso(item: {
  lastMeaningfulAt?: string | null;
  occurredAt?: string | null;
  timelineAt?: string | null;
}): string {
  const candidates = [item.lastMeaningfulAt, item.occurredAt, item.timelineAt]
    .map((s) => String(s ?? '').trim())
    .filter(Boolean)
    .map((s) => Date.parse(s))
    .filter((n) => Number.isFinite(n));
  if (!candidates.length) return new Date(0).toISOString();
  return new Date(Math.max(...candidates)).toISOString();
}

export function encodeHomeFeedCursor(activityAt: string, id: string): string {
  return Buffer.from(JSON.stringify({ t: activityAt, i: id }), 'utf8').toString('base64url');
}

export function decodeHomeFeedCursor(raw: string | undefined): FeedCursor | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  try {
    const parsed = JSON.parse(Buffer.from(s, 'base64url').toString('utf8')) as {
      t?: unknown;
      i?: unknown;
    };
    const activityAt = String(parsed.t ?? '').trim();
    const id = String(parsed.i ?? '').trim();
    if (!activityAt || !Types.ObjectId.isValid(id)) return null;
    const ms = Date.parse(activityAt);
    if (Number.isNaN(ms)) return null;
    return { activityAt: new Date(ms).toISOString(), id };
  } catch {
    return null;
  }
}

export function toHomeFeedItem(
  item: DevelopmentListItem,
  topic: { title: string; coverImageUrl: string | null },
  unread: boolean,
  subscribed: boolean,
): HomeFeedItem {
  const sourcePreviews = item.sourcePreviews ?? [];
  const evidenceItemIds = (item.evidenceItemIds ?? []).map((id) => String(id)).filter(Boolean);
  return {
    id: item.id,
    monitorId: item.monitorId,
    monitorTitle: topic.title,
    topicCoverImageUrl: topic.coverImageUrl,
    title: item.title,
    summary: item.summary,
    whyItMatters: item.whyItMatters ?? '',
    watchNext: item.watchNext ?? '',
    structuredFact: item.structuredFact ?? null,
    type: item.type,
    severity: item.severity,
    occurredAt: item.occurredAt,
    timelineAt: item.occurredAt || item.timelineAt,
    lastMeaningfulAt: item.lastMeaningfulAt,
    timePrecision: item.timePrecision === 'day' ? 'day' : 'instant',
    evidenceCount: evidenceItemIds.length,
    sourceCount: sourcePreviews.length,
    unread,
    subscribed,
    primarySourceDisplayName:
      String(item.primarySourceDisplayName ?? '').trim() ||
      sourcePreviews[0]?.displayName ||
      '',
    primarySourceAvatarUrl: item.primarySourceAvatarUrl ?? sourcePreviews[0]?.avatarUrl ?? null,
    primaryEvidence: item.primaryEvidence
      ? {
          feedItemId: item.primaryEvidence.feedItemId,
          title: item.primaryEvidence.title,
          link: item.primaryEvidence.link,
        }
      : null,
    evidenceItemIds,
    sourcePreviews: sourcePreviews.slice(0, 3),
  };
}

@Controller('users/me')
@UseGuards(JwtAuthGuard)
export class HomeFeedController {
  private readonly logger = new Logger(HomeFeedController.name);

  constructor(
    private readonly developments: DevelopmentsService,
    private readonly localization: DevelopmentsReadLocalizationService,
    private readonly userPreferences: UserPreferencesService,
    private readonly monitors: MonitorsService,
    private readonly readCursors: MonitorReadCursorService,
    private readonly morningBriefingService: MorningBriefingService,
  ) {}

  /** 首页早报：用户当地日历日跨专题巡视面（非 home-feed 分页流） */
  @Get('morning-briefing')
  async morningBriefing(
    @CurrentUser() user: JwtValidatedUser,
    @Query() _query: MorningBriefingQueryDto,
  ): Promise<MorningBriefingResponse> {
    const [locale, timeZone] = await Promise.all([
      this.userPreferences.getLocaleOrDefault(user.userId),
      this.userPreferences.getTimeZoneOrDefault(user.userId),
    ]);
    return this.morningBriefingService.buildForUser({
      userId: user.userId,
      locale,
      timeZone,
    });
  }

  @Get('home-feed')
  async homeFeed(
    @CurrentUser() user: JwtValidatedUser,
    @Query() query: HomeFeedQueryDto,
  ): Promise<HomeFeedResponse> {
    const userId = user.userId;
    const recentHours = clampRecentHours(query.recentHours);
    const limit = clampLimit(query.limit);
    const tab: HomeFeedTab = query.tab === 'recommended' ? 'recommended' : 'subscribed';
    const cursorRaw = String(query.cursor ?? '').trim();
    const cursor = cursorRaw ? decodeHomeFeedCursor(cursorRaw) : null;
    if (cursorRaw && !cursor) {
      throw new BadRequestException('invalid_home_feed_cursor');
    }
    const generatedAt = new Date().toISOString();
    const locale = await this.userPreferences.getLocaleOrDefault(userId);

    // 开源精选暂空：无官方专题池
    if (tab === 'recommended') {
      const readableMonitors = await this.monitors.listReadableMetaForUser(userId);
      return {
        generatedAt,
        recentHours,
        tab: 'recommended',
        items: [],
        unreadCount: 0,
        readableMonitorCount: readableMonitors.length,
        dutyReport: null,
        nextCursor: null,
        hasMore: false,
      };
    }

    return this.buildSubscribedFeed({
      userId,
      locale,
      recentHours,
      limit,
      cursor,
      generatedAt,
    });
  }

  private async buildSubscribedFeed(opts: {
    userId: string;
    locale: SupportedLocale;
    recentHours: number;
    limit: number;
    cursor: FeedCursor | null;
    generatedAt: string;
  }): Promise<HomeFeedResponse> {
    const { userId, locale, recentHours, limit, cursor, generatedAt } = opts;
    const readableMonitors = await this.monitors.listReadableMetaForUser(userId);
    const readableMonitorCount = readableMonitors.length;
    const topicById = new Map(
      readableMonitors.map((m) => [m.id, { title: m.title, coverImageUrl: m.coverImageUrl }]),
    );
    const monitorIds = [...topicById.keys()];
    if (!monitorIds.length) {
      return {
        generatedAt,
        recentHours,
        tab: 'subscribed',
        items: [],
        unreadCount: 0,
        readableMonitorCount,
        dutyReport: null,
        nextCursor: null,
        hasMore: false,
      };
    }

    const cursors = await this.readCursors.getCursorsForUser(userId, monitorIds);
    const tFeed = Date.now();
    const raw = await this.developments.listForUserHomeFeed(monitorIds, recentHours, {
      limit,
      cursorActivityAt: cursor ? new Date(cursor.activityAt) : undefined,
      cursorId: cursor?.id,
    });
    const feedMs = Date.now() - tFeed;
    const hasMore = raw.length > limit;
    const pageRaw = hasMore ? raw.slice(0, limit) : raw;
    const localized = await this.localization.localizeDevelopments(pageRaw, locale);

    const items = localized.flatMap((item) => {
      const topic = topicById.get(item.monitorId);
      if (!topic) return [];
      const readCursor = cursors.get(item.monitorId);
      const anchor = readCursor?.lastHomeVisitAt ?? readCursor?.lastReadAt ?? null;
      const occurredMs = Date.parse(item.occurredAt || item.timelineAt || '');
      const activityMs = Date.parse(item.lastMeaningfulAt || '');
      const unreadMs = Math.max(
        Number.isNaN(occurredMs) ? 0 : occurredMs,
        Number.isNaN(activityMs) ? 0 : activityMs,
      );
      const unread = !anchor || unreadMs > anchor.getTime();
      return [toHomeFeedItem(item, topic, unread, true)];
    });
    const unreadCount = items.filter((i) => i.unread).length;
    const last = items[items.length - 1];
    const nextCursor =
      hasMore && last ? encodeHomeFeedCursor(homeFeedActivityAtIso(last), last.id) : null;

    // 仅首屏记录巡视，避免翻页不断刷新未读锚点
    if (!cursor) {
      void this.readCursors.markHomeVisit(userId, monitorIds).catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`home_feed_mark_visit_fail userId=${userId} err=${msg.slice(0, 120)}`);
      });
    }

    this.logger.debug(
      `home_feed tab=subscribed userId=${userId} recentHours=${recentHours} limit=${limit} feedMs=${feedMs} monitors=${monitorIds.length} items=${items.length} hasMore=${hasMore}`,
    );
    return {
      generatedAt,
      recentHours,
      tab: 'subscribed',
      items,
      unreadCount,
      readableMonitorCount,
      dutyReport: null,
      nextCursor,
      hasMore,
    };
  }
}
