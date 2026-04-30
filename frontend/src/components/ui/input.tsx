import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** 等宽字体（URL 等） */
  mono?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, mono, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'box-border w-full rounded-lg border border-ark-border bg-ark-bg px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-ark-accent/40 focus:ring-1 focus:ring-ark-accent disabled:opacity-50',
        mono && 'font-mono text-xs',
        className,
      )}
      {...props}
    />
  );
});
