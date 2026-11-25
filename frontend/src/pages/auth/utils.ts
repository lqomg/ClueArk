import { ApiError } from '@/api/http';

export const authErrBoxClass =
  'rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800';

export const authOkBoxClass =
  'rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900';

/** 后端 429 发码限流时启动前端倒计时 */
export function isOtpRateLimitedError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 429;
}

/** 注册发码时后端返回 409：该邮箱已注册 */
export function isEmailAlreadyRegisteredError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 409;
}

export function publicLoginPath(from?: string | null): string {
  const params = new URLSearchParams();
  params.set('auth', 'login');
  const redirect = (from ?? '').trim();
  if (redirect && redirect !== '/' && !redirect.startsWith('/login')) {
    params.set('from', redirect);
  }
  return `/?${params.toString()}`;
}

export function publicRegisterPath(): string {
  return '/?auth=register';
}
