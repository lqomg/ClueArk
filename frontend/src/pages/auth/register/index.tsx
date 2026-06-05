import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { register as registerApi, sendRegisterCode } from '@/api/auth';
import { authUserFromTokenResponse, useAuthStore } from '@/stores/authStore';
import { changeWebLanguage } from '@/i18n';
import {
  AuthBrandingLayout,
  inputClass,
  inputFlexClass,
  primaryBtnClass,
} from '@/components/auth/AuthBrandingLayout';
import { useOtpResendCooldown } from '@/hooks/useOtpResendCooldown';
import { OtpSendCodeButton } from '../components/OtpSendCodeButton';
import { authErrBoxClass, isOtpRateLimitedError } from '../utils';

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const { remaining: codeCooldown, startCooldown: startCodeCooldown } = useOtpResendCooldown();

  async function onSendCode() {
    setError(null);
    setSendingCode(true);
    try {
      await sendRegisterCode({ email });
      setCodeSent(true);
      startCodeCooldown();
    } catch (err) {
      if (isOtpRateLimitedError(err)) startCodeCooldown();
      setError(err instanceof Error ? err.message : t('auth.sendFailed'));
    } finally {
      setSendingCode(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      const data = await registerApi({ email, code, password, confirmPassword, acceptTerms });
      const user = authUserFromTokenResponse(data);
      setSession(data.access_token, user);
      changeWebLanguage(user.locale);
      navigate('/app/sources', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.registerFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthBrandingLayout title={t('auth.register')} subtitle={t('auth.registerSubtitle')} showLegalFooter={false}>
      <form className="space-y-3.5" onSubmit={onSubmit}>
        {error ? <div className={authErrBoxClass}>{error}</div> : null}
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
              autoComplete="email"
              placeholder="name@company.com"
              required
            />
            <OtpSendCodeButton
              onClick={() => void onSendCode()}
              sending={sendingCode}
              sent={codeSent}
              cooldown={codeCooldown}
              emailReady={!!email.trim()}
            />
          </div>
          {codeSent ? (
            <p className="pl-1 text-[11px] leading-relaxed text-slate-500">
              {t('auth.codeSentRegister')}
              {codeCooldown > 0 ? (
                <span className="mt-0.5 block text-slate-600">
                  {t('auth.resendInSeconds', { seconds: codeCooldown })}
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {t('auth.codeLabel')} <span className="text-ark-accent opacity-60">*</span>
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
        <div className="space-y-1.5">
          <label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {t('auth.passwordMin')} <span className="text-ark-accent opacity-60">*</span>
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
        <div className="space-y-1.5">
          <label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {t('auth.confirmPassword')} <span className="text-ark-accent opacity-60">*</span>
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
        <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11px] leading-relaxed text-slate-400">
          <input
            type="checkbox"
            className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-white/20 bg-white/5"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
          />
          <span>
            {t('auth.acceptTerms')}
            <Link to="/legal/terms" className="mx-0.5 text-ark-accent hover:underline" target="_blank">
              {t('auth.termsOfService')}
            </Link>
            {t('auth.conjunctionAnd')}
            <Link to="/legal/privacy" className="mx-0.5 text-ark-accent hover:underline" target="_blank">
              {t('auth.privacyPolicy')}
            </Link>
          </span>
        </label>
        <button type="submit" disabled={loading} className={primaryBtnClass}>
          <span className="relative z-10">{loading ? t('common.submitting') : t('auth.registerSubmit')}</span>
        </button>
      </form>

      <div className="text-center">
        <Link
          to="/login"
          className="text-xs font-bold tracking-widest text-slate-500 transition-colors hover:text-ark-accent"
        >
          {t('auth.hasAccount')}
        </Link>
      </div>
    </AuthBrandingLayout>
  );
}
