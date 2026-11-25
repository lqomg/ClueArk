import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { login as loginApi, loginWithOtp, sendLoginCode } from '@/api/auth';
import { useOtpResendCooldown } from '@/hooks/useOtpResendCooldown';
import { OtpSendCodeButton } from '@/pages/auth/components/OtpSendCodeButton';
import { GoogleSignInButton, isGoogleSignInEnabled } from '@/pages/auth/components/GoogleSignInButton';
import { authErrBoxClass, isOtpRateLimitedError } from '@/pages/auth/utils';
import type { AuthLoginMode, AuthTokenResponse } from '@/pages/auth/types';
import { AuthEmailRegisterForm } from './AuthEmailRegisterForm';
import { getAuthFormTone, type AuthFormTone } from './AuthBrandingLayout';

type Props = {
  from?: string;
  compact?: boolean;
  tone?: AuthFormTone;
  initialMode?: AuthLoginMode;
  onAuthenticated: (data: AuthTokenResponse) => Promise<void> | void;
  onModeChange?: (mode: AuthLoginMode) => void;
};

export function AuthLoginForm({
  from = '/app/home',
  compact = false,
  tone = 'app',
  initialMode,
  onAuthenticated,
  onModeChange,
}: Props) {
  const { t } = useTranslation();
  const formTone: AuthFormTone = tone;
  const styles = getAuthFormTone(formTone);
  const inputClass = styles.inputClass;
  const inputFlexClass = `${styles.inputClass} min-w-0 flex-1`;
  const fieldLabelClass = styles.fieldLabelClass;
  const primaryBtnClass = styles.primaryBtnClass;
  const [mode, setMode] = useState<AuthLoginMode>(initialMode ?? 'password');
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

  useEffect(() => {
    onModeChange?.(mode);
  }, [mode, onModeChange]);

  function switchMode(next: AuthLoginMode) {
    setMode(next);
    setError(null);
    setOtpSent(false);
    setOtpCode('');
    resetOtpCooldown();
  }

  async function onPasswordSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onAuthenticated(await loginApi({ account, password }));
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

  async function onOtpSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onAuthenticated(await loginWithOtp({ email: otpEmail, code: otpCode }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  }

  const requiredMark = <span className="text-neutral-400">*</span>;
  const spacing = compact ? 'space-y-2.5' : 'space-y-3.5';

  if (mode === 'register') {
    return (
      <AuthEmailRegisterForm
        tone={formTone}
        compact={compact}
        onAuthenticated={onAuthenticated}
        onBackToLogin={() => switchMode('password')}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {mode === 'password' ? (
        <form className={spacing} onSubmit={(e) => void onPasswordSubmit(e)}>
          {error ? <div className={authErrBoxClass}>{error}</div> : null}
          <div className="space-y-1.5">
            <label className={fieldLabelClass}>
              {t('auth.email')} {requiredMark}
            </label>
            <input
              type="email"
              className={inputClass}
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              autoComplete="email"
              placeholder={t('auth.emailPlaceholder')}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className={fieldLabelClass}>
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
            <Link to="/forgot-password" className="text-xs text-neutral-500 transition hover:text-neutral-800 hover:underline">
              {t('auth.forgotPasswordQuestion')}
            </Link>
          </div>
          <button type="submit" disabled={loading} className={primaryBtnClass}>
            <span className="relative z-10">{loading ? '…' : t('auth.login')}</span>
          </button>
        </form>
      ) : (
        <form className={spacing} onSubmit={(e) => void onOtpSubmit(e)}>
          {error ? <div className={authErrBoxClass}>{error}</div> : null}
          <div className="space-y-1.5">
            <label className={fieldLabelClass}>
              {t('auth.email')} {requiredMark}
            </label>
            <div className="flex min-w-0 items-stretch gap-2">
              <input
                type="email"
                className={inputFlexClass}
                value={otpEmail}
                onChange={(e) => setOtpEmail(e.target.value)}
                autoComplete="email"
                placeholder={t('auth.emailPlaceholder')}
                required
              />
              <OtpSendCodeButton
                onClick={() => void onSendOtp()}
                sending={sendingOtp}
                sent={otpSent}
                cooldown={otpCooldown}
                emailReady={!!otpEmail.trim()}
                tone={formTone}
              />
            </div>
            {otpSent ? (
              <p className="pl-1 text-[11px] leading-relaxed text-neutral-400">{t('auth.codeSentLogin')}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <label className={fieldLabelClass}>
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

      <div className="relative pt-1">
        <div className="absolute inset-0 flex items-center">
          <span className={`w-full border-t ${styles.dividerLineClass}`} />
        </div>
        <div className="relative flex justify-center text-[11px] font-medium text-neutral-400">
          <span className={`${styles.dividerBgClass} px-4`}>{t('auth.orDivider')}</span>
        </div>
      </div>

      {isGoogleSignInEnabled() ? <GoogleSignInButton from={from} /> : null}

      <nav
        className={`flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[13px] ${styles.navMutedClass}`}
        aria-label={t('auth.loginModeNav')}
      >
        {mode !== 'password' ? (
          <button type="button" className={styles.linkClass} onClick={() => switchMode('password')}>
            {t('auth.passwordMode')}
          </button>
        ) : null}
        {mode !== 'otp' ? (
          <>
            {mode !== 'password' ? <span aria-hidden>·</span> : null}
            <button type="button" className={styles.linkClass} onClick={() => switchMode('otp')}>
              {t('auth.otpMode')}
            </button>
          </>
        ) : null}
        <span aria-hidden>·</span>
        <button type="button" className={styles.linkClass} onClick={() => switchMode('register')}>
          {t('auth.noAccountShort')}
        </button>
      </nav>
    </div>
  );
}
