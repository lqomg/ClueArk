import {
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  LoginDto,
  GoogleLoginDto,
  LoginOtpDto,
  RegisterDto,
  ResetPasswordDto,
  SendRegisterCodeDto,
  SendResetCodeDto,
} from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.loginWithPassword(dto.account, dto.password);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('google')
  loginWithGoogle(@Body() dto: GoogleLoginDto) {
    return this.authService.loginWithGoogle(dto.idToken);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login/send-code')
  sendLoginCode(@Body() dto: SendResetCodeDto) {
    return this.authService.sendLoginOtpCode(dto.email);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('login/otp')
  loginOtp(@Body() dto: LoginOtpDto) {
    return this.authService.loginWithOtp(dto.email, dto.code);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register/send-code')
  sendRegisterCode(@Body() dto: SendRegisterCodeDto) {
    return this.authService.sendRegisterCode(dto.email);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('password-reset/send-code')
  sendResetCode(@Body() dto: SendResetCodeDto) {
    return this.authService.sendPasswordResetCode(dto.email);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('password-reset/confirm')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPasswordWithCode(dto.email, dto.code, dto.newPassword);
  }
}
