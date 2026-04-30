/** 卡片顶行：短绝对时间（与 toLocaleString 一致，供悬停与远期展示） */
function feedCardAbsoluteShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 卡片顶行时间：近期为中文相对文案（刚刚 / N分钟前 / N小时前 / N天前），较久回退绝对时间。
 * `absolute` 用于 title / 无障碍，与 `display` 在远期一致。
 */
export function formatFeedCardHeaderRelative(
  iso: string | null | undefined,
  fallbackIso: string | undefined,
): { display: string; absolute: string } {
  const raw = iso ?? fallbackIso;
  if (!raw) return { display: '时间未知', absolute: '' };
  const d = new Date(raw);
  const t = d.getTime();
  if (Number.isNaN(t)) return { display: '时间未知', absolute: '' };

  const absolute = feedCardAbsoluteShort(raw);
  const diff = Date.now() - t;
  if (diff < 0) return { display: absolute, absolute };

  if (diff < 60_000) return { display: '刚刚', absolute };

  if (diff < 3600_000) {
    const min = Math.floor(diff / 60_000);
    if (min >= 45) return { display: '最近1小时内', absolute };
    return { display: `${min}分钟前`, absolute };
  }

  if (diff < 86_400_000) {
    const hr = Math.floor(diff / 3600_000);
    return { display: `${hr}小时前`, absolute };
  }

  const day = Math.floor(diff / 86_400_000);
  if (day < 7) return { display: `${day}天前`, absolute };

  return { display: absolute, absolute };
}

export function formatClusterTimeHint(earliestIso: string | null | undefined): string {
  if (!earliestIso) return '';
  const t = new Date(earliestIso).getTime();
  if (Number.isNaN(t)) return '';
  const diffH = Math.floor((Date.now() - t) / 3600000);
  if (diffH < 1) return '最早 1 小时内';
  if (diffH < 48) return `最早 ${diffH} 小时前`;
  const d = Math.floor(diffH / 24);
  return `最早 ${d} 天前`;
}

/** 时间轴左侧节点：月日 + 时分，两行省宽 */
export function timelineStampNode(publishedAt: string | null | undefined) {
  if (!publishedAt) {
    return <span className="block text-[10px] leading-snug text-slate-500 sm:text-[11px]">时间未知</span>;
  }
  const d = new Date(publishedAt);
  if (Number.isNaN(d.getTime())) {
    return <span className="block text-[10px] leading-snug text-slate-500 sm:text-[11px]">时间未知</span>;
  }
  const datePart = d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
  const timePart = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return (
    <time
      dateTime={publishedAt}
      className="block font-mono text-[12px] leading-snug text-slate-400 sm:text-[14px]"
    >
      <span className="block text-slate-500">{datePart}</span>
      <span className="block">{timePart}</span>
    </time>
  );
}
