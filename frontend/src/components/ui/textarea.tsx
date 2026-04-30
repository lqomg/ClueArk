import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          'box-border w-full rounded-lg border border-ark-border bg-ark-bg px-3 py-2 text-sm text-white outline-none transition focus:border-ark-accent/40 focus:ring-1 focus:ring-ark-accent disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);
