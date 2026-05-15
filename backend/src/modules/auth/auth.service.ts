import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomInt } from 'crypto';
import { UsersService } from '../users/users.service';
import { LoggerService } from '../logger/logger.service';
import { MailService, type OtpMailScene } from '../mail/mail.service';
import { toPlainObject } from '../../common/utils';
import type { UserDocument } from '../users/schemas/user.schema';
import { USER_ROLE } from '../users/user-role';
import { PasswordResetCode, PasswordResetCodeDocument } from './schemas/password-reset-code.schema';
import { RegisterEmailCode, RegisterEmailCodeDocument } from './schemas/register-email-code.schema';
import { LoginOtpCode, LoginOtpCodeDocument } from './schemas/login-otp-code.schema';
import type { RegisterDto } from './dto/register.dto';

const OTP_TTL_MS = 15 * 60_000;
const OTP_RESEND_MS = 60_000;

@Injectable()
export class AuthService {
  private readonly logger: LoggerService;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    @InjectModel(PasswordResetCode.name) private readonly resetCodeModel: Model<PasswordResetCodeDocument>,
    @InjectModel(RegisterEmailCode.name) private readonly registerCodeModel: Model<RegisterEmailCodeDocument>,
    @InjectModel(LoginOtpCode.name) private readonly loginOtpCodeModel: Model<LoginOtpCodeDocument>,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createLogger(AuthService.name);
  }

  private makeSixDigitCode(): string {
    return String(randomInt(0, 1_000_000)).padStart(6, '0');
  }

  private async deliverOtpEmail(to: string, subject: string, code: string, scene: OtpMailScene): Promise<void> {
    if (!this.mailService.isConfigured()) {
      this.logger.warn(
        `[mail disabled] scene=${scene} email=${to} subject=${subject} code=${code}（15 分钟内有效，未实际发信）`,
      );
      return;
    }
    try {
      await this.mailService.sendOtpEmail({ to, subject, code, scene });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`mail_send_failed scene=${scene} to=${to} err=${msg}`);
      throw new ServiceUnavailableException('mail_send_failed');
    }
  }

  async validateUser(account: string, password: string): Promise<UserDocument | null> {
    const trimmed = account.trim();
    if (!trimmed) return null;
    const user = trimmed.includes('@')
      ? await this.usersService.findByEmail(trimmed)
      : await this.usersService.findByUsername(trimmed);
    if (!user) {
      return null;
    }
    const plain = toPlainObject(user);
    if (!plain.password) {
      return null;
    }
    const ok = await this.usersService.validatePassword(password, plain.password as string);
    if (!ok) {
      return null;
    }
    return user;
  }

  login(user: UserDocument) {
    const userObject = toPlainObject(user as UserDocument) as unknown as Record<string, unknown>;
    const userId = String(userObject._id);
    this.logger.log(`User login: ${userObject.email}`);
    const role = (userObject.role as string) || USER_ROLE.User;
    const payload = { email: userObject.email as string, sub: userId, role };
    const timeZone =
      typeof userObject.timeZone === 'string' && userObject.timeZone.trim()
        ? userObject.timeZone.trim()
        : 'Asia/Shanghai';
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        _id: userId,
        id: userId,
        email: userObject.email,
        username: userObject.username,
        role,
        timeZone,
        isActive: userObject.isActive,
        createdAt: userObject.createdAt,
        updatedAt: userObject.updatedAt,
      },
    };
  }

  /** 账号 + 密码，一步签发 JWT */
  async loginWithPassword(account: string, password: string) {
    const user = await this.validateUser(account, password);
    if (!user || user.isActive === false) {
      throw new UnauthorizedException('invalid_credentials');
    }
    return this.login(user);
  }

  /**
   * 向已注册邮箱发送「验证码登录」用 OTP；未注册邮箱静默成功（防枚举）。
   */
  async sendLoginOtpCode(email: string): Promise<{ ok: true }> {
    const normalized = email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalized);
    if (!user) {
      return { ok: true };
    }
    const recent = await this.loginOtpCodeModel.findOne({ email: normalized }).sort({ createdAt: -1 }).lean().exec();
    const recentCreated = recent && 'createdAt' in recent ? (recent as { createdAt?: Date }).createdAt : undefined;
    if (recentCreated) {
      const delta = Date.now() - new Date(recentCreated).getTime();
      if (delta < OTP_RESEND_MS) {
        throw new HttpException('login_otp_rate_limited', HttpStatus.TOO_MANY_REQUESTS);
      }
    }
    const code = this.makeSixDigitCode();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    const doc = await this.loginOtpCodeModel.create({
      email: normalized,
      code,
      expiresAt,
      consumed: false,
    });
    try {
      await this.deliverOtpEmail(normalized, 'ClueArk 验证码登录', code, 'login_otp');
    } catch (e) {
      await doc.deleteOne().exec();
      throw e;
    }
    return { ok: true };
  }

  /** 邮箱 + 6 位验证码登录（无密码） */
  async loginWithOtp(email: string, code: string) {
    const normalized = email.trim().toLowerCase();
    const doc = await this.loginOtpCodeModel
      .findOne({
        email: normalized,
        code: code.trim(),
        consumed: false,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 })
      .exec();
    if (!doc) {
      throw new UnauthorizedException('invalid_credentials');
    }
    doc.consumed = true;
    await doc.save();

    const user = await this.usersService.findByEmail(normalized);
    if (!user || user.isActive === false) {
      throw new UnauthorizedException('invalid_credentials');
    }
    return this.login(user);
  }

  async sendRegisterCode(email: string): Promise<{ ok: true }> {
    const normalized = email.trim().toLowerCase();
    const exists = await this.usersService.findByEmail(normalized);
    if (exists) {
      throw new ConflictException('email_already_exists');
    }
    const recent = await this.registerCodeModel.findOne({ email: normalized }).sort({ createdAt: -1 }).lean().exec();
    const recentCreated = recent && 'createdAt' in recent ? (recent as { createdAt?: Date }).createdAt : undefined;
    if (recentCreated) {
      const delta = Date.now() - new Date(recentCreated).getTime();
      if (delta < OTP_RESEND_MS) {
        throw new HttpException('register_code_rate_limited', HttpStatus.TOO_MANY_REQUESTS);
      }
    }
    const code = this.makeSixDigitCode();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    const doc = await this.registerCodeModel.create({
      email: normalized,
      code,
      expiresAt,
      consumed: false,
    });
    try {
      await this.deliverOtpEmail(normalized, 'ClueArk 注册验证码', code, 'register');
    } catch (e) {
      await doc.deleteOne().exec();
      throw e;
    }
    return { ok: true };
  }

  async register(dto: RegisterDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('password_mismatch');
    }
    const normalized = dto.email.trim().toLowerCase();
    const exists = await this.usersService.findByEmail(normalized);
    if (exists) {
      throw new ConflictException('email_already_exists');
    }
    const regDoc = await this.registerCodeModel
      .findOne({
        email: normalized,
        code: dto.code.trim(),
        consumed: false,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 })
      .exec();
    if (!regDoc) {
      throw new BadRequestException('invalid_or_expired_code');
    }
    regDoc.consumed = true;
    await regDoc.save();

    const user = await this.usersService.create({ email: dto.email, password: dto.password });
    return this.login(user);
  }

  async sendPasswordResetCode(email: string): Promise<{ ok: true }> {
    const normalized = email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalized);
    if (!user) {
      return { ok: true };
    }
    const recent = await this.resetCodeModel.findOne({ email: normalized }).sort({ createdAt: -1 }).lean().exec();
    const recentCreated = recent && 'createdAt' in recent ? (recent as { createdAt?: Date }).createdAt : undefined;
    if (recentCreated) {
      const delta = Date.now() - new Date(recentCreated).getTime();
      if (delta < OTP_RESEND_MS) {
        throw new HttpException('reset_code_rate_limited', HttpStatus.TOO_MANY_REQUESTS);
      }
    }
    const code = this.makeSixDigitCode();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    const doc = await this.resetCodeModel.create({
      email: normalized,
      code,
      expiresAt,
      consumed: false,
    });
    try {
      await this.deliverOtpEmail(normalized, 'ClueArk 重置密码验证码', code, 'password_reset');
    } catch (e) {
      await doc.deleteOne().exec();
      throw e;
    }
    return { ok: true };
  }

  async resetPasswordWithCode(email: string, code: string, newPassword: string): Promise<{ ok: true }> {
    const normalized = email.trim().toLowerCase();
    const doc = await this.resetCodeModel
      .findOne({
        email: normalized,
        code: code.trim(),
        consumed: false,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 })
      .exec();
    if (!doc) {
      throw new BadRequestException('invalid_or_expired_code');
    }
    await this.usersService.setPasswordByEmail(normalized, newPassword);
    doc.consumed = true;
    await doc.save();
    return { ok: true };
  }
}
