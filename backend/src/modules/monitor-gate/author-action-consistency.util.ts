/**
 * Author wake/drop 一致性：模型有时 action=wake，却把 drop 理由写进 title/summary/reason。
 * 热路径在入库前强制纠成 drop，避免脏进展卡。
 */

const DROP_RATIONALE_RES: RegExp[] = [
  /\bdrop\b/i,
  /判为\s*drop/i,
  /必须\s*drop/i,
  /应\s*drop/i,
  /不足以支撑/,
  /不值得上时间线/,
  /无可核验独立事实/,
  /无可独立可核验/,
  /条目过短且无可核验/,
  /无独立可核验事实/,
];

export function textLooksLikeDropRationale(...parts: Array<string | null | undefined>): boolean {
  const blob = parts
    .map((p) => String(p ?? '').trim())
    .filter(Boolean)
    .join('\n');
  if (!blob) return false;
  return DROP_RATIONALE_RES.some((re) => re.test(blob));
}

/**
 * wake 但文案像 drop 理由 → 纠成 drop。
 * 返回纠正后的 action；未纠正则原样。
 */
export function coerceWakeDropConsistency(input: {
  action: 'wake' | 'drop';
  title?: string | null;
  summary?: string | null;
  reason?: string | null;
}): { action: 'wake' | 'drop'; coerced: boolean; reason: string } {
  if (input.action !== 'wake') {
    return { action: input.action, coerced: false, reason: '' };
  }
  if (!textLooksLikeDropRationale(input.title, input.summary, input.reason)) {
    return { action: 'wake', coerced: false, reason: '' };
  }
  return {
    action: 'drop',
    coerced: true,
    reason: 'wake_text_looks_like_drop_rationale',
  };
}
