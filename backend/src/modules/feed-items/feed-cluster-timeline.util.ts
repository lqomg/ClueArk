import { Types } from 'mongoose';

export type ClusterTimelineStats = {
  clusterItemCount: number;
  clusterSourceCount: number;
};

/** 时间线/研判去重：有 clusterId 用簇，否则单条 */
export function feedClusterGroupKey(doc: Record<string, unknown>): string {
  const cid = doc.clusterId as Types.ObjectId | null | undefined;
  return cid ? String(cid) : String(doc._id);
}

function sourceIdFromDoc(doc: Record<string, unknown>): string {
  const sid = doc.sourceId;
  if (sid && typeof sid === 'object' && '_id' in sid) return String((sid as { _id: Types.ObjectId })._id);
  if (sid instanceof Types.ObjectId) return String(sid);
  if (typeof sid === 'string') return sid;
  return '';
}

/** 在 scored 集合上统计每个簇的条数与信源数 */
export function buildClusterStatsMap(
  scored: { doc: Record<string, unknown> }[],
): Map<string, ClusterTimelineStats> {
  const itemCount = new Map<string, number>();
  const sourceSets = new Map<string, Set<string>>();
  for (let i = 0; i < scored.length; i++) {
    const key = feedClusterGroupKey(scored[i].doc);
    itemCount.set(key, (itemCount.get(key) ?? 0) + 1);
    const sid = sourceIdFromDoc(scored[i].doc);
    if (!sourceSets.has(key)) sourceSets.set(key, new Set());
    if (sid) sourceSets.get(key)!.add(sid);
  }
  const out = new Map<string, ClusterTimelineStats>();
  for (const [key, count] of itemCount) {
    const srcN = sourceSets.get(key)?.size ?? 1;
    out.set(key, { clusterItemCount: count, clusterSourceCount: Math.max(1, srcN) });
  }
  return out;
}

/** 同簇只保留首条（scored 须已按时间/分数排序） */
export function dedupeScoredByCluster<T extends { doc: Record<string, unknown>; score: number }>(
  scored: T[],
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (let i = 0; i < scored.length; i++) {
    const key = feedClusterGroupKey(scored[i].doc);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(scored[i]);
  }
  return out;
}
