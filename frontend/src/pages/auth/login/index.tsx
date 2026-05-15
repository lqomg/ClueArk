import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { login as loginApi, loginWithOtp, sendLoginCode } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';
import type { AuthTokenResponse } from '@/pages/auth/types';
import {
  AuthBrandingLayout,
  inputClass,
  inputFlexClass,
  primaryBtnClass,
  sendCodeBtnClass,
} from '@/components/auth/AuthBrandingLayout';
import { authErrBoxClass } from '../utils';

type LoginMode = 'password' | 'otp';

function applySessionAndNavigate(
  data: AuthTokenResponse,
  setSession: ReturnType<typeof useAuthStore.getState>['setSession'],
  navigate: ReturnType<typeof useNavigate>,
  from: string,
) {
  const uid = data.user.id || data.user._id;
  setSession(data.access_token, {
    id: uid,
    email: data.user.email,
    username: data.user.username,
    role: data.user.role,
    timeZone: data.user.timeZone,
  });
  navigate(from, { replace: true });
}

const tabBtnBase =
  'relative pb-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ark-accent/40 rounded-sm';
const tabActive = 'text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-ark-accent';
const tabInactive = 'text-slate-500 hover:text-slate-300';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);
  const [mode, setMode] = useState<LoginMode>('password');
  const [account, setAccount] = useState('show@clueark.com');
  const [password, setPassword] = useState('123456qian');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  const from = (location.state as { from?: string } | null)?.from || '/app/sources';

  function switchMode(next: LoginMode) {
    setMode(next);
    setError(null);
    setOtpSent(false);
    setOtpCode('');
  }

  async function onPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await loginApi({ account, password });
      applySessionAndNavigate(data, setSession, navigate, from);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  }

  async function onSendOtp() {
    setError(null);
    setSendingOtp(true);
    try {
      await sendLoginCode({ email: otpEmail });
      setOtpSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败');
    } finally {
      setSendingOtp(false);
    }
  }

  async function onOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await loginWithOtp({ email: otpEmail, code: otpCode });
      applySessionAndNavigate(data, setSession, navigate, from);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  }


  return (
    <AuthBrandingLayout title="登录" subtitle="欢迎回来">
      <div className="flex flex-col gap-3">
        <nav className="flex gap-8 border-b border-white/10" aria-label="登录方式">
          <button
            type="button"
            onClick={() => switchMode('password')}
            className={`${tabBtnBase} ${mode === 'password' ? tabActive : tabInactive}`}
          >
            密码登录
          </button>
          <button
            type="button"
            onClick={() => switchMode('otp')}
            className={`${tabBtnBase} ${mode === 'otp' ? tabActive : tabInactive}`}
          >
            验证码登录
          </button>
        </nav>

        {mode === 'password' ? (
        <form className="space-y-3.5" onSubmit={onPasswordSubmit}>
          {error ? <div className={authErrBoxClass}>{error}</div> : null}
          <div className="space-y-1.5">
            <label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              邮箱或用户名 <span className="text-ark-accent opacity-60">*</span>
            </label>
            <input
              className={inputClass}
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              autoComplete="username"
              placeholder="邮箱或用户名"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              密码 <span className="text-ark-accent opacity-60">*</span>
            </label>
            <input
              type="password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="密码"
              required
            />
          </div>
          <div className="flex justify-end pr-1 pt-1">
            <Link
              to="/forgot-password"
              className="text-[10px] font-bold tracking-widest text-slate-500 transition-colors hover:text-ark-accent"
            >
              忘记密码？
            </Link>
          </div>
          <button type="submit" disabled={loading} className={primaryBtnClass}>
            <span className="relative z-10">{loading ? '登录中…' : '登录'}</span>
          </button>
        </form>
      ) : (
        <form className="space-y-3.5" onSubmit={onOtpSubmit}>
          {error ? <div className={authErrBoxClass}>{error}</div> : null}
          <div className="space-y-1.5">
            <label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              邮箱 <span className="text-ark-accent opacity-60">*</span>
            </label>
            <div className="flex min-w-0 items-stretch gap-2">
              <input
                type="email"
                className={inputFlexClass}
                value={otpEmail}
                onChange={(e) => setOtpEmail(e.target.value)}
                autoComplete="email"
                placeholder="name@company.com"
                required
              />
              <button
                type="button"
                disabled={sendingOtp || !otpEmail.trim()}
                onClick={() => void onSendOtp()}
                className={sendCodeBtnClass}
              >
                {sendingOtp ? '发送中…' : otpSent ? '重新获取' : '获取验证码'}
              </button>
            </div>
            {otpSent ? (
              <p className="pl-1 text-[11px] leading-relaxed text-slate-500">
                若该邮箱已注册，验证码已发至邮箱，15 分钟内有效（含垃圾箱）。
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              6 位验证码 <span className="text-ark-accent opacity-60">*</span>
            </label>
            <input
              className={`${inputClass} max-w-[12rem] tracking-widest`}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={6}
              required
            />
          </div>
          <button type="submit" disabled={loading || otpCode.length !== 6} className={primaryBtnClass}>
            <span className="relative z-10">{loading ? '登录中…' : '登录'}</span>
          </button>
        </form>
      )}
      </div>

      <div className="relative pt-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-white/5" />
        </div>
        <div className="relative flex justify-center text-[10px] font-medium tracking-widest text-slate-600">
          <span className="bg-ark-bg px-4">或</span>
        </div>
      </div>

      <div className="text-center">
        <Link
          to="/register"
          className="text-xs font-bold tracking-widest text-slate-500 transition-colors hover:text-ark-accent"
        >
          还没有账号？立即注册
        </Link>
      </div>
    </AuthBrandingLayout>
  );
}
