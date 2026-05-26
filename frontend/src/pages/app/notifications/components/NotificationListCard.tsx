import type { NotificationItem } from '@/types/models';
import { relTimeIso } from '@/lib/datetime';

function reasonOneLine(n: NotificationItem): string | null {
  if (n.recommendReason.trim()) return n.recommendReason.trim();
  if (n.llmStatus === 'pending' || n.llmStatus === 'processing') return '推荐理由生成中…';
  return null;
}

export function NotificationListCard({
  item: n,
  onOpen,
}: {
  item: NotificationItem;
  onOpen: () => void;
}) {
  const monitorLabel = n.monitorTitle.trim() || '未命名监控';
  const reason = reasonOneLine(n);
  const metaParts: string[] = [];
  if (n.sourceDisplayName.trim()) metaParts.push(n.sourceDisplayName.trim());
  if (reason) metaParts.push(reason);

  return (
    <button
      type="button"
      className={`w-full rounded-lg border px-3 py-2.5 text-left transition hover:border-ark-accent/40 ${
        n.readAt
          ? 'border-ark-border bg-ark-surface/30'
          : 'border-ark-accent/30 bg-ark-accent/[0.06]'
      }`}
      onClick={onOpen}
    >
      <div className="flex items-start gap-2">
        <div
          className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
            n.readAt ? 'bg-transparent' : 'bg-ark-accent'
          }`}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="min-w-0 truncate text-[11px] font-medium text-ark-accent">{monitorLabel}</p>
            <span className="shrink-0 text-[10px] tabular-nums text-slate-600">
              {n.createdAt ? relTimeIso(n.createdAt) : '—'}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-1 text-sm font-medium leading-snug text-slate-100">{n.title}</p>
          {metaParts.length > 0 ? (
            <p className="mt-0.5 line-clamp-1 text-[12px] leading-snug text-slate-500">{metaParts.join(' · ')}</p>
          ) : null}
        </div>
      </div>
    </button>
  );
}
