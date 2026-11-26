/** 灰区挂卡：候选 id 或空字符串；延续语不得挂空。 */

export const AUTHOR_ATTACH_RETRY_LIMIT = 1;
export const ATTACH_CANDIDATE_SUMMARY_MAX = 300;

const CONTINUATION_RE =
  /延续|复述|转述|转帖|已有进展|同一事实|同一事件|同一状态|同一进展|挂到候选|continu(?:e|ation)|follow-?up|same\s+(?:fact|event|story|development|launch)|already\s+(?:have|on)/i;

export type AttachChoiceValidation =
  | { ok: true; attachDevelopmentId: string | null }
  | { ok: false; reason: 'invalid_id' | 'continuation_without_attach' };

export function normalizeCandidateIds(ids: Iterable<string>): Set<string> {
  const out = new Set<string>();
  for (const raw of ids) {
    const id = String(raw ?? '').trim();
    if (id) out.add(id);
  }
  return out;
}

export function mentionsExistingDevelopment(text: string): boolean {
  return CONTINUATION_RE.test(String(text ?? ''));
}

export function toAttachCandidatePayload(
  candidates: Array<{ id: string; title: string; summary: string }>,
  limit: number,
): Array<{ id: string; title: string; summary: string }> {
  const cap = Math.max(0, Math.floor(Number(limit) || 0));
  return candidates.slice(0, cap).map((c) => ({
    id: String(c.id ?? '').slice(0, 32),
    title: String(c.title ?? '').slice(0, 300),
    summary: String(c.summary ?? '').slice(0, ATTACH_CANDIDATE_SUMMARY_MAX),
  }));
}

/**
 * attach 必须是候选 id 或空；reason 若写成已有进展的延续，空 attach 非法。
 */
export function validateAttachChoice(params: {
  attachRaw: string | null | undefined;
  candidateIds: Iterable<string>;
  reason?: string;
}): AttachChoiceValidation {
  const ids =
    params.candidateIds instanceof Set
      ? params.candidateIds
      : normalizeCandidateIds(params.candidateIds);
  const attach = String(params.attachRaw ?? '').trim();
  if (attach) {
    if (!ids.has(attach)) return { ok: false, reason: 'invalid_id' };
    return { ok: true, attachDevelopmentId: attach };
  }
  if (ids.size > 0 && mentionsExistingDevelopment(params.reason ?? '')) {
    return { ok: false, reason: 'continuation_without_attach' };
  }
  return { ok: true, attachDevelopmentId: null };
}

export function isInvalidAttachChoice(
  result: AttachChoiceValidation,
): result is { ok: false; reason: 'invalid_id' | 'continuation_without_attach' } {
  return result.ok === false;
}

export function attachRetryHint(
  reason: 'invalid_id' | 'continuation_without_attach',
): string {
  if (reason === 'invalid_id') {
    return '上次 attachDevelopmentId 不在 attachChoices 白名单中。请只填其中某个 catalog id 或空字符串。';
  }
  return '上次把当前条目标成已有进展的延续，但 attachDevelopmentId 为空。同一事实必须填候选 id，不得留空。';
}
