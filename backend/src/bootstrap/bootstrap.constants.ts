/** Worker 就绪心跳（Redis）；API 启动前必须检测到 */
export const WORKER_READY_KEY = 'clueark:worker:ready';
export const WORKER_READY_TTL_SEC = 30;
export const WORKER_HEARTBEAT_INTERVAL_MS = 10_000;
export const WORKER_WAIT_TIMEOUT_MS = 90_000;
export const WORKER_WAIT_POLL_MS = 2_000;

export const REQUIRED_ENV_KEYS = [
  'REDIS_URL',
  'QDRANT_URL',
  'FEED_EMBEDDING_API_KEY',
  'DEEPSEEK_API_KEY',
] as const;
