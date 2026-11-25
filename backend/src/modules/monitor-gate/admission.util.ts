import { normalizeMinCosine } from '../monitors/monitor-match.util';

export const ENTITY_HIT_MIN_SEMANTIC = 0.28;

export type AdmissionReason = 'semantic_high' | 'entity_keyword_hit';

export type AdmissionDecision =
  | {
      admitted: true;
      reasons: AdmissionReason[];
      semanticScore: number | null;
      quote: string;
    }
  | { admitted: false; reason: string; semanticScore: number | null };

export function pickCoreEntityTerms(entities: string[] | null | undefined, max = 12): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of entities ?? []) {
    const t = String(x || '').trim();
    if (!t || t.length < 2 || t.length > 40) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function textHardHitsCoreEntities(
  text: string,
  entities: string[] | null | undefined,
): boolean {
  const hay = String(text ?? '')
    .trim()
    .toLowerCase();
  if (!hay) return false;
  const terms = pickCoreEntityTerms(entities)
    .map((t) => t.toLowerCase())
    .filter((t) => t.length >= 2);
  if (!terms.length) return false;
  return terms.some((term) => {
    if (/[\u3400-\u9fff]/.test(term) || term.length >= 3) {
      return hay.includes(term);
    }
    return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(term)}([^\\p{L}\\p{N}]|$)`, 'iu').test(
      hay,
    );
  });
}

export function pickAdmissionQuote(params: {
  title: string;
  summary?: string;
  maxLen?: number;
}): string {
  const maxLen = params.maxLen ?? 800;
  const title = String(params.title ?? '').trim();
  if (title) return title.slice(0, maxLen);
  return String(params.summary ?? '')
    .trim()
    .slice(0, maxLen);
}

/**
 * 召回进场：语义高（≥ minCosine）或实体硬撞（需语义分 ≥ ENTITY_HIT_MIN_SEMANTIC）。
 * 不决定 wake/drop。
 */
export function decideAdmission(input: {
  minCosine: unknown;
  title: string;
  summary?: string;
  entities?: string[] | null;
  precomputedSemanticScore?: number | null;
}): AdmissionDecision {
  const quote = pickAdmissionQuote({
    title: input.title,
    summary: input.summary,
    maxLen: 800,
  });
  const semanticScore =
    typeof input.precomputedSemanticScore === 'number' &&
    Number.isFinite(input.precomputedSemanticScore)
      ? input.precomputedSemanticScore
      : null;

  const reasons: AdmissionReason[] = [];
  const high = normalizeMinCosine(input.minCosine);
  if (semanticScore != null && semanticScore >= high) {
    reasons.push('semantic_high');
  }

  const hay = `${input.title}\n${quote}`;
  const entityHit = textHardHitsCoreEntities(hay, input.entities);
  if (entityHit && semanticScore != null && semanticScore >= ENTITY_HIT_MIN_SEMANTIC) {
    reasons.push('entity_keyword_hit');
  }

  if (!reasons.length) {
    return {
      admitted: false,
      reason:
        semanticScore == null
          ? 'no_semantic_score'
          : entityHit
            ? 'entity_hit_below_floor'
            : 'below_threshold',
      semanticScore,
    };
  }

  return { admitted: true, reasons, semanticScore, quote };
}

/** 候选召回下限：略低于实体地板，避免漏掉刚过线的命中 */
export function candidateRecallFloor(minCosine: unknown): number {
  const high = normalizeMinCosine(minCosine);
  return Math.min(high, ENTITY_HIT_MIN_SEMANTIC);
}
