import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, UpdateQuery } from 'mongoose';
import { randomInt } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
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
import { I18nContext } from 'nestjs-i18n';
import { normalizeLocale } from '../../common/utils/locale.utils';

const OTP_TTL_MS = 15 * 60_000;
const OTP_RESEND_MS = 60_000;
/** 同一邮箱验证码累计校验失败次数上限；达到后作废其全部有效验证码 */
const MAX_OTP_ATTEMPTS = 5;

/** 三类一次性验证码文档共有的字段，用于通用的原子消费逻辑 */
interface OtpCodeFields {
  email: string;
  code: string;
  expiresAt: Date;
  consumed: boolean;
  attempts: number;
}

@Injectable()
export class AuthService {
  private readonly logger: LoggerService;
  private googleClient: OAuth2Client | null = null;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
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

  /**
   * 原子校验并消费一次性验证码（防并发重复使用）。
   * 校验失败时对该邮箱所有有效验证码累加失败次数，达到上限即作废，防止暴力破解。
   * @returns 命中并成功消费返回 true，否则 false。
   */
  private async consumeOtpCode<T extends OtpCodeFields>(
    model: Model<T>,
    email: string,
    code: string,
  ): Promise<boolean> {
    const now = new Date();
    const consumed = await model
      .findOneAndUpdate(
        {
          email,
          code: code.trim(),
          consumed: false,
          expiresAt: { $gt: now },
          attempts: { $lt: MAX_OTP_ATTEMPTS },
        } as FilterQuery<T>,
        { $set: { consumed: true } } as UpdateQuery<T>,
        { sort: { createdAt: -1 }, new: true },
      )
      .exec();
    if (consumed) {
      return true;
    }
    await model
      .updateMany(
        { email, consumed: false, expiresAt: { $gt: now } } as FilterQuery<T>,
        { $inc: { attempts: 1 } } as UpdateQuery<T>,
      )
      .exec();
    await model
      .updateMany(
        { email, consumed: false, attempts: { $gte: MAX_OTP_ATTEMPTS } } as FilterQuery<T>,
        { $set: { consumed: true } } as UpdateQuery<T>,
      )
      .exec();
    return false;
  }

  private resolveRequestLang(): string {
    return normalizeLocale(I18nContext.current()?.lang);
  }

