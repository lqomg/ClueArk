import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import IORedis from 'ioredis';
import { QdrantClient } from '@qdrant/js-client-rest';
import { WORKER_READY_KEY } from '../bootstrap/bootstrap.constants';

export type ReadinessCheck = { ok: boolean; detail?: string };

@Injectable()
export class HealthService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly config: ConfigService,
  ) {}

  mongoStatus(): ReadinessCheck {
    const ok = this.connection.readyState === 1;
    return ok ? { ok: true } : { ok: false, detail: 'disconnected' };
  }

  async redisStatus(): Promise<ReadinessCheck> {
    const url = this.config.get<string>('REDIS_URL')?.trim();
    if (!url) return { ok: false, detail: 'REDIS_URL missing' };
    const redis = new IORedis(url, { maxRetriesPerRequest: 1, connectTimeout: 5_000 });
    try {
      const pong = await redis.ping();
      return pong === 'PONG' ? { ok: true } : { ok: false, detail: String(pong) };
    } catch (e) {
      return { ok: false, detail: e instanceof Error ? e.message : String(e) };
    } finally {
      await redis.quit().catch(() => undefined);
    }
  }

  async qdrantStatus(): Promise<ReadinessCheck> {
    const url = this.config.get<string>('QDRANT_URL')?.trim();
    if (!url) return { ok: false, detail: 'QDRANT_URL missing' };
    try {
      const client = new QdrantClient({ url });
      await client.getCollections();
      return { ok: true };
    } catch (e) {
      return { ok: false, detail: e instanceof Error ? e.message : String(e) };
    }
  }

  async workerStatus(): Promise<ReadinessCheck> {
    const url = this.config.get<string>('REDIS_URL')?.trim();
    if (!url) return { ok: false, detail: 'REDIS_URL missing' };
    const redis = new IORedis(url, { maxRetriesPerRequest: 1, connectTimeout: 5_000 });
    try {
      const v = await redis.get(WORKER_READY_KEY);
      return v ? { ok: true } : { ok: false, detail: 'worker heartbeat absent' };
    } catch (e) {
      return { ok: false, detail: e instanceof Error ? e.message : String(e) };
    } finally {
      await redis.quit().catch(() => undefined);
    }
  }

  async readiness(): Promise<{ status: string; checks: Record<string, ReadinessCheck> }> {
    const [redis, qdrant, worker] = await Promise.all([
      this.redisStatus(),
      this.qdrantStatus(),
      this.workerStatus(),
    ]);
    const mongo = this.mongoStatus();
    const checks = { mongo, redis, qdrant, worker };
    const ok = Object.values(checks).every((c) => c.ok);
    return { status: ok ? 'ready' : 'not_ready', checks };
  }
}
