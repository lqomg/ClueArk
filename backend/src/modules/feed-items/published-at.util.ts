import { type TimePrecision } from './time-precision';

type NormalizePublishedAtOptions = {
  now?: Date;
};

export type PublishedAtWithPrecision = {
  date: Date;
  precision: TimePrecision;
};

/** 日历日键 → UTC 午夜瞬时（禁止用宿主本地零点冒充） */
export function utcMidnightFromYmd(year: number, month1: number, day: number): Date | null {
  if (!Number.isFinite(year) || !Number.isFinite(month1) || !Number.isFinite(day)) return null;
  if (year < 1970 || year > 2100) return null;
  if (month1 < 1 || month1 > 12) return null;
  if (day < 1 || day > 31) return null;
  const iso = `${String(year).padStart(4, '0')}-${String(month1).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00.000Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  if (d.toISOString().slice(0, 10) !== iso.slice(0, 10)) return null;
  return d;
}

/** 仅容忍采集端与信源之间的轻微时钟偏差；超过则视为「未来发布时间」，改用抓取时刻 */
const DEFAULT_FUTURE_GRACE_MS = 120_000;
const REL_RE = /^(\d{1,6})\s*(秒|分钟|分|小时|时|天|日|周|月|年)\s*(前|内)$/;
const TODAY_YESTERDAY_RE = /^(今天|昨日|昨天|前天)\s*(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?$/;
const CH_MD_RE =
  /^(\d{4})?\s*[年/\-.]?\s*(\d{1,2})\s*[月/\-.]\s*(\d{1,2})\s*(?:日|号)?\s*(\d{1,2})?(?::(\d{1,2}))?(?::(\d{1,2}))?$/;
const DIGITS_RE = /^\d{9,16}$/;
const EN_REL_RE =
  /^(\d{1,6})\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|wk|wks|week|weeks|mo|mon|month|months|y|yr|yrs|year|years)\s*(ago|within)$/i;
const EN_JUST_NOW_RE = /^(just\s*now|right\s*now|now)$/i;
const EN_YESTERDAY_RE = /^(yesterday|today)\s+(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?\s*(am|pm)?$/i;
const EN_MD_Y_RE =
  /^([A-Za-z]{3,9})\s+(\d{1,2}),?\s*(\d{4})\s*(\d{1,2})?(?::(\d{1,2}))?(?::(\d{1,2}))?\s*(am|pm)?$/i;

function safeDateFromMs(ms: number): Date | null {
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseTimestampLike(n: number): Date | null {
  // 10 位秒级 / 13 位毫秒级；再小的数字多半不是时间戳
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n >= 1e12) return safeDateFromMs(n);
  if (n >= 1e9) return safeDateFromMs(n * 1000);
  return safeDateFromMs(n);
}

function unitToMs(unit: string): number {
  if (unit === '秒') return 1000;
  if (unit === '分钟' || unit === '分') return 60_000;
  if (unit === '小时' || unit === '时') return 3_600_000;
  if (unit === '天' || unit === '日') return 86_400_000;
  if (unit === '周') return 604_800_000;
  // 月/年：按近似值（用于相对时间展示，精确到分钟够用）
  if (unit === '月') return 2_592_000_000; // 30d
  if (unit === '年') return 31_536_000_000; // 365d
  return 0;
}

function enUnitToMs(unitRaw: string): number {
  const u = unitRaw.toLowerCase();
  if (u === 's' || u === 'sec' || u === 'secs' || u === 'second' || u === 'seconds') return 1000;
  if (u === 'm' || u === 'min' || u === 'mins' || u === 'minute' || u === 'minutes') return 60_000;
  if (u === 'h' || u === 'hr' || u === 'hrs' || u === 'hour' || u === 'hours') return 3_600_000;
  if (u === 'd' || u === 'day' || u === 'days') return 86_400_000;
  if (u === 'w' || u === 'wk' || u === 'wks' || u === 'week' || u === 'weeks') return 604_800_000;
  if (u === 'mo' || u === 'mon' || u === 'month' || u === 'months') return 2_592_000_000;
  if (u === 'y' || u === 'yr' || u === 'yrs' || u === 'year' || u === 'years') return 31_536_000_000;
  return 0;
}

function monthNameToNumber(nameRaw: string): number {
  const s = nameRaw.trim().toLowerCase();
  const k = s.length >= 3 ? s.slice(0, 3) : s;
  if (k === 'jan') return 1;
  if (k === 'feb') return 2;
  if (k === 'mar') return 3;
  if (k === 'apr') return 4;
  if (k === 'may') return 5;
  if (k === 'jun') return 6;
  if (k === 'jul') return 7;
  if (k === 'aug') return 8;
  if (k === 'sep') return 9;
  if (k === 'oct') return 10;
  if (k === 'nov') return 11;
  if (k === 'dec') return 12;
  return 0;
}

function normalizeAmPm(hh: number, ampmRaw: string | undefined): number {
  if (!ampmRaw) return hh;
  const a = ampmRaw.toLowerCase();
  if (a !== 'am' && a !== 'pm') return hh;
  const h = hh % 12;
  return a === 'pm' ? h + 12 : h;
}

function buildLocalDate(year: number, month1: number, day: number, hh = 0, mm = 0, ss = 0): Date | null {
  if (!Number.isFinite(year) || !Number.isFinite(month1) || !Number.isFinite(day)) return null;
  if (year < 1970 || year > 2100) return null;
  if (month1 < 1 || month1 > 12) return null;
  if (day < 1 || day > 31) return null;
  if (hh < 0 || hh > 23) return null;
  if (mm < 0 || mm > 59) return null;
  if (ss < 0 || ss > 59) return null;
  const d = new Date(year, month1 - 1, day, hh, mm, ss, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * 解析发布时间并标注精度。
 * 仅有年月日（无时分秒）→ day + UTC 午夜；含钟点 / 相对时间 / 时间戳 → instant。
 */
export function normalizePublishedAtWithPrecision(
  raw: unknown,
  opts: NormalizePublishedAtOptions = {},
): PublishedAtWithPrecision | null {
  const now = opts.now ?? new Date();
  if (raw == null) return null;

  if (typeof raw === 'number') {
    const d = parseTimestampLike(raw);
    return d ? { date: d, precision: 'instant' } : null;
  }

  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : { date: raw, precision: 'instant' };
  }

  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  if (!t) return null;

  // 常见“刚刚/刚才/刚发布”
  if (t === '刚刚' || t === '刚才' || t === '刚发布') return { date: now, precision: 'instant' };
  if (EN_JUST_NOW_RE.test(t)) return { date: now, precision: 'instant' };

  // 纯数字：大概率是时间戳（秒/毫秒）
  if (DIGITS_RE.test(t)) {
    const n = Number(t);
    const d = parseTimestampLike(n);
    return d ? { date: d, precision: 'instant' } : null;
  }

  // 相对时间：1分钟前 / 10分钟内 / 2小时前
  const rel = t.match(REL_RE);
  if (rel) {
    const n = Number(rel[1]);
    const unit = rel[2];
    if (!Number.isFinite(n) || n < 0) return null;
    const msUnit = unitToMs(unit);
    if (!msUnit) return null;
    const d = safeDateFromMs(now.getTime() - n * msUnit);
    return d ? { date: d, precision: 'instant' } : null;
  }

  // English relative: 5m ago / 2 hours ago / 10 min within
  const enRel = t.match(EN_REL_RE);
  if (enRel) {
    const n = Number(enRel[1]);
    if (!Number.isFinite(n) || n < 0) return null;
    const msUnit = enUnitToMs(enRel[2]);
    if (!msUnit) return null;
    const d = safeDateFromMs(now.getTime() - n * msUnit);
    return d ? { date: d, precision: 'instant' } : null;
  }

  // 今天/昨天/前天 + HH:mm(:ss) — 必有小时
  const ty = t.match(TODAY_YESTERDAY_RE);
  if (ty) {
    const base = ty[1];
    const hh = Number(ty[2]);
    const mm = ty[3] ? Number(ty[3]) : 0;
    const ss = ty[4] ? Number(ty[4]) : 0;
    if (![hh, mm, ss].every((x) => Number.isFinite(x))) return null;
    const dayOffset = base === '今天' ? 0 : base === '昨日' || base === '昨天' ? -1 : -2;
    const d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, ss, 0);
    const d = safeDateFromMs(d0.getTime() + dayOffset * 86_400_000);
    return d ? { date: d, precision: 'instant' } : null;
  }

  // today/yesterday HH:mm(:ss) am/pm
  const enY = t.match(EN_YESTERDAY_RE);
  if (enY) {
    const base = enY[1].toLowerCase();
    let hh = Number(enY[2]);
    const mm = enY[3] ? Number(enY[3]) : 0;
    const ss = enY[4] ? Number(enY[4]) : 0;
    if (![hh, mm, ss].every((x) => Number.isFinite(x))) return null;
    hh = normalizeAmPm(hh, enY[5]);
    const dayOffset = base === 'today' ? 0 : -1;
    const d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, ss, 0);
    const d = safeDateFromMs(d0.getTime() + dayOffset * 86_400_000);
    return d ? { date: d, precision: 'instant' } : null;
  }

  // 中文/数字日期：YYYY-MM-DD HH:mm(:ss) 或 4月29日 12:30（默认当前年）
  const md = t.match(CH_MD_RE);
  if (md) {
    const year = md[1] ? Number(md[1]) : now.getFullYear();
    const month1 = Number(md[2]);
    const day = Number(md[3]);
    const hasClock = Boolean(md[4]);
    if (!hasClock) {
      const d = utcMidnightFromYmd(year, month1, day);
      return d ? { date: d, precision: 'day' } : null;
    }
    const hh = Number(md[4]);
    const mm = md[5] ? Number(md[5]) : 0;
    const ss = md[6] ? Number(md[6]) : 0;
    const d = buildLocalDate(year, month1, day, hh, mm, ss);
    return d ? { date: d, precision: 'instant' } : null;
  }

  // English month name: Apr 29, 2026 12:30 pm / April 29 2026
  const enMdY = t.match(EN_MD_Y_RE);
  if (enMdY) {
    const month1 = monthNameToNumber(enMdY[1]);
    const day = Number(enMdY[2]);
    const year = Number(enMdY[3]);
    const hasClock = Boolean(enMdY[4]);
    if (!month1) return null;
    if (![day, year].every((x) => Number.isFinite(x))) return null;
    if (!hasClock) {
      const d = utcMidnightFromYmd(year, month1, day);
      return d ? { date: d, precision: 'day' } : null;
    }
    let hh = Number(enMdY[4]);
    const mm = enMdY[5] ? Number(enMdY[5]) : 0;
    const ss = enMdY[6] ? Number(enMdY[6]) : 0;
    if (![hh, mm, ss].every((x) => Number.isFinite(x))) return null;
    hh = normalizeAmPm(hh, enMdY[7]);
    const d = buildLocalDate(year, month1, day, hh, mm, ss);
    return d ? { date: d, precision: 'instant' } : null;
  }

  // ISO 仅日期：2026-10-28
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const d = new Date(`${t}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== t) return null;
    return { date: d, precision: 'day' };
  }

  // 兜底：Date.parse（ISO/RFC/浏览器常见格式）
  // 若解析结果为 UTC 午夜且原文无时区钟点痕迹，仍标 instant（保守：有 T 或空格+时钟才 instant）
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  const looksDayOnlyIso =
    /^\d{4}-\d{2}-\d{2}(?:T00:00:00(?:\.0+)?(?:Z|[+-]00:00)?)?$/i.test(t) &&
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0;
  if (looksDayOnlyIso && !/[T\s]\d{1,2}:\d{2}/.test(t)) {
    return { date: d, precision: 'day' };
  }
  return { date: d, precision: 'instant' };
}

