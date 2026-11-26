import { Injectable, Logger } from '@nestjs/common';
import type { SupportedLocale } from '../../common/utils/locale.utils';
import {
  FALLBACK_APP_TIME_ZONE,
  isValidIanaTimeZone,
  startOfLocalDayUtc,
} from '../../common/utils/timezone.utils';
import { MonitorsService } from '../monitors/monitors.service';
import { DevelopmentsService, type DevelopmentListItem } from './developments.service';
import { DevelopmentsReadLocalizationService } from './developments-read-localization.service';
import { DevelopmentsLocalizeJobService } from './developments-localize-job.service';
import type { DevelopmentSeverity } from './schemas/monitor-development.schema';

const COLOR_PALETTE_SIZE = 3;
const MAX_DEVELOPMENTS_PER_TOPIC = 5;
const SEVERITY_RANK: Record<DevelopmentSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export type MorningBriefingBadge = 'important' | 'high' | null;

export type MorningBriefingPulse = {
  developmentId: string;
  monitorId: string;
  timelineAt: string;
  severity: DevelopmentSeverity;
  colorIndex: number;
};

export type MorningBriefingDevelopment = {
  id: string;
  title: string;
  summary: string;
  timelineAt: string;
  evidenceCount: number;
  severity: DevelopmentSeverity;
};

export type MorningBriefingTopic = {
  monitorId: string;
  title: string;
  colorIndex: number;
  statusLine: string;
  badge: MorningBriefingBadge;
  developmentCount: number;
  developments: MorningBriefingDevelopment[];
};

export type MorningBriefingQuietTopic = {
  monitorId: string;
  title: string;
};

export type MorningBriefingStats = {
  pulseCount: number;
  activeMonitorCount: number;
  quietMonitorCount: number;
  importantCount: number;
  highCount: number;
};

export type MorningBriefingResponse = {
  generatedAt: string;
  /** 用户当地日 00:00 → 现在 已流逝小时数（向上取整，至少 1）；兼容旧客户端 */
  recentHours: number;
  /** 固定为当地日历日窗口 */
  windowKind: 'local_day';
  timeZone: string;
  /** 当地日 00:00 的 UTC ISO */
  windowStart: string;
  overview: string;
  stats: MorningBriefingStats;
  pulses: MorningBriefingPulse[];
  topics: MorningBriefingTopic[];
  quietTopics: MorningBriefingQuietTopic[];
  readableMonitorCount: number;
};

export function normalizeBriefingTimeZone(raw: string | null | undefined): string {
  const tz = String(raw ?? '').trim();
  return tz && isValidIanaTimeZone(tz) ? tz : FALLBACK_APP_TIME_ZONE;
}

