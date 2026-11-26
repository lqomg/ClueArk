import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { AuthLoginForm } from './AuthLoginForm';
import type { AuthLoginMode, AuthTokenResponse, PublicAuthIntent } from '@/pages/auth/types';
import { authUserFromTokenResponse, useAuthStore } from '@/stores/authStore';
import { changeWebLanguage } from '@/i18n';

type Props = {
  intent: PublicAuthIntent | null;
  onClose: () => void;
  onComplete: (data: AuthTokenResponse, intent: PublicAuthIntent) => Promise<void> | void;
};

export function AuthDialog({ intent, onClose, onComplete }: Props) {
  const { t } = useTranslation();
  const setSession = useAuthStore((state) => state.setSession);
  const [mode, setMode] = useState<AuthLoginMode | null>(null);

  useEffect(() => {
    if (!intent) {
      setMode(null);
      return;
    }
    const seeded =
      intent.type === 'register'
        ? ('register' as const)
        : intent.type === 'login' || intent.type === 'create'
          ? intent.initialMode ?? null
          : null;
    setMode(seeded);
  }, [intent]);

  useEffect(() => {
    if (!intent) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [intent, onClose]);

  const handleModeChange = useCallback((next: AuthLoginMode) => {
    setMode(next);
  }, []);

  if (!intent) return null;
  const activeIntent = intent;
  const initialMode =
    activeIntent.type === 'register'
      ? ('register' as const)
      : activeIntent.type === 'login' || activeIntent.type === 'create'
        ? activeIntent.initialMode
        : undefined;
  const isRegister = (mode ?? initialMode) === 'register';

  async function handleAuthenticated(data: AuthTokenResponse) {
    const user = authUserFromTokenResponse(data);
    setSession(data.access_token, user);
    changeWebLanguage(user.locale);
    await onComplete(data, activeIntent);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ark-btn/40 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`w-full rounded-2xl border border-neutral-200/80 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.18)] ${
          isRegister
            ? 'max-h-[min(94dvh,48rem)] max-w-[36rem] overflow-y-auto p-5 sm:p-6'
            : 'max-h-[min(94dvh,44rem)] max-w-[34rem] overflow-y-auto p-5 sm:p-6'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-dialog-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-[0.04em] text-neutral-400">
              {t('auth.dialogEyebrow')}
            </p>
            <h2
              id="auth-dialog-title"
              className="mt-1.5 text-[22px] font-semibold leading-tight tracking-[-0.03em] text-neutral-900 sm:text-[24px]"
            >
              {isRegister ? t('auth.register') : t('auth.dialogTitle')}
            </h2>
            <p className="mt-2 text-[13px] leading-5 text-neutral-500">
              {isRegister ? t('auth.registerSubtitle') : t('auth.dialogSubtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
            aria-label={t('common.close')}
          >
            <span aria-hidden className="text-xl leading-none">
              ×
            </span>
          </button>
        </div>

        <div className={isRegister ? 'mt-4' : 'mt-5'}>
          <AuthLoginForm
            compact
            tone="app"
            initialMode={initialMode}
            onAuthenticated={handleAuthenticated}
            onModeChange={handleModeChange}
          />
        </div>

        <div className="mt-4 flex justify-end border-t border-neutral-100 pt-3 text-[11px] text-neutral-400">
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 font-medium text-neutral-700 underline-offset-2 hover:underline"
          >
            {t('auth.dialogKeepBrowsing')}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
