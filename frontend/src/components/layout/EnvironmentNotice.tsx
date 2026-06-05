import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { getAppEnv, type AppEnv } from '@/lib/app-env';

const DISMISS_KEY_PREFIX = 'ark-env-notice-dismissed:';

function noticeStyles(env: Exclude<AppEnv, 'production'>, placement: 'banner' | 'inline') {
  const isDev = env === 'development';
  if (placement === 'inline') {
    return isDev ? 'text-amber-500/95' : 'text-orange-400/95';
  }
  return isDev
    ? 'border-amber-500/25 bg-amber-500/10 text-amber-100'
    : 'border-orange-500/25 bg-orange-500/10 text-orange-100';
}

function dismissStorageKey(env: Exclude<AppEnv, 'production'>) {
  return `${DISMISS_KEY_PREFIX}${env}`;
}

function readDismissed(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeDismissed(key: string): void {
  try {
    localStorage.setItem(key, '1');
  } catch {
    /* ignore */
  }
}

export function EnvironmentBanner() {
  const { t } = useTranslation();
  const env = useMemo(() => getAppEnv(), []);
  const noticeEnv = env === 'development' || env === 'demo' ? env : null;
  const dismissKey = noticeEnv ? dismissStorageKey(noticeEnv) : '';
  const canDismiss = noticeEnv === 'demo';
  const [dismissed, setDismissed] = useState(() =>
    noticeEnv && canDismiss ? readDismissed(dismissKey) : false,
  );

  const dismiss = useCallback(() => {
    if (!noticeEnv || !canDismiss) return;
    writeDismissed(dismissKey);
    setDismissed(true);
  }, [canDismiss, dismissKey, noticeEnv]);

  if (!noticeEnv || dismissed) return null;

  const title = noticeEnv === 'development' ? t('env.devTitle') : t('env.demoTitle');
  const detail = noticeEnv === 'development' ? t('env.devDetail') : t('env.demoDetail');

  return (
    <div
      role="status"
      className={`flex shrink-0 items-start gap-2 border-b px-4 py-2 text-xs leading-relaxed md:px-6 ${noticeStyles(noticeEnv, 'banner')}`}
    >
      <p className="min-w-0 flex-1">
        <span className="font-semibold">{title}</span>
        <span className="text-white/70"> · {detail}</span>
      </p>
      {canDismiss ? (
        <button
          type="button"
          className="shrink-0 rounded p-0.5 text-white/60 transition hover:bg-white/10 hover:text-white"
          aria-label={t('common.dismiss')}
          onClick={dismiss}
        >
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
}

/** 登录/找回密码等认证页底部环境说明 */
export function EnvironmentNoticeInline() {
  const { t } = useTranslation();
  const env = useMemo(() => getAppEnv(), []);
  const noticeEnv = env === 'development' || env === 'demo' ? env : null;
  if (!noticeEnv) return null;

  const title = noticeEnv === 'development' ? t('env.devTitle') : t('env.demoTitle');
  const detail = noticeEnv === 'development' ? t('env.devDetail') : t('env.demoDetail');

  return (
    <p
      role="status"
      className={`px-1 text-center text-[12px] leading-relaxed tracking-wide ${noticeStyles(noticeEnv, 'inline')}`}
    >
      <span className="font-semibold">{title}</span>
      <span className="text-slate-500"> · {detail}</span>
    </p>
  );
}
