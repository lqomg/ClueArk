import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UsersModule } from '../users/users.module';
import { PasswordResetCode, PasswordResetCodeSchema } from './schemas/password-reset-code.schema';
import { RegisterEmailCode, RegisterEmailCodeSchema } from './schemas/register-email-code.schema';
import { LoginOtpCode, LoginOtpCodeSchema } from './schemas/login-otp-code.schema';
import { MailModule } from '../mail/mail.module';

/**
 * 认证核心：JWT、AuthService、守卫。无 HTTP Controller，供 API / Worker 共用。
 * 限流与 /auth 路由见 AuthModule（仅 AppModule 引入）。
 */
@Module({
  imports: [
    MailModule,
    MongooseModule.forFeature([
      { name: PasswordResetCode.name, schema: PasswordResetCodeSchema },
      { name: RegisterEmailCode.name, schema: RegisterEmailCodeSchema },
      { name: LoginOtpCode.name, schema: LoginOtpCodeSchema },
    ]),
    forwardRef(() => UsersModule),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard, JwtModule, PassportModule],
})
export class AuthCoreModule {}
