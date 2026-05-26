import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { VectorStoreModule } from './modules/vector-store/vector-store.module';
import { JobCenterCoreModule } from './modules/job-center/job-center-core.module';
import { JobCenterWorkerModule } from './modules/job-center/job-center-worker.module';
import { MonitorPipelineModule } from './modules/monitor-pipeline/monitor-pipeline.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { FeedItemsModule } from './modules/feed-items/feed-items.module';
import { MonitorsModule } from './modules/monitors/monitors.module';
import { LlmModule } from './modules/llm/llm.module';
import { UsersModule } from './modules/users/users.module';
import { LoggerModule } from './modules/logger/logger.module';

function buildMongoConnectionString(): string {
  const host = process.env.MONGODB_HOST || 'localhost';
  const port = process.env.MONGODB_PORT || '27017';
  const database = process.env.MONGODB_DATABASE || 'app';
  const username = process.env.MONGODB_USERNAME;
  const password = process.env.MONGODB_PASSWORD;
  if (username && password) {
    return `mongodb://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${database}?authSource=admin`;
  }
  return `mongodb://${host}:${port}/${database}`;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
    }),
    LoggerModule,
    MongooseModule.forRoot(buildMongoConnectionString()),
    VectorStoreModule,
    JobCenterCoreModule,
    LlmModule,
    UsersModule,
    FeedItemsModule,
    NotificationsModule,
    MonitorPipelineModule,
    MonitorsModule,
    JobCenterWorkerModule,
  ],
})
export class WorkerModule {}