/** 稳定色板下标（0..COLOR_PALETTE_SIZE-1） */
export function colorIndexForMonitorId(monitorId: string): number {
  const s = String(monitorId ?? '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h % COLOR_PALETTE_SIZE;
}

export function badgeForSeverity(
  severity: DevelopmentSeverity | null | undefined,
): MorningBriefingBadge {
  if (severity === 'critical') return 'important';
  if (severity === 'high') return 'high';
  return null;
}

export function maxSeverityOf(
  items: Array<{ severity: DevelopmentSeverity }>,
): DevelopmentSeverity | null {
  if (!items.length) return null;
  let best: DevelopmentSeverity = items[0].severity;
  for (const it of items) {
    if ((SEVERITY_RANK[it.severity] ?? 0) > (SEVERITY_RANK[best] ?? 0)) {
      best = it.severity;
    }
  }
  return best;
}

function pickStatusDevelopment(items: DevelopmentListItem[]): DevelopmentListItem | null {
  if (!items.length) return null;
  return [...items].sort((a, b) => {
    const sr = (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0);
    if (sr !== 0) return sr;
    return Date.parse(b.timelineAt) - Date.parse(a.timelineAt);
  })[0];
}

function elapsedHoursSince(windowStart: Date, now: Date): number {
  const ms = Math.max(0, now.getTime() - windowStart.getTime());
  return Math.max(1, Math.ceil(ms / 3600_000));
}

function buildOverview(opts: {
  locale: SupportedLocale;
  pulseCount: number;
  readableCount: number;
}): string {
  const { locale, pulseCount, readableCount } = opts;

  if (readableCount === 0) {
    if (locale === 'zh-CN') return '还没有专题。到「我的专题」创建一个吧。';
    if (locale === 'ja') return 'まだトピックがありません。「マイトピック」から作成してください。';
    if (locale === 'ko') return '아직 주제가 없습니다. 「내 주제」에서 만들어 보세요.';
    return 'No topics yet. Create one from My Topics.';
  }

  if (pulseCount === 0) {
    if (locale === 'zh-CN') {
      return `今日 ${readableCount} 个专题均在值守，暂无新进展。`;
    }
    if (locale === 'ja') {
      return `本日、${readableCount} 件のトピックに新しい進展はありません。`;
    }
    if (locale === 'ko') {
      return `오늘 ${readableCount}개 주제에 새 진전이 없습니다.`;
    }
    return `No new developments today across ${readableCount} topics.`;
  }

  // 有动静时不拼统计总览句：主读物是轴与专题列表。
  return '';
}

@Injectable()
export class MorningBriefingService {
  private readonly logger = new Logger(MorningBriefingService.name);

  constructor(
    private readonly developments: DevelopmentsService,
    private readonly localization: DevelopmentsReadLocalizationService,
    private readonly localizeJob: DevelopmentsLocalizeJobService,
    private readonly monitors: MonitorsService,
  ) {}

  async buildForUser(opts: {
    userId: string;
    locale: SupportedLocale;
    timeZone: string;
  }): Promise<MorningBriefingResponse> {
    const now = new Date();
    const generatedAt = now.toISOString();
    const timeZone = normalizeBriefingTimeZone(opts.timeZone);
    const windowStartDate = startOfLocalDayUtc(now, timeZone);
    const windowStart = windowStartDate.toISOString();
    const recentHours = elapsedHoursSince(windowStartDate, now);

    const empty = (readableMonitorCount: number): MorningBriefingResponse => ({
      generatedAt,
      recentHours,
      windowKind: 'local_day',
      timeZone,
      windowStart,
      overview: buildOverview({
        locale: opts.locale,
        pulseCount: 0,
        readableCount: readableMonitorCount,
      }),
      stats: {
        pulseCount: 0,
        activeMonitorCount: 0,
        quietMonitorCount: readableMonitorCount,
        importantCount: 0,
        highCount: 0,
      },
      pulses: [],
      topics: [],
      quietTopics: [],
      readableMonitorCount,
    });

    const readable = await this.monitors.listReadableMetaForUser(opts.userId);
    const readableMonitorCount = readable.length;
    if (!readable.length) {
      return empty(0);
    }

    const topicById = new Map(readable.map((m) => [m.id, m]));
    const monitorIds = readable.map((m) => m.id);
    const t0 = Date.now();
    const raw = await this.developments.listForMorningBriefing(monitorIds, windowStartDate);
    const localized = await this.localization.localizeDevelopments(raw, opts.locale);
    void this.localizeJob.enqueueMissingForViewer(localized, opts.locale).catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `morning_briefing_localize_enqueue_fail userId=${opts.userId} err=${msg.slice(0, 120)}`,
      );
    });

    const byMonitor = new Map<string, DevelopmentListItem[]>();
    for (const item of localized) {
      if (!topicById.has(item.monitorId)) continue;
      const list = byMonitor.get(item.monitorId) ?? [];
      list.push(item);
      byMonitor.set(item.monitorId, list);
    }

    const activeIds: string[] = [];
    const quietTopics: MorningBriefingQuietTopic[] = [];
    for (const m of readable) {
      const list = byMonitor.get(m.id);
      if (list?.length) activeIds.push(m.id);
      else quietTopics.push({ monitorId: m.id, title: m.title });
    }

    const topics: MorningBriefingTopic[] = activeIds.map((monitorId) => {
      const meta = topicById.get(monitorId)!;
      const list = byMonitor.get(monitorId) ?? [];
      const sorted = [...list].sort(
        (a, b) => Date.parse(b.timelineAt) - Date.parse(a.timelineAt),
      );
      const statusDev = pickStatusDevelopment(sorted);
      const topSev = maxSeverityOf(sorted);
      const colorIndex = colorIndexForMonitorId(monitorId);
      return {
        monitorId,
        title: meta.title,
        colorIndex,
        statusLine: statusDev?.title?.trim() || meta.title,
        badge: badgeForSeverity(topSev),
        developmentCount: sorted.length,
        developments: sorted.slice(0, MAX_DEVELOPMENTS_PER_TOPIC).map((d) => ({
          id: d.id,
          title: d.title,
          summary: d.summary,
          timelineAt: d.timelineAt,
          evidenceCount: Array.isArray(d.evidenceItemIds) ? d.evidenceItemIds.length : 0,
          severity: d.severity,
        })),
      };
    });

    topics.sort((a, b) => {
      const aRank = a.badge === 'important' ? 2 : a.badge === 'high' ? 1 : 0;
      const bRank = b.badge === 'important' ? 2 : b.badge === 'high' ? 1 : 0;
      if (bRank !== aRank) return bRank - aRank;
      const aAt = Date.parse(a.developments[0]?.timelineAt ?? '') || 0;
      const bAt = Date.parse(b.developments[0]?.timelineAt ?? '') || 0;
      return bAt - aAt;
    });

    const pulses: MorningBriefingPulse[] = localized
      .filter((d) => topicById.has(d.monitorId))
      .map((d) => ({
        developmentId: d.id,
        monitorId: d.monitorId,
        timelineAt: d.timelineAt,
        severity: d.severity,
        colorIndex: colorIndexForMonitorId(d.monitorId),
      }))
      .sort((a, b) => Date.parse(a.timelineAt) - Date.parse(b.timelineAt));

    let importantCount = 0;
    let highCount = 0;
    for (const d of localized) {
      if (!topicById.has(d.monitorId)) continue;
      if (d.severity === 'critical') importantCount += 1;
      else if (d.severity === 'high') highCount += 1;
    }

    const pulseCount = pulses.length;
    const activeMonitorCount = topics.length;
    const quietMonitorCount = quietTopics.length;
    const overview = buildOverview({
      locale: opts.locale,
      pulseCount,
      readableCount: readableMonitorCount,
    });

    this.logger.debug(
      `morning_briefing userId=${opts.userId} tz=${timeZone} windowStart=${windowStart} ms=${Date.now() - t0} monitors=${readableMonitorCount} pulses=${pulseCount} active=${activeMonitorCount}`,
    );

    return {
      generatedAt,
      recentHours,
      windowKind: 'local_day',
      timeZone,
      windowStart,
      overview,
      stats: {
        pulseCount,
        activeMonitorCount,
        quietMonitorCount,
        importantCount,
        highCount,
      },
      pulses,
      topics,
      quietTopics,
      readableMonitorCount,
    };
  }
}