export function normalizePublishedAt(raw: unknown, opts: NormalizePublishedAtOptions = {}): Date | null {
  return normalizePublishedAtWithPrecision(raw, opts)?.date ?? null;
}

export function coalescePublishedAtWithPrecision(
  parsed: PublishedAtWithPrecision | null,
  fallback: Date,
): PublishedAtWithPrecision {
  if (parsed != null && !Number.isNaN(parsed.date.getTime())) return parsed;
  return { date: fallback, precision: 'instant' };
}

export function capFuturePublishedAtWithPrecision(
  parsed: PublishedAtWithPrecision | null,
  now: Date,
  graceMs = DEFAULT_FUTURE_GRACE_MS,
): PublishedAtWithPrecision | null {
  if (parsed == null || Number.isNaN(parsed.date.getTime())) return null;
  if (parsed.date.getTime() > maxAllowedPublishedAt(now, graceMs).getTime()) {
    return { date: now, precision: 'instant' };
  }
  return parsed;
}

/** 若 `publishedAt` 晚于 `now + graceMs`，则视为不可信的未来时间，回落为抓取时刻 `now` */
export function capFuturePublishedAt(
  publishedAt: Date | null,
  now: Date,
  graceMs = DEFAULT_FUTURE_GRACE_MS,
): Date | null {
  if (publishedAt == null || Number.isNaN(publishedAt.getTime())) return null;
  return publishedAt.getTime() > maxAllowedPublishedAt(now, graceMs).getTime() ? now : publishedAt;
}

