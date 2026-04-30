/**
 * 部分 RSS 的 pubDate/isoDate 把「本地钟表时间」误标为 GMT/UTC，
 * 标准解析会得到错误绝对时间。此处按 feed 根域名做可配置偏移修正。
 *
 * 新增信源：在本数组追加一项即可（hostSuffix + offsetMs + reason）。
 */
export type RssPublishedAtFeedRule = {
  /** 与 `new URL(feedUrl).hostname` 全小写比较：完全相等或为其子域（*.suffix） */
  hostSuffix: string;
  /** 在 rss-parser 解析得到的 Date 上增加的量（毫秒）。InfoQ 误标 GMT 用 -8h。 */
  offsetMs: number;
  /** 供维护者阅读，不参与逻辑 */
  reason: string;
};

export const RSS_PUBLISHED_AT_FEED_RULES: readonly RssPublishedAtFeedRule[] = [
  {
    hostSuffix: 'infoq.cn',
    offsetMs: -8 * 60 * 60 * 1000,
    reason: 'pubDate 使用中国本地钟点却标 GMT；按 UTC 解析会晚 8 小时',
  },
];

function hostnameFromFeedUrl(feedUrl: string): string | null {
  const t = feedUrl?.trim();
  if (!t) return null;
  try {
    return new URL(t).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function hostMatchesRule(hostname: string, hostSuffix: string): boolean {
  const h = hostname;
  const s = hostSuffix.toLowerCase();
  return h === s || h.endsWith(`.${s}`);
}

/** 按 feed URL 的 hostname 应用首条匹配规则；无匹配则原样返回 */
export function applyRssPublishedAtFeedCorrection(feedUrl: string, publishedAt: Date | null): Date | null {
  if (publishedAt == null || Number.isNaN(publishedAt.getTime())) return publishedAt;
  const host = hostnameFromFeedUrl(feedUrl);
  if (!host) return publishedAt;
  for (let i = 0; i < RSS_PUBLISHED_AT_FEED_RULES.length; i++) {
    const rule = RSS_PUBLISHED_AT_FEED_RULES[i];
    if (hostMatchesRule(host, rule.hostSuffix)) {
      return new Date(publishedAt.getTime() + rule.offsetMs);
    }
  }
  return publishedAt;
}
