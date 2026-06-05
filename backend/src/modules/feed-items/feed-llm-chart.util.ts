import type { FeedLlmView } from './feed-item-llm.service';

export type ChartKeyword = { name: string; count: number };

/** 按 tagKey 跨语言计数；展示名取 viewer locale 下对应 tags 文案 */
export function aggregateChartKeywordsFromViews(
  views: Array<FeedLlmView | null | undefined>,
): ChartKeyword[] {
  const countByKey = new Map<string, number>();
  const labelByKey = new Map<string, string>();

  for (const view of views) {
    if (!view?.tagKeys?.length) continue;
    const tags = view.tags ?? [];
    for (let i = 0; i < view.tagKeys.length; i++) {
      const key = view.tagKeys[i]?.trim();
      if (!key) continue;
      countByKey.set(key, (countByKey.get(key) ?? 0) + 1);
      if (!labelByKey.has(key)) {
        const label = tags[i]?.trim() || key;
        labelByKey.set(key, label);
      }
    }
  }

  return [...countByKey.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 16)
    .map(([key, count]) => ({ name: labelByKey.get(key) ?? key, count }));
}
