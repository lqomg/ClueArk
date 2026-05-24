import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CrawlModule } from './crawl/crawl.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
    }),
    CrawlModule,
  ],
})
export class AppModule {}
