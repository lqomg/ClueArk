type NormalizePublishedAtOptions = {
  now?: Date;
};

const DEFAULT_FUTURE_GRACE_MS = 6 * 60 * 60 * 1000;
const REL_RE = /^(\d{1,6})\s*(秒|分钟|分|小时|时|天|日|周|月|年)\s*(前|内)$/;
const TODAY_YESTERDAY_RE = /^(今天|昨日|昨天|前天)\s*(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?$/;
const CH_MD_RE =
  /^(\d{4})?\s*[年\/\-\.]?\s*(\d{1,2})\s*[月\/\-\.]\s*(\d{1,2})\s*(?:日|号)?\s*(\d{1,2})?(?::(\d{1,2}))?(?::(\d{1,2}))?$/;
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

export function normalizePublishedAt(raw: unknown, opts: NormalizePublishedAtOptions = {}): Date | null {
  const now = opts.now ?? new Date();
  if (raw == null) return null;

  if (typeof raw === 'number') {
    return parseTimestampLike(raw);
  }

  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw;
  }

  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  if (!t) return null;

  // 常见“刚刚/刚才/刚发布”
  if (t === '刚刚' || t === '刚才' || t === '刚发布') return now;
  if (EN_JUST_NOW_RE.test(t)) return now;

  // 纯数字：大概率是时间戳（秒/毫秒）
  if (DIGITS_RE.test(t)) {
    const n = Number(t);
    return parseTimestampLike(n);
  }

  // 相对时间：1分钟前 / 10分钟内 / 2小时前
  const rel = t.match(REL_RE);
  if (rel) {
    const n = Number(rel[1]);
    const unit = rel[2];
    if (!Number.isFinite(n) || n < 0) return null;
    const msUnit = unitToMs(unit);
    if (!msUnit) return null;
    return safeDateFromMs(now.getTime() - n * msUnit);
  }

  // English relative: 5m ago / 2 hours ago / 10 min within
  const enRel = t.match(EN_REL_RE);
  if (enRel) {
    const n = Number(enRel[1]);
    if (!Number.isFinite(n) || n < 0) return null;
    const msUnit = enUnitToMs(enRel[2]);
    if (!msUnit) return null;
    return safeDateFromMs(now.getTime() - n * msUnit);
  }

  // 今天/昨天/前天 + HH:mm(:ss)
  const ty = t.match(TODAY_YESTERDAY_RE);
  if (ty) {
    const base = ty[1];
    const hh = Number(ty[2]);
    const mm = ty[3] ? Number(ty[3]) : 0;
    const ss = ty[4] ? Number(ty[4]) : 0;
    if (![hh, mm, ss].every((x) => Number.isFinite(x))) return null;
    const dayOffset = base === '今天' ? 0 : base === '昨日' || base === '昨天' ? -1 : -2;
    const d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, ss, 0);
    return safeDateFromMs(d0.getTime() + dayOffset * 86_400_000);
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
    return safeDateFromMs(d0.getTime() + dayOffset * 86_400_000);
  }

  // 中文/数字日期：YYYY-MM-DD HH:mm(:ss) 或 4月29日 12:30（默认当前年）
  const md = t.match(CH_MD_RE);
  if (md) {
    const year = md[1] ? Number(md[1]) : now.getFullYear();
    const month1 = Number(md[2]);
    const day = Number(md[3]);
    const hh = md[4] ? Number(md[4]) : 0;
    const mm = md[5] ? Number(md[5]) : 0;
    const ss = md[6] ? Number(md[6]) : 0;
    return buildLocalDate(year, month1, day, hh, mm, ss);
  }

  // English month name: Apr 29, 2026 12:30 pm / April 29 2026
  const enMdY = t.match(EN_MD_Y_RE);
  if (enMdY) {
    const month1 = monthNameToNumber(enMdY[1]);
    const day = Number(enMdY[2]);
    const year = Number(enMdY[3]);
    let hh = enMdY[4] ? Number(enMdY[4]) : 0;
    const mm = enMdY[5] ? Number(enMdY[5]) : 0;
    const ss = enMdY[6] ? Number(enMdY[6]) : 0;
    if (!month1) return null;
    if (![day, year, hh, mm, ss].every((x) => Number.isFinite(x))) return null;
    hh = normalizeAmPm(hh, enMdY[7]);
    return buildLocalDate(year, month1, day, hh, mm, ss);
  }

  // 兜底：Date.parse（ISO/RFC/浏览器常见格式）
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

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

