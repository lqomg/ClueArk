export type AuthorDevelopmentImportance = 'critical' | 'high' | 'medium';

export type DevelopmentQualityScores = {
  confidence: number;
  noveltyScore: number;
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return Math.round(n * 1000) / 1000;
}

/**
 * 热路径进展质量分：不再默认卡死 0.5。
 * - confidence：源角色 + 证据量 + 重要度
 * - novelty：新建 > 文案增量 > 仅挂证据
 */
export function computeDevelopmentQualityScores(input: {
  attached: boolean;
  mergeMode: 'upsert_text' | 'evidence_only';
  importance?: AuthorDevelopmentImportance | string | null;
  evidenceCount: number;
  sourceRole?: string | null;
}): DevelopmentQualityScores {
  const importance = String(input.importance ?? 'medium').toLowerCase();
  const importanceBoost =
    importance === 'critical' ? 0.12 : importance === 'high' ? 0.08 : 0.02;
  const role = String(input.sourceRole ?? '');
  const roleBoost =
    role === 'primary_subject_feed' ? 0.12 : role === 'reference_source' ? 0.04 : 0;
  const ev = Math.max(0, Math.floor(input.evidenceCount) || 0);
  const evidenceBoost = Math.min(0.18, Math.log2(1 + ev) * 0.06);

  let confidence = 0.55 + importanceBoost + roleBoost + evidenceBoost;
  if (input.attached && input.mergeMode === 'evidence_only') {
    confidence += 0.05;
  }
  confidence = clamp01(confidence);

  let noveltyScore: number;
  if (!input.attached) {
    noveltyScore = importance === 'critical' ? 0.85 : importance === 'high' ? 0.75 : 0.65;
  } else if (input.mergeMode === 'evidence_only') {
    noveltyScore = 0.22;
  } else {
    noveltyScore = importance === 'critical' ? 0.55 : importance === 'high' ? 0.45 : 0.35;
  }

  return { confidence, noveltyScore: clamp01(noveltyScore) };
}
