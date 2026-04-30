import type { ReactNode } from 'react';
import { Label } from './label';
import { cn } from '@/lib/cn';

export function FormField({
  label,
  id,
  children,
  className,
}: {
  label: string;
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
