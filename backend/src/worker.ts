import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { WorkerModule } from './worker.module';
import { JobProcessorsService } from './modules/job-center/job-processors.service';
import { LoggerService } from './modules/logger/logger.service';
import {
  assertRequiredEnv,
  assertRedisReachable,
  failBootstrapAndExit,
} from './bootstrap/platform-bootstrap';

async function bootstrap(): Promise<void> {
  try {
    const app = await NestFactory.createApplicationContext(WorkerModule, {
      bufferLogs: true,
    });
    app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
    const logger = app.get(LoggerService).createLogger('Worker');

    assertRequiredEnv();

    const connection = app.get<Connection>(getConnectionToken());
    await connection.asPromise();
    logger.log('MongoDB 连接成功');

    const redisUrl = process.env.REDIS_URL!.trim();
    const probe = await assertRedisReachable(redisUrl);
    await probe.quit();
    logger.log('Redis 连接成功');

    app.get(JobProcessorsService);
    logger.log('ClueArk worker 已启动（Job Center 消费者 + 定时调度）');
  } catch (e) {
    failBootstrapAndExit(e);
  }
}

void bootstrap();
