import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'outlineSoft'
  | 'accent'
  | 'ghost'
  | 'link'
  | 'dangerGhost';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'inline-flex items-center justify-center gap-2 rounded-lg bg-ark-accent font-bold text-black shadow-lg shadow-ark-accent/15 hover:opacity-95 disabled:opacity-40',
  secondary:
    'inline-flex items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 disabled:opacity-50',
  outline:
    'inline-flex items-center justify-center rounded-lg border border-ark-border font-medium text-slate-300 transition hover:border-ark-accent/50 hover:text-ark-accent disabled:opacity-40',
  outlineSoft:
    'inline-flex items-center justify-center rounded-lg border border-ark-border text-sm text-slate-300 transition hover:bg-white/5 disabled:opacity-40',
  accent:
    'inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-ark-accent/40 bg-ark-accent/10 text-xs font-semibold text-ark-accent transition hover:bg-ark-accent/20 disabled:opacity-50',
  ghost:
    'inline-flex items-center justify-center rounded-lg border border-ark-border text-xs font-semibold text-ark-text transition hover:border-ark-accent/50 hover:text-ark-accent disabled:opacity-50',
  link: 'inline-flex items-center justify-center font-semibold text-ark-accent underline-offset-2 hover:underline disabled:opacity-50',
  dangerGhost:
    'inline-flex items-center justify-center text-xs text-slate-500 underline-offset-2 hover:text-red-300 hover:underline disabled:opacity-50',
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'px-3 py-1.5 text-xs',
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'outline', size = 'sm', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        variantClasses[variant],
        variant !== 'link' && variant !== 'dangerGhost' && sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
});
