const STRUCTURED_FACT_KINDS = new Set([
  'quote',
  'metric',
  'location_event',
  'policy',
  'release',
  'state_change',
]);

/** 宽松校验：非法 kind 或非对象则置 null，避免脏数据进库。 */
export function normalizeStructuredFact(
  raw: unknown,
): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const kind = String(obj.kind ?? '').trim();
  if (!STRUCTURED_FACT_KINDS.has(kind)) return null;
  return { ...obj, kind };
}
