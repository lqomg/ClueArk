import type { UserRole } from '@/constants/user-role';
import type { WebSupportedLocale } from '@/lib/localeStorage';

/** 登录 / 注册接口返回 */
export interface AuthTokenResponse {
  access_token: string;
  user: {
    id: string;
    _id: string;
    email: string;
    username: string;
    role?: UserRole;
    timeZone: string;
    locale: WebSupportedLocale;
  };
}
