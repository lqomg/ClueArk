export const FEED_MIN_SUMMARY_LEN_FOR_LLM = 20;

/** 入库 summary 仅存库上限（与 schema maxlength 一致） */
export const FEED_SUMMARY_STORE_MAX_CHARS = 50000;

/** 送入 LLM 富化的 summary 默认截断长度 */
export const FEED_LLM_SUMMARY_MAX_CHARS = 3000;

export function clipSummaryForLlm(summary: string, maxChars = FEED_LLM_SUMMARY_MAX_CHARS): string {
  const s = summary.trim();
  if (s.length <= maxChars) return s;
  return s.slice(0, maxChars);
}

export function normalizeSummaryForStore(summary: string): string {
  const s = summary.trim();
  if (s.length <= FEED_SUMMARY_STORE_MAX_CHARS) return s;
  return s.slice(0, FEED_SUMMARY_STORE_MAX_CHARS);
}

/** 摘要够长且尚未富化完成（pending / failed 可入队或重试） */
export function shouldEnqueueLlmEnrich(
  llmStatus: string | undefined | null,
  summary: string,
): boolean {
  if (summary.trim().length < FEED_MIN_SUMMARY_LEN_FOR_LLM) return false;
  const status = llmStatus ?? 'pending';
  return status === 'pending' || status === 'failed';
}

