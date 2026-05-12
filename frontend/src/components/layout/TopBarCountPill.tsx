import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** 顶栏统计文案：无边框、无背景，数字用主色强调 */
const wrapCls =
  'inline-flex max-w-full items-center truncate text-sm text-slate-500';

const numberCls = 'mx-0.5 shrink-0 tabular-nums font-semibold text-ark-accent';

export type TopBarCountPillProps = {
  value: ReactNode;
  /** 紧跟数字后的单位，默认「条」 */
  suffix?: ReactNode;
  /** 末尾说明（如「· 精选」），建议用 normal-case */
  trailing?: ReactNode;
  /** 窄屏限制最大宽度（信源顶栏移动端） */
  compact?: boolean;
  className?: string;
};

export function TopBarCountPill({ value, suffix = '条', trailing, compact, className }: TopBarCountPillProps) {
  return (
    <span
      className={cn(wrapCls, compact && 'max-w-[11rem] sm:max-w-none', className)}
      title={typeof value === 'number' ? `共 ${value}${suffix}` : undefined}
    >
      共<span className={numberCls}>{value}</span>
      {suffix}
      {trailing}
    </span>
  );
}
