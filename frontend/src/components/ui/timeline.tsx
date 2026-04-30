import { type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type TimelineProps = Omit<ComponentProps<'ol'>, 'children'> & {
  children: ReactNode;
};

/** 纵向时间轴容器，子节点应为 {@link TimelineItem}。 */
export function Timeline({ className, children, ...props }: TimelineProps) {
  return (
    <ol role="list" className={cn('m-0 list-none p-0', className)} {...props}>
      {children}
    </ol>
  );
}

export type TimelineItemProps = Omit<ComponentProps<'li'>, 'children'> & {
  children: ReactNode;
  /** 为 true 时不绘制向下的连接线 */
  isLast?: boolean;
  /** 轴线左侧的时间等展示（如 `<time>` 或短文案）；不传则仅显示窄轨圆点 */
  stamp?: ReactNode;
};

/** 单条时间轴节点：左侧可选时间戳，紧邻竖线与圆点，右侧为内容区。 */
export function TimelineItem({ className, isLast, stamp, children, ...props }: TimelineItemProps) {
  return (
    <li className={cn('flex gap-3 sm:gap-4', className)} {...props}>
      {stamp ? (
        <div className="flex shrink-0 items-stretch gap-2 self-stretch sm:gap-2.5">
          <div className="min-w-[3.25rem] max-w-[5rem] shrink-0 self-start pt-1 text-left sm:min-w-[3.5rem]">
            {stamp}
          </div>
          <div className="flex w-3 shrink-0 flex-col items-center self-stretch min-h-0 pt-1 sm:w-3.5">
            <span
              className="size-2.5 shrink-0 rounded-full border-2 border-ark-accent/85 bg-ark-surface shadow-[0_0_0_1px_rgba(0,0,0,0.35)] sm:size-3"
              aria-hidden
            />
            {!isLast ? (
              <span className="mx-auto mt-1.5 w-px flex-1 min-h-[4px] bg-ark-border" aria-hidden />
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex w-3 shrink-0 flex-col items-center self-stretch sm:w-3.5">
          <span
            className="mt-1.5 size-2.5 shrink-0 rounded-full border-2 border-ark-accent/85 bg-ark-surface shadow-[0_0_0_1px_rgba(0,0,0,0.35)] sm:size-3"
            aria-hidden
          />
          {!isLast ? (
            <span className="mx-auto mt-1.5 w-px flex-1 min-h-[4px] bg-ark-border" aria-hidden />
          ) : null}
        </div>
      )}
      <div className={cn('min-w-0 flex-1', isLast ? 'pb-4 sm:pb-5' : 'pb-5 sm:pb-6')}>{children}</div>
    </li>
  );
}
