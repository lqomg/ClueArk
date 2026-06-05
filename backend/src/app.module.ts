import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';

import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from './modules/auth/auth.module';

import { UsersModule } from './modules/users/users.module';
import { UserPreferencesModule } from './modules/users/user-preferences.module';

import { SourcesModule } from './modules/sources/sources.module';

import { FeedItemsModule } from './modules/feed-items/feed-items.module';

import { AdminModule } from './modules/admin/admin.module';

import { MonitorsModule } from './modules/monitors/monitors.module';

import { DashboardModule } from './modules/dashboard/dashboard.module';

import { LoggerModule } from './modules/logger/logger.module';

import { HttpLoggerMiddleware } from './common/middleware/http-logger.middleware';

import { LoggerService } from './modules/logger/logger.service';

import { HealthController } from './common/health.controller';

import { HealthService } from './common/health.service';

import { VectorStoreModule } from './modules/vector-store/vector-store.module';

import { JobCenterCoreModule } from './modules/job-center/job-center-core.module';

import { NotificationsModule } from './modules/notifications/notifications.module';

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

    VectorStoreModule,

    JobCenterCoreModule,

    UserPreferencesModule,

    NotificationsModule,

    UsersModule,

    AuthModule,

    SourcesModule,

    FeedItemsModule,

    MonitorsModule,

    DashboardModule,

    AdminModule,

  ],

  controllers: [HealthController],

  providers: [LoggerService, HealthService],

  exports: [LoggerService],

})

export class AppModule implements NestModule {

  configure(consumer: MiddlewareConsumer) {

    consumer.apply(HttpLoggerMiddleware).forRoutes('*');

  }

}

