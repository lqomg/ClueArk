import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

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
  className?: string;
}

export function Segmented<T extends string>({ value, onChange, options, size = 'sm', className }: SegmentedProps<T>) {
  const wrapCls =
    size === 'sm'
      ? 'inline-flex overflow-hidden rounded-lg border border-ark-border bg-ark-bg/20 font-semibold divide-x divide-white/[0.08]'
      : 'inline-flex overflow-hidden rounded-lg border border-ark-border divide-x divide-white/[0.08]';

  const itemCls =
    size === 'sm'
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
              size === 'sm' &&
                (active
                  ? 'bg-white/10 text-ark-accent'
                  : 'text-slate-500 hover:bg-white/[0.06] hover:text-ark-text'),
              size === 'md' &&
                (active
                  ? 'bg-ark-accent/12 text-ark-accent shadow-[inset_0_0_0_1px_rgba(0,242,255,0.28)]'
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
