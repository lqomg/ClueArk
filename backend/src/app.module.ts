import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SourcesModule } from './modules/sources/sources.module';
import { FeedItemsModule } from './modules/feed-items/feed-items.module';
import { AdminModule } from './modules/admin/admin.module';
import { MonitorsModule } from './modules/monitors/monitors.module';
import { LoggerModule } from './modules/logger/logger.module';
import { HttpLoggerMiddleware } from './common/middleware/http-logger.middleware';
import { LoggerService } from './modules/logger/logger.service';
import { HealthController } from './common/health.controller';
import { AcceptLanguageResolver, HeaderResolver, I18nModule, QueryResolver } from 'nestjs-i18n';
import { join } from 'path';

function buildMongoConnectionString(): string {
  const host = process.env.MONGODB_HOST || 'localhost';
  const port = process.env.MONGODB_PORT || '27017';
  const database = process.env.MONGODB_DATABASE || 'app';
  const username = process.env.MONGODB_USERNAME;
  const password = process.env.MONGODB_PASSWORD;
  const authSource = 'admin';
  if (username && password) {
    const encodedUsername = encodeURIComponent(username);
    const encodedPassword = encodeURIComponent(password);
    return `mongodb://${encodedUsername}:${encodedPassword}@${host}:${port}/${database}?authSource=${authSource}`;
  }
  return `mongodb://${host}:${port}/${database}`;
}

@Module({
  imports: [
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      fallbacks: {
        'en-*': 'en',
        'zh': 'zh-CN',
        'zh-*': 'zh-CN',
        'ja': 'ja',
        'ja-*': 'ja',
        'ko': 'ko',
        'ko-*': 'ko',
      },
      loaderOptions: {
        path: join(__dirname, '/i18n/'),
        watch: true,
      },
      resolvers: [
        new HeaderResolver(['x-lang', 'lang']),
        new AcceptLanguageResolver(),
        new QueryResolver(['lang']),
      ],
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
    }),
    LoggerModule,
    MongooseModule.forRoot(buildMongoConnectionString()),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    UsersModule,
    AuthModule,
    SourcesModule,
    ScheduleModule.forRoot(),
    FeedItemsModule,
    MonitorsModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggerMiddleware).forRoutes('*');
  }
}
