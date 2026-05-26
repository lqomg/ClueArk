import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthCoreModule } from './auth-core.module';
import { AuthController } from './auth.controller';

/** HTTP 认证路由（含 Throttler）；Worker 勿 import 本模块。 */
@Module({
  imports: [
    AuthCoreModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),
  ],
  controllers: [AuthController],
})
export class AuthModule {}
