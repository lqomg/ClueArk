import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type SegmentedVisual = 'tabs' | 'panel';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
}

export interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  /** 小号：动态页「全部/精选」；大号：信源视图切换 */
  size?: 'sm' | 'md';
  /** `tabs`：默认分割线组；`panel`：demo 浅底槽 + 圆角块选中 */
  visual?: SegmentedVisual;
  className?: string;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'sm',
  visual = 'tabs',
  className,
}: SegmentedProps<T>) {
  const isPanel = visual === 'panel';

  const wrapCls = isPanel
    ? 'inline-flex items-stretch divide-x divide-white/[0.08] overflow-hidden rounded-md border border-ark-border bg-ark-sidebar'
    : size === 'sm'
      ? 'inline-flex overflow-hidden rounded-lg border border-ark-border bg-ark-bg/20 font-semibold divide-x divide-white/[0.08]'
      : 'inline-flex overflow-hidden rounded-lg border border-ark-border divide-x divide-white/[0.08]';

  const itemCls = isPanel
    ? cn(
        'flex items-center justify-center rounded-none px-3 text-xs font-medium outline-none transition',
        size === 'md' ? 'min-h-9 py-0' : 'py-1.5',
      )
    : size === 'sm'
      ? 'px-3 py-1.5 text-[11px] outline-none transition'
      : 'inline-flex h-9 min-w-[3.25rem] shrink-0 items-center justify-center border-0 px-3 text-xs font-semibold outline-none transition';

  return (
    <div className={cn(wrapCls, className)} role="group">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={String(o.value)}
            type="button"
            className={cn(
              itemCls,
              isPanel &&
                (active
                  ? 'bg-ark-surface text-ark-text'
                  : 'text-slate-500 hover:bg-white/[0.06] hover:text-ark-text'),
              !isPanel &&
                size === 'sm' &&
                (active
                  ? 'bg-white/10 text-ark-accent'
                  : 'text-slate-500 hover:bg-white/[0.06] hover:text-ark-text'),
              !isPanel &&
                size === 'md' &&
                (active
                  ? 'bg-ark-accent/12 text-ark-accent'
                  : 'text-ark-muted hover:bg-white/[0.06] hover:text-ark-text'),
              'focus-visible:z-10 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ark-accent/45',
            )}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
