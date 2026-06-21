/** 监控 ↔ 条目匹配：通知与时间线共用（语义分 ≥ minCosine） */

export const DEFAULT_MIN_COSINE = 0.43;

export function normalizeMinCosine(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : DEFAULT_MIN_COSINE;
}

export function isMonitorItemMatched(score: number, minCosine: unknown): boolean {
  const min = normalizeMinCosine(minCosine);
  return Number.isFinite(score) && score >= min;
}
