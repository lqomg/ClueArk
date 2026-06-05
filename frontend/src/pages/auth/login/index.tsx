import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { login as loginApi, loginWithOtp, sendLoginCode } from '@/api/auth';
import { authUserFromTokenResponse, useAuthStore } from '@/stores/authStore';
import type { AuthTokenResponse } from '@/pages/auth/types';
import {
  AuthBrandingLayout,
  inputClass,
  inputFlexClass,
  primaryBtnClass,
} from '@/components/auth/AuthBrandingLayout';
import { changeWebLanguage } from '@/i18n';
import { useOtpResendCooldown } from '@/hooks/useOtpResendCooldown';
import { OtpSendCodeButton } from '../components/OtpSendCodeButton';
import { GoogleSignInButton, isGoogleSignInEnabled } from '../components/GoogleSignInButton';
import { authErrBoxClass, isOtpRateLimitedError } from '../utils';

type LoginMode = 'password' | 'otp';

function applySessionAndNavigate(
  data: AuthTokenResponse,
  setSession: ReturnType<typeof useAuthStore.getState>['setSession'],
  navigate: ReturnType<typeof useNavigate>,
  from: string,
) {
  const user = authUserFromTokenResponse(data);
  setSession(data.access_token, user);
  changeWebLanguage(user.locale);
  navigate(from, { replace: true });
}

const tabBtnBase =
  'relative pb-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ark-accent/40 rounded-sm';
const tabActive = 'text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-ark-accent';
const tabInactive = 'text-slate-500 hover:text-slate-300';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);
  const [mode, setMode] = useState<LoginMode>('password');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const { remaining: otpCooldown, startCooldown: startOtpCooldown, resetCooldown: resetOtpCooldown } =
    useOtpResendCooldown();

  const from = (location.state as { from?: string } | null)?.from || '/app/sources';

  function switchMode(next: LoginMode) {
    setMode(next);
    setError(null);
    setOtpSent(false);
    setOtpCode('');
    resetOtpCooldown();
  }

  async function onPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await loginApi({ account, password });
      applySessionAndNavigate(data, setSession, navigate, from);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.loginFailed'));
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
      startOtpCooldown();
    } catch (err) {
      if (isOtpRateLimitedError(err)) startOtpCooldown();
      setError(err instanceof Error ? err.message : t('auth.sendFailed'));
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
      setError(err instanceof Error ? err.message : t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  }

  const requiredMark = <span className="text-ark-accent opacity-60">*</span>;

  return (
    <AuthBrandingLayout title={t('auth.login')} subtitle={t('auth.login')}>
      <div className="flex flex-col gap-3">
        <nav className="flex gap-8 border-b border-white/10" aria-label={t('auth.loginModeNav')}>
          <button
            type="button"
            onClick={() => switchMode('password')}
            className={`${tabBtnBase} ${mode === 'password' ? tabActive : tabInactive}`}
          >
            {t('auth.passwordMode')}
          </button>
          <button
            type="button"
            onClick={() => switchMode('otp')}
            className={`${tabBtnBase} ${mode === 'otp' ? tabActive : tabInactive}`}
          >
            {t('auth.otpMode')}
          </button>
        </nav>

        {mode === 'password' ? (
          <form className="space-y-3.5" onSubmit={onPasswordSubmit}>
            {error ? <div className={authErrBoxClass}>{error}</div> : null}
            <div className="space-y-1.5">
              <label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {t('auth.email')} {requiredMark}
              </label>
              <input
                type="email"
                className={inputClass}
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                autoComplete="email"
                placeholder="name@company.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {t('auth.password')} {requiredMark}
              </label>
              <input
                type="password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder={t('auth.password')}
                required
              />
            </div>
            <div className="flex justify-end pr-1 pt-1">
              <Link
                to="/forgot-password"
                className="text-[10px] font-bold tracking-widest text-slate-500 transition-colors hover:text-ark-accent"
              >
                {t('auth.forgotPasswordQuestion')}
              </Link>
            </div>
            <button type="submit" disabled={loading} className={primaryBtnClass}>
              <span className="relative z-10">{loading ? '…' : t('auth.login')}</span>
            </button>
          </form>
        ) : (
          <form className="space-y-3.5" onSubmit={onOtpSubmit}>
            {error ? <div className={authErrBoxClass}>{error}</div> : null}
            <div className="space-y-1.5">
              <label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {t('auth.email')} {requiredMark}
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
                <OtpSendCodeButton
                  onClick={() => void onSendOtp()}
                  sending={sendingOtp}
                  sent={otpSent}
                  cooldown={otpCooldown}
                  emailReady={!!otpEmail.trim()}
                />
              </div>
              {otpSent ? (
                <p className="pl-1 text-[11px] leading-relaxed text-slate-500">
                  {t('auth.codeSentLogin')}
                  {otpCooldown > 0 ? (
                    <span className="mt-0.5 block text-slate-600">
                      {t('auth.resendInSeconds', { seconds: otpCooldown })}
                    </span>
                  ) : null}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {t('auth.codeLabel')} {requiredMark}
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
              <span className="relative z-10">{loading ? '…' : t('auth.login')}</span>
            </button>
          </form>
        )}
      </div>

      <div className="relative pt-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-white/5" />
        </div>
        <div className="relative flex justify-center text-[10px] font-medium tracking-widest text-slate-600">
          <span className="bg-ark-bg px-4">{t('auth.orDivider')}</span>
        </div>
      </div>

      {isGoogleSignInEnabled() ? <GoogleSignInButton from={from} /> : null}

      <div className="text-center">
        <Link
          to="/register"
          className="text-xs font-bold tracking-widest text-slate-500 transition-colors hover:text-ark-accent"
        >
          {t('auth.noAccount')}
        </Link>
      </div>
    </AuthBrandingLayout>
  );
}
