import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, ResetPasswordDto, SendResetCodeDto } from './dto';
import { LoggerService } from '../logger';
import { I18nService } from 'nestjs-i18n';

@Controller('auth')
export class AuthController {
  private readonly logger: LoggerService;

  constructor(
    private readonly authService: AuthService,
    private readonly i18n: I18nService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createLogger(AuthController.name);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(dto.account, dto.password);
    if (!user || user.isActive === false) {
      throw new HttpException(this.i18n.t('error.invalid_credentials'), HttpStatus.UNAUTHORIZED);
    }
    return this.authService.login(user);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    try {
      return await this.authService.register(dto);
    } catch (e: unknown) {
      if (e instanceof BadRequestException) {
        throw e;
      }
      if (e instanceof ConflictException) {
        throw new HttpException(this.i18n.t('error.account_already_exists'), HttpStatus.CONFLICT);
      }
      this.logger.error(`register error: ${e instanceof Error ? e.message : String(e)}`);
      throw new HttpException(this.i18n.t('error.internal_error'), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('password-reset/send-code')
  async sendResetCode(@Body() dto: SendResetCodeDto) {
    return this.authService.sendPasswordResetCode(dto.email);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('password-reset/confirm')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPasswordWithCode(dto.email, dto.code, dto.newPassword);
  }
}
