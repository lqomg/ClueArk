import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const FALLBACK_USER_TIMEZONE = 'Asia/Shanghai';

/** 常用 IANA 时区（个人中心下拉）；亦可手动输入其它合法 IANA 标识 */
export const COMMON_IANA_TIME_ZONES = [
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Taipei',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Singapore',
  'UTC',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Australia/Sydney',
] as const;

export function normalizeUserTimeZone(tz: string | null | undefined): string {
  const s = typeof tz === 'string' ? tz.trim() : '';
  if (!s) return FALLBACK_USER_TIMEZONE;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: s });
    const probe = dayjs('2020-01-01T12:00:00Z').tz(s);
    if (!probe.isValid()) return FALLBACK_USER_TIMEZONE;
    return s;
  } catch {
    return FALLBACK_USER_TIMEZONE;
  }
}

const WEEKDAY_CN = ['日', '一', '二', '三', '四', '五', '六'] as const;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** 相对「现在」的简短文案（基于 UTC 瞬时差，与时区无关） */
export function relTimeIso(iso: string | null): string {
  if (!iso) return '—';
  const t = dayjs(iso).valueOf();
  if (Number.isNaN(t)) return '—';
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  return `${d} 天前`;
}

/**
 * 最新关键线索等：在用户日历下区分今天 / 昨天 / 周内星期几，否则短绝对时间。
 */
export function formatClueMetaTime(iso: string, timeZone: string): string {
  const event = dayjs(iso).tz(timeZone);
  if (!event.isValid()) return '—';
  const now = dayjs().tz(timeZone);
  const hm = event.format('HH:mm');
  const eventDay = event.format('YYYY-MM-DD');
  const todayDay = now.format('YYYY-MM-DD');
  const yestDay = now.subtract(1, 'day').format('YYYY-MM-DD');

  if (event.valueOf() > now.valueOf() + 60_000) {
    return `${event.year()}/${event.month() + 1}/${event.date()} ${hm}`;
  }
  if (eventDay === todayDay) return `今天 ${hm}`;
  if (eventDay === yestDay) return `昨天 ${hm}`;

  const msAgo = now.valueOf() - event.valueOf();
  if (msAgo >= 0 && msAgo < SEVEN_DAYS_MS) {
    return `周${WEEKDAY_CN[event.day()]} ${hm}`;
  }

  const y = event.year();
  const mo = event.month() + 1;
  const day = event.date();
  if (y === now.year()) return `${mo}/${day} ${hm}`;
  return `${y}/${mo}/${day} ${hm}`;
}

/** 卡片顶行：短绝对时间（用户时区） */
export function feedCardAbsoluteShort(iso: string, timeZone: string): string {
  return dayjs(iso).tz(timeZone).format('M/D HH:mm');
}

export function formatFeedCardHeaderRelative(
  iso: string,
  timeZone: string,
): { display: string; absolute: string } {
  const raw = iso;
  if (!raw) return { display: '时间未知', absolute: '' };
  const d = dayjs(raw);
  const t = d.valueOf();
  if (Number.isNaN(t)) return { display: '时间未知', absolute: '' };

  const absolute = feedCardAbsoluteShort(raw, timeZone);
  const diff = Date.now() - t;
  if (diff < 0) return { display: absolute, absolute };

  if (diff < 60_000) return { display: '刚刚', absolute };

  if (diff < 3600_000) {
    const min = Math.floor(diff / 60_000);
    if (min >= 45) return { display: '最近1小时内', absolute };
    return { display: `${min}分钟前`, absolute };
  }

  if (diff < 86_400_000) {
    const hr = Math.floor(diff / 3600_000);
    return { display: `${hr}小时前`, absolute };
  }

  const day = Math.floor(diff / 86_400_000);
  if (day < 7) return { display: `${day}天前`, absolute };

  return { display: absolute, absolute };
}

export function formatClusterTimeHint(earliestIso: string | null | undefined): string {
  if (!earliestIso) return '';
  const t = dayjs(earliestIso).valueOf();
  if (Number.isNaN(t)) return '';
  const diffH = Math.floor((Date.now() - t) / 3600000);
  if (diffH < 1) return '最早 1 小时内';
  if (diffH < 48) return `最早 ${diffH} 小时前`;
  const d = Math.floor(diffH / 24);
  return `最早 ${d} 天前`;
}

export function formatTimelineStampParts(
  publishedAt: string,
  timeZone: string,
): { datePart: string; timePart: string } | null {
  if (!publishedAt) return null;
  const d = dayjs(publishedAt).tz(timeZone);
  if (!d.isValid()) return null;
  return { datePart: d.format('M/D'), timePart: d.format('HH:mm') };
}

/** 列表/管理页：短日期时间（用户时区） */
export function formatShortDateTime(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return '—';
  const d = dayjs(iso).tz(timeZone);
  if (!d.isValid()) return '—';
  return d.format('YYYY/MM/DD HH:mm');
}
