import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { PasswordResetCode, PasswordResetCodeSchema } from './schemas/password-reset-code.schema';
import { RegisterEmailCode, RegisterEmailCodeSchema } from './schemas/register-email-code.schema';
import { LoginOtpCode, LoginOtpCodeSchema } from './schemas/login-otp-code.schema';
import { MailModule } from '../mail/mail.module';
import { AuthGuardsModule } from './auth-guards.module';

/**
 * 认证核心：AuthService + JWT 守卫。无 HTTP Controller，供 API / Worker 共用。
 * 限流与 /auth 路由见 AuthModule（仅 AppModule 引入）。
 */
@Module({
  imports: [
    AuthGuardsModule,
    MailModule,
    UsersModule,
    MongooseModule.forFeature([
      { name: PasswordResetCode.name, schema: PasswordResetCodeSchema },
      { name: RegisterEmailCode.name, schema: RegisterEmailCodeSchema },
      { name: LoginOtpCode.name, schema: LoginOtpCodeSchema },
    ]),
  ],
  providers: [AuthService],
  exports: [AuthService, AuthGuardsModule],
})
export class AuthCoreModule {}
