import { Link } from 'react-router-dom';
import type { NotificationItem } from '@/types/models';
import { Drawer, Button } from '@/components/ui';
import { relTimeIso } from '@/lib/datetime';

function reasonBlock(n: NotificationItem): string {
  if (n.recommendReason.trim()) return n.recommendReason.trim();
  if (n.llmStatus === 'pending' || n.llmStatus === 'processing') return '推荐理由生成中…';
  if (n.llmStatus === 'failed') return '推荐理由生成失败';
  return '暂无推荐理由';
}

export function NotificationDetailDrawer({
  item,
  open,
  onClose,
  onMarkRead,
  marking,
}: {
  item: NotificationItem | null;
  open: boolean;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  marking: boolean;
}) {
  if (!item) return null;
  const monitorLabel = item.monitorTitle.trim() || item.monitorId;
  const timelineTo = `/app/monitors/${encodeURIComponent(item.monitorId)}/timeline`;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="通知详情"
      description={monitorLabel}
      panelClassName="sm:max-w-lg"
      footer={
        <div className="flex flex-wrap gap-2">
          <Link to={timelineTo} onClick={onClose}>
            <Button type="button" variant="primary" size="sm">
              打开时间线
            </Button>
          </Link>
          {item.link ? (
            <a href={item.link} target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="outline" size="sm">
                阅读原文
              </Button>
            </a>
          ) : null}
          {!item.readAt ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={marking}
              onClick={() => onMarkRead(item.id)}
            >
              标为已读
            </Button>
          ) : (
            <span className="self-center text-[11px] text-slate-500">已读</span>
          )}
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        {item.sourceDisplayName ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">信源</p>
            <p className="mt-1 text-slate-300">{item.sourceDisplayName}</p>
          </div>
        ) : null}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">标题</p>
          <p className="mt-1 font-medium leading-snug text-slate-100">{item.title}</p>
        </div>
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-950/20 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600/90">推荐理由</p>
          <p className="mt-1 leading-relaxed text-emerald-100/90">{reasonBlock(item)}</p>
        </div>
        {item.summaryPreview ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">摘要</p>
            <p className="mt-1 leading-relaxed text-slate-400">{item.summaryPreview}</p>
          </div>
        ) : null}
        <p className="text-[11px] text-slate-500">
          {item.createdAt ? relTimeIso(item.createdAt) : '—'}
          <span className="text-slate-600"> · </span>
          <span className="text-slate-600">匹配度 {item.score.toFixed(2)}</span>
        </p>
      </div>
    </Drawer>
  );
}
