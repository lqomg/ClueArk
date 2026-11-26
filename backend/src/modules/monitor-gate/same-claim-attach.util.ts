import { titleNearDupOverlap } from './soft-merge.util';

export type SameClaimCatalogCard = {
  id: string;
  title: string;
  summary?: string;
  /** 进展主时间戳（ms）；与 probeAtMs 一起做时间窗过滤 */
  timelineAtMs?: number;
};

export type SameClaimAttachHit = {
  id: string;
  jaccard: number;
  shared: number;
  coverageMin: number;
};

/**
 * 条目标题（或成稿标题）相对进展目录的同主张近重。
 * 用于热路径：跨簇时强制倾向挂旧卡，避免同事实新开。
 *
 * 若提供 windowHours：条目与候选卡都必须有有效时间戳，且 |Δt| ≤ 窗；
 * 否则不强制挂（交给后续 LLM / 新开），避免跨周模板标题误合。
 */
export function findSameClaimAttachTarget(
  claimTitle: string,
  catalog: SameClaimCatalogCard[],
  opts: {
    minSharedTokens: number;
    minTitleJaccard: number;
    /** coverageMin = shared / min(|A|,|B|)；与 jaccard 二选一达标即可 */
    minCoverage?: number;
    excludeTerms?: string[];
    /** 时间邻近窗（小时）；未设或 ≤0 则不做时间过滤（仅测试/离线特例） */
    windowHours?: number;
    /** 当前条目 publishedAt（ms） */
    probeAtMs?: number;
  },
): SameClaimAttachHit | null {
  const probe = String(claimTitle ?? '').trim();
  if (!probe || !catalog.length) return null;
  const minCoverage = opts.minCoverage ?? 0.5;
  const windowHours = opts.windowHours;
  const useWindow = windowHours != null && windowHours > 0;
  const probeAtMs = opts.probeAtMs ?? NaN;
  if (useWindow && (!Number.isFinite(probeAtMs) || probeAtMs <= 0)) {
    return null;
  }
  const windowMs = useWindow ? Math.max(1, windowHours!) * 3600_000 : 0;

  let best: SameClaimAttachHit | null = null;

  for (const card of catalog) {
    const title = String(card.title ?? '').trim();
    if (!title) continue;
    if (useWindow) {
      const cardAt = card.timelineAtMs ?? NaN;
      if (!Number.isFinite(cardAt) || cardAt <= 0) continue;
      if (Math.abs(cardAt - probeAtMs) > windowMs) continue;
    }
    const { jaccard, shared, coverageMin } = titleNearDupOverlap(
      probe,
      title,
      opts.excludeTerms ?? [],
    );
    if (shared < opts.minSharedTokens) continue;
    if (!(jaccard >= opts.minTitleJaccard || coverageMin >= minCoverage)) continue;
    const score = Math.max(jaccard, coverageMin);
    if (!best || score > Math.max(best.jaccard, best.coverageMin)) {
      best = { id: card.id, jaccard, shared, coverageMin };
    }
  }
  return best;
}
