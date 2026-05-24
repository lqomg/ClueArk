import type { ReactNode } from 'react';
import { formatTimelineStampParts } from '@/lib/datetime';

export function timelineStampNode(publishedAt: string, timeZone: string): ReactNode {
  const parts = formatTimelineStampParts(publishedAt, timeZone);
  if (!parts) {
    return <span className="block text-[10px] leading-snug text-slate-500 sm:text-[11px]">时间未知</span>;
  }
  return (
    <time dateTime={publishedAt} className="block font-mono text-[12px] leading-snug text-slate-400 sm:text-[14px]">
      <span className="block text-slate-500">{parts.datePart}</span>
      <span className="block">{parts.timePart}</span>
    </time>
  );
}
