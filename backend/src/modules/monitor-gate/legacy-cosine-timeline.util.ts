/** LEGACY_COSINE_TIMELINE=1|true|yes → 旧路径：余弦命中即通知，不跑门禁。缺省关闭（走门禁）。 */
export function isLegacyCosineTimelineEnabled(
  raw: string | undefined | null,
): boolean {
  const v = String(raw ?? '')
    .trim()
    .toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}
