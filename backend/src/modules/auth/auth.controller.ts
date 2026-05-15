import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  LoginDto,
  LoginOtpDto,
  RegisterDto,
  ResetPasswordDto,
  SendRegisterCodeDto,
  SendResetCodeDto,
} from './dto';
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
    try {
      return await this.authService.loginWithPassword(dto.account, dto.password);
    } catch (e: unknown) {
      if (e instanceof UnauthorizedException) {
        throw new HttpException(this.i18n.t('error.invalid_credentials'), HttpStatus.UNAUTHORIZED);
      }
      if (e instanceof ServiceUnavailableException) {
        throw e;
      }
      this.logger.error(`login error: ${e instanceof Error ? e.message : String(e)}`);
      throw new HttpException(this.i18n.t('error.internal_error'), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login/send-code')
  async sendLoginCode(@Body() dto: SendResetCodeDto) {
    try {
      return await this.authService.sendLoginOtpCode(dto.email);
    } catch (e: unknown) {
      if (e instanceof ServiceUnavailableException) {
        throw e;
      }
      if (e instanceof HttpException) {
        throw e;
      }
      this.logger.error(`sendLoginCode error: ${e instanceof Error ? e.message : String(e)}`);
      throw new HttpException(this.i18n.t('error.internal_error'), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('login/otp')
  async loginOtp(@Body() dto: LoginOtpDto) {
    try {
      return await this.authService.loginWithOtp(dto.email, dto.code);
    } catch (e: unknown) {
      if (e instanceof UnauthorizedException) {
        throw new HttpException(this.i18n.t('error.invalid_credentials'), HttpStatus.UNAUTHORIZED);
      }
      this.logger.error(`loginOtp error: ${e instanceof Error ? e.message : String(e)}`);
      throw new HttpException(this.i18n.t('error.internal_error'), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register/send-code')
  async sendRegisterCode(@Body() dto: SendRegisterCodeDto) {
    try {
      return await this.authService.sendRegisterCode(dto.email);
    } catch (e: unknown) {
      if (e instanceof ConflictException) {
        throw new HttpException(this.i18n.t('error.account_already_exists'), HttpStatus.CONFLICT);
      }
      if (e instanceof ServiceUnavailableException) {
        throw e;
      }
      if (e instanceof HttpException) {
        throw e;
      }
      this.logger.error(`sendRegisterCode error: ${e instanceof Error ? e.message : String(e)}`);
      throw new HttpException(this.i18n.t('error.internal_error'), HttpStatus.INTERNAL_SERVER_ERROR);
    }
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
      if (e instanceof ServiceUnavailableException) {
        throw e;
      }
      this.logger.error(`register error: ${e instanceof Error ? e.message : String(e)}`);
      throw new HttpException(this.i18n.t('error.internal_error'), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('password-reset/send-code')
  async sendResetCode(@Body() dto: SendResetCodeDto) {
    try {
      return await this.authService.sendPasswordResetCode(dto.email);
    } catch (e: unknown) {
      if (e instanceof ServiceUnavailableException) {
        throw e;
      }
      if (e instanceof HttpException) {
        throw e;
      }
      this.logger.error(`sendResetCode error: ${e instanceof Error ? e.message : String(e)}`);
      throw new HttpException(this.i18n.t('error.internal_error'), HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('password-reset/confirm')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPasswordWithCode(dto.email, dto.code, dto.newPassword);
  }
}
