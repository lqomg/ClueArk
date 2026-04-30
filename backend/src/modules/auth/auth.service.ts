import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomInt } from 'crypto';
import { UsersService } from '../users/users.service';
import { LoggerService } from '../logger/logger.service';
import { toPlainObject } from '../../common/utils';
import type { UserDocument } from '../users/schemas/user.schema';
import { PasswordResetCode, PasswordResetCodeDocument } from './schemas/password-reset-code.schema';
import type { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly logger: LoggerService;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectModel(PasswordResetCode.name) private readonly resetCodeModel: Model<PasswordResetCodeDocument>,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createLogger(AuthService.name);
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
    const role = (userObject.role as string) || 'user';
    const payload = { email: userObject.email as string, sub: userId, role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        _id: userId,
        id: userId,
        email: userObject.email,
        username: userObject.username,
        role,
        isActive: userObject.isActive,
        createdAt: userObject.createdAt,
        updatedAt: userObject.updatedAt,
      },
    };
  }

  async register(dto: RegisterDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('password_mismatch');
    }
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
      if (delta < 60_000) {
        throw new HttpException('reset_code_rate_limited', HttpStatus.TOO_MANY_REQUESTS);
      }
    }
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const expiresAt = new Date(Date.now() + 15 * 60_000);
    await this.resetCodeModel.create({
      email: normalized,
      code,
      expiresAt,
      consumed: false,
    });
    this.logger.warn(`[MVP] 密码重置验证码 email=${normalized} code=${code}（15分钟内有效，生产环境请改为邮件发送）`);
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
