/** 产品默认展示/日历分桶时区（与 User schema 默认一致） */
export const FALLBACK_APP_TIME_ZONE = 'Asia/Shanghai';

export function isValidIanaTimeZone(tz: string): boolean {
  const s = tz?.trim();
  if (!s || s.length > 120) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: s }).format(new Date());
    return true;
  } catch {
    return false;
  }
}
