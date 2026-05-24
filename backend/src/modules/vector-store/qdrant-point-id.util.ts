import { Types } from 'mongoose';

const PAD_SUFFIX = '00000000';

/** MongoDB ObjectId（24 hex）→ Qdrant 可接受的 UUID 点 ID（确定性映射）。 */
export function mongoIdToQdrantPointId(mongoId: string): string {
  const hex = mongoId.trim().toLowerCase();
  if (!Types.ObjectId.isValid(hex) || !/^[a-f0-9]{24}$/.test(hex)) {
    throw new Error(`invalid_mongo_object_id:${mongoId}`);
  }
  const padded = hex + PAD_SUFFIX;
  return `${padded.slice(0, 8)}-${padded.slice(8, 12)}-${padded.slice(12, 16)}-${padded.slice(16, 20)}-${padded.slice(20, 32)}`;
}

/** 从 Qdrant UUID 点 ID 还原 Mongo ObjectId（仅适用于本项目的 padding 规则）。 */
export function qdrantPointIdToMongoId(pointId: string): string | null {
  const raw = String(pointId).replace(/-/g, '').toLowerCase();
  if (raw.length !== 32 || !raw.endsWith(PAD_SUFFIX)) return null;
  const hex = raw.slice(0, 24);
  if (!/^[a-f0-9]{24}$/.test(hex) || !Types.ObjectId.isValid(hex)) return null;
  return hex;
}

export function resolveMongoIdFromQdrantHit(
  pointId: string | number | undefined,
  payloadId: string | undefined,
): string {
  if (payloadId && Types.ObjectId.isValid(payloadId)) return String(payloadId);
  if (pointId != null) {
    const fromPoint = qdrantPointIdToMongoId(String(pointId));
    if (fromPoint) return fromPoint;
    const raw = String(pointId);
    if (Types.ObjectId.isValid(raw) && /^[a-f0-9]{24}$/i.test(raw)) return raw;
  }
  return String(pointId ?? '');
}
