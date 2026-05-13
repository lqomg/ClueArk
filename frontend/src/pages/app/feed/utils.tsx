import type { ReactNode } from 'react';
import { formatTimelineStampParts } from '@/lib/datetime';

/** 时间轴左侧节点：月日 + 时分，两行省宽（按用户时区） */
export function timelineStampNode(publishedAt: string | null | undefined, timeZone: string): ReactNode {
  const parts = formatTimelineStampParts(publishedAt, timeZone);
  if (!parts) {
    return <span className="block text-[10px] leading-snug text-slate-500 sm:text-[11px]">时间未知</span>;
  }
  return (
    <time
      dateTime={publishedAt ?? undefined}
      className="block font-mono text-[12px] leading-snug text-slate-400 sm:text-[14px]"
    >
      <span className="block text-slate-500">{parts.datePart}</span>
      <span className="block">{parts.timePart}</span>
    </time>
  );
}
