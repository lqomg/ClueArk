/** 将信源轮询间隔限制在 [min, max]，无效时用 def（秒） */
export function clampPollIntervalSec(
  raw: number | undefined,
  min = 30,
  max = 86400,
  def = 600,
): number {
  const v = Number.isFinite(raw) && raw! > 0 ? Math.floor(raw!) : def;
  return Math.min(max, Math.max(min, v));
}

export function pollIntervalBoundsFromConfig(get: (key: string) => unknown): {
  min: number;
  max: number;
  def: number;
} {
  const min = Number(get('SOURCE_POLL_MIN_SEC')) || 30;
  const max = Number(get('SOURCE_POLL_MAX_SEC')) || 86400;
  const def = Number(get('SOURCE_POLL_DEFAULT_SEC')) || 600;
  return { min, max, def };
}
