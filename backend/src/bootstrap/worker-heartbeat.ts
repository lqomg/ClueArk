import type IORedis from 'ioredis';
import { WORKER_HEARTBEAT_INTERVAL_MS, WORKER_READY_KEY, WORKER_READY_TTL_SEC } from './bootstrap.constants';

export async function touchWorkerReady(redis: IORedis): Promise<void> {
  await redis.set(WORKER_READY_KEY, '1', 'EX', WORKER_READY_TTL_SEC);
}

export function startWorkerHeartbeat(redis: IORedis): NodeJS.Timeout {
  const tick = () => {
    void touchWorkerReady(redis).catch(() => undefined);
  };
  tick();
  return setInterval(tick, WORKER_HEARTBEAT_INTERVAL_MS);
}

export function stopWorkerHeartbeat(timer: NodeJS.Timeout | null): void {
  if (timer) clearInterval(timer);
}
