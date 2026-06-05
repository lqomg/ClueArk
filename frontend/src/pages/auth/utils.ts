import { ApiError } from '@/api/http';

export const authErrBoxClass =
  'rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200';

export const authOkBoxClass =
  'rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100';

/** 后端 429 发码限流时启动前端倒计时 */
export function isOtpRateLimitedError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 429;
}