export function maxAllowedPublishedAt(now: Date, graceMs = DEFAULT_FUTURE_GRACE_MS): Date {
  return new Date(now.getTime() + graceMs);
}

/** 无有效解析结果时使用 fallback（抓取时刻）。 */
export function coalescePublishedAtOrFallback(parsed: Date | null, fallback: Date): Date {
  if (parsed != null && !Number.isNaN(parsed.getTime())) return parsed;
  return fallback;
}

/**
 * Web list 条目发布时间：禁止用抓取时刻冒充。
 * - 无有效 publishedAt → null（调用方跳过入库）
 * - 晚于 now+grace 的「未来日」（常见于政策截止日列被误当 publishedAt）→ null，
 *   禁止像 RSS 那样压成抓取时刻，否则旧截止表会变成「今日进展」
 */
export function resolveWebListPublishedAt(
  itemPublishedAt: Date | null | undefined,
  now: Date,
  graceMs = DEFAULT_FUTURE_GRACE_MS,
): PublishedAtWithPrecision | null {
  if (itemPublishedAt == null || Number.isNaN(itemPublishedAt.getTime())) return null;
  if (itemPublishedAt.getTime() > maxAllowedPublishedAt(now, graceMs).getTime()) {
    return null;
  }
  return { date: itemPublishedAt, precision: 'instant' };
}

