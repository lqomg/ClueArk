import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { loginWithGoogle } from '@/api/auth';
import { outlineBtnClass } from '@/components/auth/AuthBrandingLayout';
import { changeWebLanguage } from '@/i18n';
import type { GoogleCredentialResponse } from '@/lib/googleGsi';
import { getGoogleIdApi, loadGoogleGsiScript } from '@/lib/googleGsi';
import type { AuthTokenResponse } from '@/pages/auth/types';
import { authUserFromTokenResponse, useAuthStore } from '@/stores/authStore';
import { authErrBoxClass } from '../utils';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? '';

export function isGoogleSignInEnabled(): boolean {
  return googleClientId.length > 0;
}

type GoogleSignInButtonProps = {
  from: string;
  onError?: (message: string) => void;
};

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.083 36 24 36c-5.514 0-10.12-3.742-11.682-8.808H9.628v6.545C12.93 41.39 18.104 44 24 44c13.255 0 24-10.745 24-24 0-.366-.008-.722-.021-1.083z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691 10.88 18.008C12.99 13.008 18.104 10 24 10c3.198 0 6.098 1.214 8.287 3.194l5.87-5.87C33.654 4.053 29.083 2 24 2 12.93 2 3.978 10.388 1.594 20.691l4.712 3.545z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.96 0 11.288-2.282 15.313-6.015l-5.87-5.87C31.098 34.786 27.698 36 24 36c-5.003 0-9.252-3.208-10.813-7.691l-4.76 3.667C7.716 39.613 15.186 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 5.869 5.869C33.654 41.39 39 36 39 24c0-.366-.008-.722-.021-1.083z"
      />
    </svg>
  );
}

function applySession(
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

export function GoogleSignInButton({ from, onError }: GoogleSignInButtonProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const hiddenHostRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reportError = useCallback(
    (msg: string) => {
      setError(msg);
      onError?.(msg);
    },
    [onError],
  );

  const handleCredential = useCallback(
    async (response: GoogleCredentialResponse) => {
      const idToken = response.credential;
      if (!idToken) {
        reportError(t('auth.googleLoginFailed'));
        setLoading(false);
        return;
      }
      setError(null);
      try {
        const data = await loginWithGoogle({ idToken });
        applySession(data, setSession, navigate, from);
      } catch (err) {
        reportError(err instanceof Error ? err.message : t('auth.googleLoginFailed'));
      } finally {
        setLoading(false);
      }
    },
    [from, navigate, reportError, setSession, t],
  );

  const ensureHiddenButton = useCallback(() => {
    const idApi = getGoogleIdApi();
    const host = hiddenHostRef.current;
    if (!idApi || !host) return false;

    if (!initializedRef.current) {
      idApi.initialize({
        client_id: googleClientId,
        callback: (response) => void handleCredential(response),
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      initializedRef.current = true;
    }

    if (!host.querySelector('[role="button"]')) {
      host.replaceChildren();
      idApi.renderButton(host, {
        type: 'standard',
        theme: 'filled_black',
        size: 'large',
        width: 280,
      });
    }

    return !!host.querySelector('[role="button"]');
  }, [handleCredential]);

  const onCustomClick = useCallback(async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      await loadGoogleGsiScript();
    } catch {
      reportError(t('auth.googleUnavailable'));
      setLoading(false);
      return;
    }

    if (!ensureHiddenButton()) {
      reportError(t('auth.googleUnavailable'));
      setLoading(false);
      return;
    }

    const hiddenBtn = hiddenHostRef.current?.querySelector('[role="button"]') as HTMLElement | null;
    if (!hiddenBtn) {
      reportError(t('auth.googleUnavailable'));
      setLoading(false);
      return;
    }

    hiddenBtn.click();
    // 若用户关闭弹窗未登录，GIS 不回调；短暂后恢复可点状态
    window.setTimeout(() => setLoading(false), 1500);
  }, [ensureHiddenButton, loading, reportError, t]);

  if (!isGoogleSignInEnabled()) {
    return null;
  }

  return (
    <div className="space-y-3">
      {error ? <div className={authErrBoxClass}>{error}</div> : null}
      <button
        type="button"
        className={`${outlineBtnClass} inline-flex items-center justify-center gap-2.5`}
        onClick={() => void onCustomClick()}
        disabled={loading}
        aria-busy={loading}
      >
        <GoogleMark />
        <span>{loading ? t('common.loading') : t('auth.continueWithGoogle')}</span>
      </button>
      <div
        ref={hiddenHostRef}
        className="pointer-events-none absolute -left-[9999px] h-px w-px overflow-hidden opacity-0"
        aria-hidden
      />
    </div>
  );
}
