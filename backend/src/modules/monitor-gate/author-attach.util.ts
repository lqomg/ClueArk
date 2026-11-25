export type AuthorAttachCandidate = {
  id: string;
  mergeScopeKey: string;
};

export type AuthorAttachSource =
  | 'llm'
  | 'hard'
  | 'near_dup'
  | 'same_claim_post'
  | 'none'
  | 'delta_detach';

export function resolveAuthorAttachTarget(
  attachDevelopmentId: string | null | undefined,
  candidates: AuthorAttachCandidate[],
  fallbackMergeScopeKey: string,
): { mergeScopeKey: string; attached: boolean } {
  const id = String(attachDevelopmentId ?? '').trim();
  if (!id) {
    return { mergeScopeKey: fallbackMergeScopeKey, attached: false };
  }
  const hit = candidates.find((c) => c.id === id);
  const key = String(hit?.mergeScopeKey ?? '').trim();
  if (!hit || !key) {
    return { mergeScopeKey: fallbackMergeScopeKey, attached: false };
  }
  return { mergeScopeKey: key, attached: true };
}

/** 新建节点没有可挂对象，evidence_only 无意义。 */
export function resolveAuthoredMergeMode(
  attached: boolean,
  mergeMode: 'upsert_text' | 'evidence_only',
): 'upsert_text' | 'evidence_only' {
  if (!attached) return 'upsert_text';
  return mergeMode === 'evidence_only' ? 'evidence_only' : 'upsert_text';
}
