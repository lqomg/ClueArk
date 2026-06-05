import { BadRequestException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

/** 与 API 默认、定时任务首期一致 */
export const DEFAULT_BRIEF_PROFILE_ID = 'weekly_rolling';

export type WindowMode = 'rolling_hours' | 'calendar_range';

export type BriefProfile = {
  profileId: string;
  enabled: boolean;
  windowMode: WindowMode;
  rollingRecentHours?: number;
  calendarUnit?: 'day' | 'week' | 'month';
  timezone?: string;
};

export type ResolvedWindow = {
  periodStart: Date;
  periodEnd: Date;
  periodKey: string;
  windowLabel: string;
  rollingRecentHoursEffective: number;
};

export function resolveBriefProfiles(config: ConfigService): BriefProfile[] {
  const raw = config.get<string>('MONITOR_BRIEF_WEEKLY_ROLLING_HOURS');
  const h =
    Number.isFinite(Number(raw)) && Number(raw) >= 1 && Number(raw) <= 2160 ? Math.floor(Number(raw)) : null;
  return [
    {
      profileId: DEFAULT_BRIEF_PROFILE_ID,
      enabled: true,
      windowMode: 'rolling_hours',
      rollingRecentHours: h ?? 168,
    },
  ];
}

export function getBriefProfileById(profiles: BriefProfile[], profileId: string): BriefProfile {
  const p = profiles.find((x) => x.profileId === profileId && x.enabled);
  if (!p) {
    throw new BadRequestException('monitor_brief_profile_unknown');
  }
  return p;
}

/**
 * 解析报告时间窗。首期仅 rolling_hours；calendar_range 显式拒绝。
 */
export function resolveWindow(profile: BriefProfile, nowMs: number, defaultRecentHours: number): ResolvedWindow {
  if (profile.windowMode === 'calendar_range') {
    throw new BadRequestException('monitor_brief_calendar_not_implemented');
  }
  const h = profile.rollingRecentHours ?? defaultRecentHours;
  const periodEnd = new Date(nowMs);
  const periodStart = new Date(nowMs - h * 3600000);
  const days = Math.max(1, Math.round(h / 24));
  return {
    periodStart,
    periodEnd,
    periodKey: `rolling:${profile.profileId}:${h}h`,
    windowLabel: `近 ${h} 小时滚动窗（约 ${days} 天）`,
    rollingRecentHoursEffective: h,
  };
}
