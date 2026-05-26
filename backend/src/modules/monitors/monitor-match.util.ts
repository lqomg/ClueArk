import { cosineSimilarity } from '../feed-items/feed-similarity.util';

export const DEFAULT_MONITOR_MATCH_RECENT_HOURS = 720;

export function resolveMinCosine(raw: number | null | undefined): number {
  return typeof raw === 'number' && Number.isFinite(raw)
    ? Math.min(1, Math.max(0, raw))
    : 0.43;
}

export function resolveMatchRecentHours(configValue: unknown): number {
  const raw = Number(configValue);
  return Number.isFinite(raw) && raw >= 1 && raw <= 2160
    ? Math.floor(raw)
    : DEFAULT_MONITOR_MATCH_RECENT_HOURS;
}

export function matchPeriodMs(
  recentHours: number,
  nowMs = Date.now(),
): { periodStartMs: number; periodEndMs: number } {
  const h =
    Number.isFinite(recentHours) && recentHours >= 1
      ? recentHours
      : DEFAULT_MONITOR_MATCH_RECENT_HOURS;
  return { periodStartMs: nowMs - h * 3600000, periodEndMs: nowMs };
}

export type MonitorMatchRejectReason = 'low_score' | 'source_mismatch' | 'out_of_period';

export type MonitorMatchResult =
  | { matched: true; score: number }
  | { matched: false; score: number; reason: MonitorMatchRejectReason };

export type EvaluateMonitorMatchParams = {
  score: number;
  minCosine: number;
  sourceId: string;
  monitorSourceIds: readonly string[];
  publishedAtMs: number;
  periodStartMs: number;
  periodEndMs: number;
};

/** 通知与时间线共用的监控匹配判定（语义分 + 信源 + 发布时间窗） */
export function evaluateMonitorMatch(params: EvaluateMonitorMatchParams): MonitorMatchResult {
  const score = params.score;
  if (!params.monitorSourceIds.includes(params.sourceId)) {
    return { matched: false, score, reason: 'source_mismatch' };
  }
  if (
    params.publishedAtMs < params.periodStartMs ||
    params.publishedAtMs > params.periodEndMs
  ) {
    return { matched: false, score, reason: 'out_of_period' };
  }
  if (score < params.minCosine) {
    return { matched: false, score, reason: 'low_score' };
  }
  return { matched: true, score };
}

export type EvaluateMonitorMatchVectorsParams = Omit<EvaluateMonitorMatchParams, 'score'> & {
  itemVector: number[];
  monitorVector: number[];
};

/** 基于条目/监控向量计算余弦分后再判定 */
export function evaluateMonitorMatchVectors(
  params: EvaluateMonitorMatchVectorsParams,
): MonitorMatchResult {
  const score = cosineSimilarity(params.itemVector, params.monitorVector);
  const { itemVector: _i, monitorVector: _m, ...rest } = params;
  return evaluateMonitorMatch({ ...rest, score });
}
