import type { UserRole } from '@/constants/user-role';
import type { WebSupportedLocale } from '@/lib/localeStorage';

export type LoginMode = 'password' | 'otp' | 'register';
export type AuthLoginMode = LoginMode;

export type PublicAuthIntent =
  | { type: 'create'; prompt: string; label: string; initialMode?: AuthLoginMode }
  | { type: 'login'; label: string; redirect?: string; initialMode?: AuthLoginMode }
  | { type: 'register'; label: string; redirect?: string };

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
