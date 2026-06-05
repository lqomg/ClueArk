import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FALLBACK_APP_TIME_ZONE, isValidIanaTimeZone } from '../../common/utils/timezone.utils';
import {
  normalizeLocale,
  resolveAppDefaultLocale,
  type SupportedLocale,
} from '../../common/utils/locale.utils';
import { User, UserDocument } from './schemas/user.schema';

/** 只读用户时区 / 语言偏好，供 Monitors、Notifications 等模块使用，避免依赖 UsersModule。 */
@Injectable()
export class UserPreferencesService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly config: ConfigService,
  ) {}

  async getTimeZoneOrDefault(userId: string): Promise<string> {
    const raw = this.config.get<string>('APP_DEFAULT_TIMEZONE')?.trim();
    const fromEnv = raw && isValidIanaTimeZone(raw) ? raw : FALLBACK_APP_TIME_ZONE;
    const u = await this.userModel.findById(userId).select('timeZone').lean().exec();
    if (!u) return fromEnv;
    const tz = typeof u.timeZone === 'string' ? u.timeZone.trim() : '';
    if (tz && isValidIanaTimeZone(tz)) return tz;
    return fromEnv;
  }

  async getLocaleOrDefault(userId: string): Promise<SupportedLocale> {
    const fromEnv = resolveAppDefaultLocale(this.config.get<string>('APP_DEFAULT_LOCALE'));
    const u = await this.userModel.findById(userId).select('locale').lean().exec();
    if (!u) return fromEnv;
    const loc = typeof u.locale === 'string' ? u.locale.trim() : '';
    return loc ? normalizeLocale(loc) : fromEnv;
  }
}
