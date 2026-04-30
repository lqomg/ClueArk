import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { IconButton } from './icon-button';

export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** 底部固定操作区（取消/提交等） */
  footer?: ReactNode;
  /** 面板最大宽度，默认 max-w-xl */
  panelClassName?: string;
};

/**
 * 右侧滑出抽屉：遮罩点击、Esc、右上角关闭。
 * 打开时锁定 body 滚动。
 */
export function Drawer({ open, onClose, title, description, children, footer, panelClassName }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="关闭抽屉"
        onClick={onClose}
      />
      <aside
        className={cn(
          'relative z-10 flex h-full w-full max-w-full flex-col border-l border-ark-border bg-ark-surface shadow-2xl sm:max-w-xl',
          panelClassName,
        )}
        role="dialog"
        aria-modal
        aria-labelledby="drawer-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-ark-border px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0 pr-2">
            <h2 id="drawer-title" className="text-lg font-semibold tracking-tight text-white">
              {title}
            </h2>
            {description ? <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p> : null}
          </div>
          <IconButton type="button" aria-label="关闭" onClick={onClose} className="shrink-0 text-slate-400">
            <X size={20} strokeWidth={2} aria-hidden />
          </IconButton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 sm:px-5">{children}</div>
        {footer ? (
          <footer className="shrink-0 border-t border-ark-border bg-ark-surface/95 px-4 py-3 backdrop-blur sm:px-5 sm:py-4">
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}
