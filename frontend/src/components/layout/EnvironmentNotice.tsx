import { useCallback, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { getEnvironmentNotice, type EnvironmentNotice as Notice } from '@/lib/app-env';

const DISMISS_KEY_PREFIX = 'ark-env-notice-dismissed:';

function noticeStyles(notice: Notice, placement: 'banner' | 'inline') {
  const isDev = notice.env === 'development';
  if (placement === 'inline') {
    return isDev
      ? 'text-amber-500/95'
      : 'text-orange-400/95';
  }
  return isDev
    ? 'border-amber-500/25 bg-amber-500/10 text-amber-100'
    : 'border-orange-500/25 bg-orange-500/10 text-orange-100';
}

function dismissStorageKey(notice: Notice) {
  return `${DISMISS_KEY_PREFIX}${notice.env}`;
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
  const notice = useMemo(() => getEnvironmentNotice(), []);
  const dismissKey = notice ? dismissStorageKey(notice) : '';
  const canDismiss = notice?.env === 'demo';
  const [dismissed, setDismissed] = useState(() =>
    notice && canDismiss ? readDismissed(dismissKey) : false,
  );

  const dismiss = useCallback(() => {
    if (!notice || !canDismiss) return;
    writeDismissed(dismissKey);
    setDismissed(true);
  }, [canDismiss, dismissKey, notice]);

  if (!notice || dismissed) return null;

  return (
    <div
      role="status"
      className={`flex shrink-0 items-start gap-2 border-b px-4 py-2 text-xs leading-relaxed md:px-6 ${noticeStyles(notice, 'banner')}`}
    >
      <p className="min-w-0 flex-1">
        <span className="font-semibold">{notice.title}</span>
        <span className="text-white/70"> · {notice.detail}</span>
      </p>
      {canDismiss ? (
        <button
          type="button"
          className="shrink-0 rounded p-0.5 text-white/60 transition hover:bg-white/10 hover:text-white"
          aria-label="关闭提示"
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
  const notice = useMemo(() => getEnvironmentNotice(), []);
  if (!notice) return null;

  return (
    <p
      role="status"
      className={`px-1 text-center text-[12px] leading-relaxed tracking-wide ${noticeStyles(notice, 'inline')}`}
    >
      <span className="font-semibold">{notice.title}</span>
      <span className="text-slate-500"> · {notice.detail}</span>
    </p>
  );
}
