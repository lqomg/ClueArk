import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument, type UserRole } from './schemas/user.schema';
import { USER_ROLE } from './user-role';
import { isValidIanaTimeZone } from '../../common/utils/timezone.utils';
import { normalizeLocale, resolveAppDefaultLocale } from '../../common/utils/locale.utils';

export interface CreateUserInput {
  email: string;
  password: string;
  username?: string;
  locale?: string;
}

export interface CreateGoogleUserInput {
  email: string;
  googleSub: string;
  locale?: string;
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
    const defaultLocale = resolveAppDefaultLocale(this.config.get<string>('APP_DEFAULT_LOCALE'));
    const locale = input.locale != null ? normalizeLocale(input.locale) : defaultLocale;
    const doc = new this.userModel({
      email,
      username,
      password: hashed,
      locale,
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

  async findByGoogleSub(googleSub: string): Promise<UserDocument | null> {
    const sub = googleSub.trim();
    if (!sub) return null;
    return this.userModel.findOne({ googleSub: sub }).exec();
  }

  async createFromGoogle(input: CreateGoogleUserInput): Promise<UserDocument> {
    const email = input.email.trim().toLowerCase();
    const googleSub = input.googleSub.trim();
    const exists = await this.userModel.exists({ email }).exec();
    if (exists) {
      throw new ConflictException('email_already_exists');
    }
    const subTaken = await this.userModel.exists({ googleSub }).exec();
    if (subTaken) {
      throw new ConflictException('google_account_conflict');
    }
    const username = await this.generateUsernameFromEmail(email);
    const defaultLocale = resolveAppDefaultLocale(this.config.get<string>('APP_DEFAULT_LOCALE'));
    const locale = input.locale != null ? normalizeLocale(input.locale) : defaultLocale;
    const doc = new this.userModel({
      email,
      username,
      googleSub,
      locale,
    });
    return doc.save();
  }

  async bindGoogleSub(userId: string, googleSub: string): Promise<UserDocument> {
    const sub = googleSub.trim();
    const conflict = await this.userModel
      .findOne({ googleSub: sub, _id: { $ne: userId } })
      .select('_id')
      .lean()
      .exec();
    if (conflict) {
      throw new ConflictException('google_account_conflict');
    }
    const updated = await this.userModel
      .findByIdAndUpdate(userId, { $set: { googleSub: sub } }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('user_not_found');
    return updated;
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async updateProfile(
    userId: string,
    patch: { username?: string; timeZone?: string; locale?: string },
  ): Promise<{ user: UserDocument; localeChanged: boolean }> {
    const $set: Record<string, string> = {};
    let localeChanged = false;
    const existing = await this.findById(userId);
    if (!existing) throw new NotFoundException('user_not_found');
    const prevLocale = normalizeLocale((existing as UserDocument & { locale?: string }).locale);
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
    if (patch.locale != null) {
      const next = normalizeLocale(patch.locale);
      if (next !== prevLocale) localeChanged = true;
      $set.locale = next;
    }
    if (!Object.keys($set).length) {
      return { user: existing, localeChanged: false };
    }
    const updated = await this.userModel.findByIdAndUpdate(userId, { $set }, { new: true }).exec();
    if (!updated) throw new NotFoundException('user_not_found');
    return { user: updated, localeChanged };
  }

  async validatePassword(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }

  async updatePassword(userId: string, oldPassword: string, newPassword: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).select('+password').exec();
    if (!user) throw new NotFoundException('user_not_found');
    const plain = (user as UserDocument & { password?: string }).password;
    if (!plain) throw new BadRequestException('password_not_set');
    const ok = await this.validatePassword(oldPassword, plain);
    if (!ok) throw new UnauthorizedException('invalid_old_password');
    const hashed = await bcrypt.hash(newPassword, 10);
    // 记录变更时间以使旧 JWT 失效
    await this.userModel
      .updateOne({ _id: userId }, { $set: { password: hashed, passwordChangedAt: new Date() } })
      .exec();
    return user;
  }

  async setPasswordByEmail(email: string, newPassword: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    const hashed = await bcrypt.hash(newPassword, 10);
    // 记录变更时间以使旧 JWT 失效
    const res = await this.userModel
      .updateOne({ email: normalized }, { $set: { password: hashed, passwordChangedAt: new Date() } })
      .exec();
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

  /** 管理员创建用户；邮箱唯一。 */
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

  async findManyByIds(ids: string[]): Promise<Array<{ id: string; email: string; username: string }>> {
    const oids = ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
    if (!oids.length) return [];
    const rows = await this.userModel
      .find({ _id: { $in: oids } })
      .select('email username')
      .lean()
      .exec();
    return rows.map((r) => ({
      id: String(r._id),
      email: String(r.email ?? ''),
      username: String(r.username ?? ''),
    }));
  }

  async findIdsByEmailSearch(emailPart: string): Promise<string[]> {
    const q = emailPart.trim();
    if (!q) return [];
    const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rows = await this.userModel
      .find({ email: new RegExp(esc, 'i') })
      .select('_id')
      .lean()
      .exec();
    return rows.map((r) => String(r._id));
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
