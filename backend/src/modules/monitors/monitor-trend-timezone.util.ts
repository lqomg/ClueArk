import dayjs = require('dayjs');
import utc = require('dayjs/plugin/utc');
import timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);
/** 某瞬时在该 IANA 时区下的日历日键 yyyy-MM-dd */
export function dateKeyInTimeZone(instant: Date, tz: string): string {
  return dayjs(instant).tz(tz).format('YYYY-MM-DD');
}

/**
 * 近 7 个日历日（含今天在 timeZone 下的日期），从旧到新。
 */
export function sevenDayTrendDateKeys(now: Date, tz: string): string[] {
  const today = dayjs(now).tz(tz);
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    keys.push(today.subtract(6 - i, 'day').format('YYYY-MM-DD'));
  }
  return keys;
}

export function formatReferenceNowIsoForLlm(referenceNow: Date, tz: string): string {
  return dayjs(referenceNow).tz(tz).format('YYYY-MM-DDTHH:mm:ssZ');
}

export function formatReferenceNowReadableZh(referenceNow: Date, tz: string): string {
  return `${dayjs(referenceNow).tz(tz).format('YYYY年M月D日 HH:mm')}（${tz}）`;
}