  private async deliverOtpEmail(to: string, code: string, scene: OtpMailScene): Promise<void> {
    const lang = this.resolveRequestLang();
    if (!this.mailService.isConfigured()) {
      this.logger.warn(
        `[mail disabled] scene=${scene} email=${to} lang=${lang} code=${code}（15 分钟内有效，未实际发信）`,
      );
      return;
    }
    try {
      await this.mailService.sendOtpEmail({ to, code, scene, lang });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`mail_send_failed scene=${scene} to=${to} err=${msg}`);
      throw new ServiceUnavailableException('mail_send_failed');
    }
  }

  async validateUser(account: string, password: string): Promise<UserDocument | null> {
    const trimmed = account.trim();
    if (!trimmed) return null;
    // 仅支持邮箱登录（用户名无唯一约束，禁止用作登录凭据）
    const user = await this.usersService.findByEmail(trimmed);
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
    const locale = normalizeLocale(
      typeof userObject.locale === 'string' ? userObject.locale : undefined,
    );
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        _id: userId,
        id: userId,
        email: userObject.email,
        username: userObject.username,
        role,
        timeZone,
        locale,
        isActive: userObject.isActive,
        createdAt: userObject.createdAt,
        updatedAt: userObject.updatedAt,
      },
    };
  }

  /** 邮箱 + 密码，一步签发 JWT */
  /** Google idToken 登录：校验后按 googleSub / 邮箱查找或创建用户 */
  async loginWithGoogle(idToken: string) {
    const payload = await this.verifyGoogleIdToken(idToken);
    const email = payload.email?.trim().toLowerCase();
    const googleSub = payload.sub?.trim();
    if (!email || !googleSub) {
      throw new UnauthorizedException('invalid_google_token');
    }
    if (payload.email_verified !== true) {
      throw new UnauthorizedException('google_email_unverified');
    }

    let user = await this.usersService.findByGoogleSub(googleSub);
    if (!user) {
      const byEmail = await this.usersService.findByEmail(email);
      if (byEmail) {
        if (byEmail.isActive === false) {
          throw new UnauthorizedException('invalid_credentials');
        }
        const plain = toPlainObject(byEmail) as { googleSub?: string };
        if (plain.googleSub && plain.googleSub !== googleSub) {
          throw new ConflictException('google_account_conflict');
        }
        user = plain.googleSub
          ? byEmail
          : await this.usersService.bindGoogleSub(String(byEmail._id), googleSub);
      } else {
        const lang = I18nContext.current()?.lang;
        user = await this.usersService.createFromGoogle({
          email,
          googleSub,
          locale: normalizeLocale(lang),
        });
      }
    }

    if (user.isActive === false) {
      throw new UnauthorizedException('invalid_credentials');
    }
    this.logger.log(`Google login: ${email}`);
    return this.login(user);
  }

  private getGoogleOAuthClient(): OAuth2Client {
    if (this.googleClient) return this.googleClient;
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID')?.trim();
    if (!clientId) {
      throw new ServiceUnavailableException('google_not_configured');
    }
    this.googleClient = new OAuth2Client(clientId);
    return this.googleClient;
  }

  private async verifyGoogleIdToken(idToken: string): Promise<{
    sub?: string;
    email?: string;
    email_verified?: boolean;
  }> {
    const token = idToken.trim();
    if (!token) {
      throw new UnauthorizedException('invalid_google_token');
    }
    try {
      const client = this.getGoogleOAuthClient();
      const clientId = this.config.get<string>('GOOGLE_CLIENT_ID')!.trim();
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: clientId,
      });
      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('invalid_google_token');
      }
      return payload;
    } catch (e) {
      if (e instanceof HttpException) throw e;
      throw new UnauthorizedException('invalid_google_token');
    }
  }

  async loginWithPassword(account: string, password: string) {
    const normalized = account.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalized);
    if (!user) {
      throw new BadRequestException('email_not_registered');
    }
    if (user.isActive === false) {
      throw new UnauthorizedException('invalid_credentials');
    }
    const plain = toPlainObject(user);
    if (!plain.password) {
      throw new UnauthorizedException('invalid_credentials');
    }
    const ok = await this.usersService.validatePassword(password, plain.password as string);
    if (!ok) {
      throw new UnauthorizedException('invalid_credentials');
    }
    return this.login(user);
  }

  /** 向已注册邮箱发送「验证码登录」用 OTP */
  async sendLoginOtpCode(email: string): Promise<{ ok: true }> {
    const normalized = email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalized);
    if (!user) {
      throw new BadRequestException('email_not_registered');
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
      await this.deliverOtpEmail(normalized, code, 'login_otp');
    } catch (e) {
      await doc.deleteOne().exec();
      throw e;
    }
    return { ok: true };
  }

  /** 邮箱 + 6 位验证码登录（无密码） */
  async loginWithOtp(email: string, code: string) {
    const normalized = email.trim().toLowerCase();
    const ok = await this.consumeOtpCode(this.loginOtpCodeModel, normalized, code);
    if (!ok) {
      throw new UnauthorizedException('invalid_credentials');
    }
    const user = await this.usersService.findByEmail(normalized);
    if (!user || user.isActive === false) {
      throw new UnauthorizedException('invalid_credentials');
    }
    return this.login(user);
  }

  async sendRegisterCode(email: string): Promise<{ ok: true }> {
    const normalized = email.trim().toLowerCase();
    // 邮箱已注册：静默成功且不发码，避免邮箱枚举（与登录/重置发码行为一致）
    const exists = await this.usersService.findByEmail(normalized);
    if (exists) {
      return { ok: true };
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
      await this.deliverOtpEmail(normalized, code, 'register');
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
    // 先校验验证码：无论邮箱是否已注册，验证码错误均返回相同错误，避免枚举。
    // 已注册邮箱不会收到验证码，故此处必然失败；存在性最终由 create() 兜底校验。
    const regOk = await this.consumeOtpCode(this.registerCodeModel, normalized, dto.code);
    if (!regOk) {
      throw new BadRequestException('invalid_or_expired_code');
    }

    const lang = I18nContext.current()?.lang;
    const user = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      locale: normalizeLocale(lang),
    });
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
      await this.deliverOtpEmail(normalized, code, 'password_reset');
    } catch (e) {
      await doc.deleteOne().exec();
      throw e;
    }
    return { ok: true };
  }

  async resetPasswordWithCode(email: string, code: string, newPassword: string): Promise<{ ok: true }> {
    const normalized = email.trim().toLowerCase();
    const ok = await this.consumeOtpCode(this.resetCodeModel, normalized, code);
    if (!ok) {
      throw new BadRequestException('invalid_or_expired_code');
    }
    await this.usersService.setPasswordByEmail(normalized, newPassword);
    return { ok: true };
  }
}
