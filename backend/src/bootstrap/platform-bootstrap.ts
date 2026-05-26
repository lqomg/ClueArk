import { QdrantClient } from '@qdrant/js-client-rest';
import IORedis from 'ioredis';
import { ensureQdrantCollections, resolveEmbeddingDimensions } from '../modules/vector-store/collections.setup';
import {
  REQUIRED_ENV_KEYS,
  WORKER_READY_KEY,
  WORKER_WAIT_POLL_MS,
  WORKER_WAIT_TIMEOUT_MS,
} from './bootstrap.constants';

export class PlatformBootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlatformBootstrapError';
  }
}

export function assertRequiredEnv(): void {
  const missing: string[] = [];
  for (const key of REQUIRED_ENV_KEYS) {
    const v = process.env[key]?.trim();
    if (!v) missing.push(key);
  }
  if (missing.length) {
    throw new PlatformBootstrapError(
      `缺少必填环境变量：${missing.join(', ')}。请对照 backend/.env.example 配置。`,
    );
  }
}

export async function assertRedisReachable(redisUrl: string): Promise<IORedis> {
  const redis = new IORedis(redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 10_000 });
  try {
    const pong = await redis.ping();
    if (pong !== 'PONG') {
      throw new PlatformBootstrapError(`Redis PING 异常：${pong}`);
    }
    return redis;
  } catch (e) {
    await redis.quit().catch(() => undefined);
    const msg = e instanceof Error ? e.message : String(e);
    throw new PlatformBootstrapError(`无法连接 Redis（${redisUrl}）：${msg}`);
  }
}

export async function assertQdrantReady(qdrantUrl: string): Promise<void> {
  const feedCollection = process.env.QDRANT_COLLECTION_FEED?.trim() || 'feed_items';
  const monitorCollection = process.env.QDRANT_COLLECTION_MONITORS?.trim() || 'monitors';
  const client = new QdrantClient({ url: qdrantUrl });
  try {
    await ensureQdrantCollections(
      client,
      feedCollection,
      monitorCollection,
      resolveEmbeddingDimensions(process.env.FEED_EMBEDDING_DIMENSIONS),
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new PlatformBootstrapError(`Qdrant 初始化失败（${qdrantUrl}）：${msg}`);
  }
}

export async function waitForWorkerReady(redisUrl: string): Promise<void> {
  const redis = new IORedis(redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 10_000 });
  const deadline = Date.now() + WORKER_WAIT_TIMEOUT_MS;
  try {
    while (Date.now() < deadline) {
      const v = await redis.get(WORKER_READY_KEY);
      if (v) return;
      await new Promise((r) => setTimeout(r, WORKER_WAIT_POLL_MS));
    }
    throw new PlatformBootstrapError(
      `Worker 未在 ${WORKER_WAIT_TIMEOUT_MS / 1000}s 内就绪。请先启动 worker：` +
        `本地执行 npm run start:worker:dev 或 npm run dev；Docker 请确认 clueark-worker 容器已运行。`,
    );
  } finally {
    await redis.quit().catch(() => undefined);
  }
}

export function failBootstrapAndExit(error: unknown): never {
  const msg =
    error instanceof PlatformBootstrapError
      ? error.message
      : error instanceof Error
        ? error.message
        : String(error);
  // eslint-disable-next-line no-console
  console.error(`[ClueArk] 启动校验失败，进程退出：\n${msg}`);
  process.exit(1);
}
