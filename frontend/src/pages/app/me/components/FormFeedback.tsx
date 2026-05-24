import { cn } from '@/lib/cn';

export function FormFeedback({ type, message }: { type: 'error' | 'success'; message: string }) {
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-lg border px-3 py-2 text-sm',
        type === 'error'
          ? 'border-red-500/25 bg-red-500/10 text-red-200'
          : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
      )}
    >
      {message}
    </div>
  );
}
