/** 时间精度：有钟点 vs 仅日历日（见 docs/TIME_CONTRACT.md） */
export const TIME_PRECISIONS = ['instant', 'day'] as const;
export type TimePrecision = (typeof TIME_PRECISIONS)[number];

export function normalizeTimePrecision(raw: unknown): TimePrecision {
  return raw === 'day' ? 'day' : 'instant';
}
