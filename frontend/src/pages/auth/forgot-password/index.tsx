import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { confirmPasswordReset, sendPasswordResetCode } from '@/api/auth';
import {
  AuthBrandingLayout,
  inputClass,
  inputFlexClass,
  primaryBtnClass,
} from '@/components/auth/AuthBrandingLayout';
import { useOtpResendCooldown } from '@/hooks/useOtpResendCooldown';
import { OtpSendCodeButton } from '../components/OtpSendCodeButton';
import { authErrBoxClass, authOkBoxClass, isOtpRateLimitedError } from '../utils';

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const { remaining: codeCooldown, startCooldown: startCodeCooldown } = useOtpResendCooldown();

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await sendPasswordResetCode({ email });
      setMessage(t('auth.resetCodeSent'));
      setCodeSent(true);
      startCodeCooldown();
      setStep('reset');
    } catch (err) {
      if (isOtpRateLimitedError(err)) startCodeCooldown();
      setError(err instanceof Error ? err.message : t('auth.sendFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function onResendCode() {
    setError(null);
    setResendingCode(true);
    try {
      await sendPasswordResetCode({ email });
      setMessage(t('auth.resetCodeSent'));
      setCodeSent(true);
      startCodeCooldown();
    } catch (err) {
      if (isOtpRateLimitedError(err)) startCodeCooldown();
      setError(err instanceof Error ? err.message : t('auth.sendFailed'));
    } finally {
      setResendingCode(false);
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await confirmPasswordReset({ email, code, newPassword });
      setMessage(t('auth.resetSuccess'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.resetFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthBrandingLayout title={t('auth.forgotPassword')} subtitle={t('auth.forgotSubtitle')}>
      {error ? <div className={authErrBoxClass}>{error}</div> : null}
      {message ? <div className={authOkBoxClass}>{message}</div> : null}

      {step === 'email' ? (
        <form className="space-y-3.5" onSubmit={sendCode}>
          <div className="space-y-1.5">
            <label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {t('auth.email')} <span className="text-ark-accent opacity-60">*</span>
            </label>
            <div className="flex min-w-0 items-stretch gap-2">
              <input
                type="email"
                className={inputFlexClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
              />
              <OtpSendCodeButton
                type="submit"
                sending={loading}
                sent={codeSent}
                cooldown={codeCooldown}
                emailReady={!!email.trim()}
              />
            </div>
          </div>
        </form>
      ) : (
        <form className="space-y-3.5" onSubmit={resetPassword}>
          <div className="space-y-1.5">
            <label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('auth.email')}</label>
            <input
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {t('auth.codeLabel')}
            </label>
            <div className="flex min-w-0 items-stretch gap-2">
              <input
                className={`${inputFlexClass} max-w-none tracking-widest`}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                required
              />
              <OtpSendCodeButton
                onClick={() => void onResendCode()}
                sending={resendingCode}
                sent={codeSent}
                cooldown={codeCooldown}
                emailReady={!!email.trim()}
              />
            </div>
            {codeSent && codeCooldown > 0 ? (
              <p className="pl-1 text-[11px] leading-relaxed text-slate-600">
                {t('auth.resendInSeconds', { seconds: codeCooldown })}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {t('auth.newPassword')}
            </label>
            <input
              type="password"
              className={inputClass}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <button type="submit" disabled={loading} className={primaryBtnClass}>
            <span className="relative z-10">{loading ? t('common.submitting') : t('auth.resetPassword')}</span>
          </button>
        </form>
      )}

      <div className="text-center">
        <Link
          to="/login"
          className="text-xs font-bold tracking-widest text-slate-500 transition-colors hover:text-ark-accent"
        >
          {t('auth.backToLogin')}
        </Link>
      </div>
    </AuthBrandingLayout>
  );
}
