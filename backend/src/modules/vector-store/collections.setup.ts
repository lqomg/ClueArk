import type { QdrantClient } from "@qdrant/js-client-rest";
export const DEFAULT_VECTOR_SIZE = 1536;

export function resolveEmbeddingDimensions(raw?: string): number {
  const trimmed = raw?.trim();
  if (!trimmed) return DEFAULT_VECTOR_SIZE;
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_VECTOR_SIZE;
}

async function assertCollectionVectorSize(
  client: QdrantClient,
  name: string,
  expectedSize: number,
): Promise<void> {
  const info = await client.getCollection(name);
  const existing = info.config?.params?.vectors?.size;
  if (typeof existing === "number" && existing !== expectedSize) {
    throw new Error(
      `Qdrant 集合 ${name} 向量维度为 ${existing}，与 embedding 维度 ${expectedSize} 不一致；` +
        `请设置 FEED_EMBEDDING_DIMENSIONS=${existing} 或重建该集合。`,
    );
  }
}

export async function ensureQdrantCollections(
  client: QdrantClient,
  feedCollection: string,
  monitorCollection: string,
  vectorSize = DEFAULT_VECTOR_SIZE,
): Promise<void> {
  const collections = await client.getCollections();
  const names = new Set((collections.collections ?? []).map((c) => c.name));
  if (!names.has(feedCollection)) {
    await client.createCollection(feedCollection, {
      vectors: { size: vectorSize, distance: "Cosine" },
    });
    await client.createPayloadIndex(feedCollection, {
      field_name: "sourceId",
      field_schema: "keyword",
    });
    await client.createPayloadIndex(feedCollection, {
      field_name: "publishedAt",
      field_schema: "integer",
    });
  } else {
    await assertCollectionVectorSize(client, feedCollection, vectorSize);
  }
  if (!names.has(monitorCollection)) {
    await client.createCollection(monitorCollection, {
      vectors: { size: vectorSize, distance: "Cosine" },
    });
    await client.createPayloadIndex(monitorCollection, {
      field_name: "sourceIds",
      field_schema: "keyword",
    });
    await client.createPayloadIndex(monitorCollection, {
      field_name: "userId",
      field_schema: "keyword",
    });
  } else {
    await assertCollectionVectorSize(client, monitorCollection, vectorSize);
  }
}
export function vectorSizeFromEmbedding(sample: number[] | undefined): number {
  if (sample?.length) return sample.length;
  return DEFAULT_VECTOR_SIZE;
}
