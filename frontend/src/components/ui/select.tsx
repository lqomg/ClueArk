import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        'box-border h-10 min-w-0 rounded-lg border border-ark-border bg-ark-bg px-2.5 text-xs text-white outline-none transition focus:border-ark-accent/40 focus:ring-1 focus:ring-ark-accent disabled:opacity-50 sm:text-sm',
        className,
      )}
      {...props}
    />
  );
});
