import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { I18nService, I18nValidationExceptionFilter, i18nValidationErrorFactory } from 'nestjs-i18n';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { LoggerService } from './modules/logger/logger.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  assertRequiredEnv,
  assertRedisReachable,
  waitForWorkerReady,
} from './bootstrap/platform-bootstrap';

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';



function getAccessibleHosts(): string[] {

  const interfaces = os.networkInterfaces();
  const hosts = new Set<string>();

  for (const networkInterface of Object.values(interfaces)) {

    if (!networkInterface?.length) continue;

    for (const addressInfo of networkInterface) {
      if (addressInfo.family !== 'IPv4' || addressInfo.internal) continue;
      hosts.add(addressInfo.address);
    }
  }
  return [...hosts].sort();
}



async function bootstrap() {

  let app: NestExpressApplication;
  try {
    app = await NestFactory.create<NestExpressApplication>(AppModule, {
      bufferLogs: true,
    });
    assertRequiredEnv();
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }


  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });
  app.useStaticAssets(uploadsDir, { prefix: '/api/uploads' });
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  const loggerService = app.get(LoggerService);
  const logger = loggerService.createLogger('Bootstrap');
  try {
    const exceptionLogger = loggerService.createLogger('ExceptionFilter');
    const i18n = app.get(I18nService);
    app.useGlobalFilters(
      new AllExceptionsFilter(exceptionLogger, i18n as I18nService),
      new I18nValidationExceptionFilter({ detailedErrors: false }),
    );
    app.useGlobalInterceptors(new TransformInterceptor());
    const connection = app.get<Connection>(getConnectionToken());
    await connection.asPromise();

    logger.log('✅ MongoDB连接成功');
    logger.log(`📊 数据库: ${connection.name}`);
    const redisUrl = process.env.REDIS_URL!.trim();

    const probe = await assertRedisReachable(redisUrl);
    await probe.quit();
    logger.log('✅ Redis 连接成功');
    logger.log('⏳ 等待 BullMQ worker 就绪…')
    await waitForWorkerReady(redisUrl);

    logger.log('✅ Worker 已就绪');

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        exceptionFactory: i18nValidationErrorFactory,
      }),
    );
    app.enableCors({
      origin: true,
      credentials: true,
    });

    app.set('trust proxy', 1);
    app.setGlobalPrefix('api');

    const port = process.env.PORT || 3000;
    await app.listen(port, '0.0.0.0');
    const protocol = process.env.USE_HTTPS === 'true' ? 'https' : 'http';
    const hosts = getAccessibleHosts();
    const publicHost = hosts[0] || '127.0.0.1';
    logger.log(`🚀 API 服务已启动: ${protocol}://${publicHost}:${port}`);

    if (hosts.length > 1) {
      logger.log(`🌐 可访问地址: ${hosts.map((host) => `${protocol}://${host}:${port}`).join(', ')}`);
    }

    logger.log(`📋 日志目录: logs/`);
  } catch (error: unknown) {

    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(`❗ 应用启动失败: ${err.message}`);
    logger.error(err.stack);
    if (err.message?.includes('connect') || err.message?.includes('ECONNREFUSED')) {
      logger.error('💡 请确认 MongoDB / Redis / Worker 已启动');
    }
    process.exit(1);
  }
}



bootstrap();

