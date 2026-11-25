import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { register as registerApi, sendRegisterCode } from '@/api/auth';
import { useOtpResendCooldown } from '@/hooks/useOtpResendCooldown';
import { OtpSendCodeButton } from '@/pages/auth/components/OtpSendCodeButton';
import {
  authErrBoxClass,
  isEmailAlreadyRegisteredError,
  isOtpRateLimitedError,
} from '@/pages/auth/utils';
import type { AuthTokenResponse } from '@/pages/auth/types';
import { getAuthFormTone, type AuthFormTone } from './AuthBrandingLayout';

type Props = {
  tone?: AuthFormTone;
  compact?: boolean;
  onAuthenticated: (data: AuthTokenResponse) => Promise<void> | void;
  onBackToLogin?: () => void;
};

export function AuthEmailRegisterForm({
  tone = 'app',
  compact = false,
  onAuthenticated,
  onBackToLogin,
}: Props) {
  const { t } = useTranslation();
  const styles = getAuthFormTone(tone);
  const inputClass = styles.inputClass;
  const inputFlexClass = `${styles.inputClass} min-w-0 flex-1`;
  const fieldLabelClass = styles.fieldLabelClass;
  const primaryBtnClass = styles.primaryBtnClass;
  const linkClass = styles.linkClass;
  const stackClass = compact ? 'space-y-2.5' : 'space-y-3.5';
  const fieldClass = compact ? 'space-y-1' : 'space-y-1.5';

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailRegistered, setEmailRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const { remaining: codeCooldown, startCooldown: startCodeCooldown } = useOtpResendCooldown();

  const requiredMark = <span className="text-neutral-400">*</span>;

  async function onSendCode() {
    setError(null);
    setEmailRegistered(false);
    setSendingCode(true);
    try {
      await sendRegisterCode({ email });
      setCodeSent(true);
      startCodeCooldown();
    } catch (err) {
      if (isEmailAlreadyRegisteredError(err)) {
        setEmailRegistered(true);
      } else {
        if (isOtpRateLimitedError(err)) startCodeCooldown();
        setError(err instanceof Error ? err.message : t('auth.sendFailed'));
      }
    } finally {
      setSendingCode(false);
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!acceptTerms) {
      setError(t('auth.acceptTermsRequired'));
      return;
    }
    if (!codeSent) {
      setError(t('auth.requestCodeFirst'));
      return;
    }
    setLoading(true);
    try {
      await onAuthenticated(
        await registerApi({ email, code, password, confirmPassword, acceptTerms }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.registerFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={stackClass} onSubmit={(event) => void onSubmit(event)}>
      {error ? <div className={authErrBoxClass}>{error}</div> : null}
      {emailRegistered ? (
        <div className={authErrBoxClass}>
          {t('auth.emailAlreadyRegistered')}{' '}
          {onBackToLogin ? (
            <button type="button" className={linkClass} onClick={onBackToLogin}>
              {t('auth.login')}
            </button>
          ) : null}
        </div>
      ) : null}
      <div className={fieldClass}>
        <label className={fieldLabelClass}>
          {t('auth.email')} {requiredMark}
        </label>
        <div className="flex min-w-0 items-stretch gap-2">
          <input
            type="email"
            className={inputFlexClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder={t('auth.emailPlaceholder')}
            required
          />
          <OtpSendCodeButton
            onClick={() => void onSendCode()}
            sending={sendingCode}
            sent={codeSent}
            cooldown={codeCooldown}
            emailReady={!!email.trim()}
            tone={tone}
          />
        </div>
        {codeSent ? (
          <p className="pl-1 text-[11px] leading-relaxed text-neutral-400">{t('auth.codeSentRegister')}</p>
        ) : null}
      </div>
      <div className={fieldClass}>
        <label className={fieldLabelClass}>
          {t('auth.codeLabel')} {requiredMark}
        </label>
        <input
          className={`${inputClass} max-w-[12rem] tracking-widest`}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          maxLength={6}
          required
        />
      </div>
      <div className={fieldClass}>
        <label className={fieldLabelClass}>
          {t('auth.passwordMin')} {requiredMark}
        </label>
        <input
          type="password"
          className={inputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder={t('auth.passwordPlaceholder')}
          required
          minLength={6}
        />
      </div>
      <div className={fieldClass}>
        <label className={fieldLabelClass}>
          {t('auth.confirmPassword')} {requiredMark}
        </label>
        <input
          type="password"
          className={inputClass}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          placeholder={t('auth.confirmPlaceholder')}
          required
          minLength={6}
        />
      </div>
      <label className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[11px] leading-relaxed text-neutral-600">
        <input
          type="checkbox"
          className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-neutral-300"
          checked={acceptTerms}
          onChange={(e) => setAcceptTerms(e.target.checked)}
        />
        <span>
          {t('auth.acceptTerms')}
          <Link to="/legal/terms" className="mx-0.5 text-neutral-800 underline underline-offset-2" target="_blank">
            {t('auth.termsOfService')}
          </Link>
          {t('auth.conjunctionAnd')}
          <Link to="/legal/privacy" className="mx-0.5 text-neutral-800 underline underline-offset-2" target="_blank">
            {t('auth.privacyPolicy')}
          </Link>
        </span>
      </label>
      <button type="submit" disabled={loading} className={primaryBtnClass}>
        <span className="relative z-10">{loading ? t('common.submitting') : t('auth.registerSubmit')}</span>
      </button>
      {onBackToLogin ? (
        <div className="text-center text-[13px]">
          <button type="button" className={linkClass} onClick={onBackToLogin}>
            {t('auth.hasAccount')}
          </button>
        </div>
      ) : null}
    </form>
  );
}
