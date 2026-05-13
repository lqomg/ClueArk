import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument, type UserRole } from './schemas/user.schema';
import { USER_ROLE } from './user-role';
import { FALLBACK_APP_TIME_ZONE, isValidIanaTimeZone } from '../../common/utils/timezone.utils';

export interface CreateUserInput {
  email: string;
  password: string;
  username?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly config: ConfigService,
  ) {}

  async create(input: CreateUserInput): Promise<UserDocument> {
    const email = input.email.trim().toLowerCase();
    const exists = await this.userModel.exists({ email }).exec();
    if (exists) {
      throw new ConflictException('email_already_exists');
    }
    const username = (input.username?.trim() || (await this.generateUsernameFromEmail(email))).trim();
    const hashed = await bcrypt.hash(input.password, 10);
    const doc = new this.userModel({
      email,
      username,
      password: hashed,
    });
    return doc.save();
  }

  private async generateUsernameFromEmail(email: string): Promise<string> {
    const local = (email.split('@')[0] || 'user').replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 32) || 'user';
    let base = local;
    let candidate = base;
    let n = 0;
    while (await this.userModel.exists({ username: candidate }).exec()) {
      n += 1;
      candidate = `${base}_${n}`;
    }
    return candidate;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.trim().toLowerCase() }).select('+password').exec();
  }

  async findByUsername(username: string): Promise<UserDocument | null> {
    const trimmed = username.trim();
    if (!trimmed) return null;
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.userModel.findOne({ username: new RegExp(`^${escaped}$`, 'i') }).select('+password').exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  /** 解析用户 IANA 时区；缺省/非法时用 APP_DEFAULT_TIMEZONE 或 Asia/Shanghai */
  async getTimeZoneOrDefault(userId: string): Promise<string> {
    const raw = this.config.get<string>('APP_DEFAULT_TIMEZONE')?.trim();
    const fromEnv = raw && isValidIanaTimeZone(raw) ? raw : FALLBACK_APP_TIME_ZONE;
    const u = await this.findById(userId);
    if (!u) return fromEnv;
    const tz = typeof (u as UserDocument & { timeZone?: string }).timeZone === 'string'
      ? (u as UserDocument & { timeZone: string }).timeZone.trim()
      : '';
    if (tz && isValidIanaTimeZone(tz)) return tz;
    return fromEnv;
  }

  async updateProfile(userId: string, patch: { username?: string; timeZone?: string }): Promise<UserDocument> {
    const $set: Record<string, string> = {};
    if (patch.username != null && patch.username.trim()) {
      $set.username = patch.username.trim();
    }
    if (patch.timeZone != null) {
      const t = patch.timeZone.trim();
      if (!isValidIanaTimeZone(t)) {
        throw new BadRequestException('invalid_time_zone');
      }
      $set.timeZone = t;
    }
    if (!Object.keys($set).length) {
      const u = await this.findById(userId);
      if (!u) throw new NotFoundException('user_not_found');
      return u;
    }
    const updated = await this.userModel.findByIdAndUpdate(userId, { $set }, { new: true }).exec();
    if (!updated) throw new NotFoundException('user_not_found');
    return updated;
  }

  async validatePassword(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }

  async updatePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.userModel.findById(userId).select('+password').exec();
    if (!user) throw new NotFoundException('user_not_found');
    const plain = (user as UserDocument & { password?: string }).password;
    if (!plain) throw new BadRequestException('password_not_set');
    const ok = await this.validatePassword(oldPassword, plain);
    if (!ok) throw new UnauthorizedException('invalid_old_password');
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.userModel.updateOne({ _id: userId }, { $set: { password: hashed } }).exec();
  }

  async setPasswordByEmail(email: string, newPassword: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    const hashed = await bcrypt.hash(newPassword, 10);
    const res = await this.userModel.updateOne({ email: normalized }, { $set: { password: hashed } }).exec();
    if (res.matchedCount === 0) throw new NotFoundException('user_not_found');
  }

  async countByRole(role: UserRole): Promise<number> {
    return this.userModel.countDocuments({ role }).exec();
  }

  /**
   * 启动种子：仅当不存在任何 admin 时插入；若邮箱已被非管理员占用则抛错由上层记录日志。
   */
  async createSuperAdminIfMissing(email: string, plainPassword: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    const exists = await this.userModel.findOne({ email: normalized }).exec();
    if (exists) {
      if (exists.role === USER_ROLE.Admin) return;
      throw new ConflictException('admin_email_taken_by_user');
    }
    const hashed = await bcrypt.hash(plainPassword, 10);
    const username = await this.generateUsernameFromEmail(normalized);
    await this.userModel.create({
      email: normalized,
      username,
      password: hashed,
      role: USER_ROLE.Admin,
      isActive: true,
    });
  }

  /**
   * 演示账号种子：仅当该邮箱不存在时创建；若已被占用且非 demo 角色则抛错由上层记录日志。
   * 额外演示账号仍可在后台「用户管理」中创建。
   */
  async createDemoUserIfMissing(email: string, plainPassword: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    const exists = await this.userModel.findOne({ email: normalized }).exec();
    if (exists) {
      if (exists.role === USER_ROLE.Demo) return;
      throw new ConflictException('demo_email_taken_by_user');
    }
    const hashed = await bcrypt.hash(plainPassword, 10);
    const username = await this.generateUsernameFromEmail(normalized);
    await this.userModel.create({
      email: normalized,
      username,
      password: hashed,
      role: USER_ROLE.Demo,
      isActive: true,
    });
  }

  /** 管理员创建用户（含管理员/演示角色）；邮箱唯一。 */
  async createUserByAdmin(input: {
    email: string;
    password: string;
    username?: string;
    role: UserRole;
  }): Promise<UserDocument> {
    const email = input.email.trim().toLowerCase();
    const exists = await this.userModel.exists({ email }).exec();
    if (exists) {
      throw new ConflictException('email_already_exists');
    }
    const username = (input.username?.trim() || (await this.generateUsernameFromEmail(email))).trim();
    const hashed = await bcrypt.hash(input.password, 10);
    const doc = new this.userModel({
      email,
      username,
      password: hashed,
      role: input.role,
      isActive: true,
    });
    return doc.save();
  }

  async findByIdForAuth(
    id: string,
  ): Promise<{ _id: unknown; email: string; isActive: boolean; role: UserRole } | null> {
    return this.userModel.findById(id).select('email isActive role').lean().exec() as Promise<{
      _id: unknown;
      email: string;
      isActive: boolean;
      role: UserRole;
    } | null>;
  }

  async listUsersForAdmin(
    page: number,
    pageSize: number,
    search?: string,
  ): Promise<{ items: Record<string, unknown>[]; total: number; page: number; pageSize: number }> {
    const safePage = Math.max(1, page);
    const safeSize = Math.min(100, Math.max(1, pageSize));
    const skip = (safePage - 1) * safeSize;
    const q = (search ?? '').trim();
    const filter: Record<string, unknown> = {};
    if (q) {
      const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [{ email: new RegExp(esc, 'i') }, { username: new RegExp(esc, 'i') }];
    }
    const [items, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeSize)
        .lean()
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);
    return { items, total, page: safePage, pageSize: safeSize };
  }

  async setUserActive(requesterId: string, targetUserId: string, isActive: boolean): Promise<UserDocument> {
    if (requesterId === targetUserId && !isActive) {
      throw new BadRequestException('cannot_deactivate_self');
    }
    const updated = await this.userModel.findByIdAndUpdate(targetUserId, { $set: { isActive } }, { new: true }).exec();
    if (!updated) throw new NotFoundException('user_not_found');
    return updated;
  }
}
