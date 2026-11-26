import type { ExtractedWebSourceItem } from '../feed-items/web-source-extract.util';

export type WebListSelectors = {
  listItemSelector: string;
  linkSelector: string;
  titleSelector: string;
  publishedAtSelector: string;
  notes: string;
};

const NAV_TITLE_RE = /首页|登录|注册|更多|返回|导航|分享|English|网站地图|繁體/;

export function compactHtmlForWebListLlm(html: string, maxChars = 60_000): string {
  let t = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ');
  if (t.length > maxChars) t = `${t.slice(0, maxChars)}\n<!-- truncated -->`;
  return t;
}

export function normalizeWebListSelectors(raw: Partial<WebListSelectors> | null | undefined): WebListSelectors {
  return {
    listItemSelector: String(raw?.listItemSelector ?? '').trim(),
    linkSelector: String(raw?.linkSelector ?? '').trim(),
    titleSelector: String(raw?.titleSelector ?? '').trim(),
    publishedAtSelector: String(raw?.publishedAtSelector ?? '').trim(),
    notes: String(raw?.notes ?? '').trim().slice(0, 500),
  };
}

export function isGoodWebListItem(item: ExtractedWebSourceItem): boolean {
  const title = item.title?.trim() ?? '';
  const link = item.link?.trim() ?? '';
  if (title.length < 8 || title.length > 160) return false;
  if (!/^https?:\/\//i.test(link)) return false;
  if (NAV_TITLE_RE.test(title)) return false;
  if (/^https?:\/\//i.test(title)) return false;
  if (title === link) return false;
  return true;
}

export type WebListExtractScore = {
  ok: boolean;
  goodItems: ExtractedWebSourceItem[];
  /** 可用作「发布时间」的条数（排除未来日 / 截止日误抽） */
  withTime: number;
  error?: string;
};

/** 与入库侧一致：仅容忍轻微时钟偏差；更晚视为不可信的「未来发布时间」 */
const WEB_LIST_FUTURE_GRACE_MS = 120_000;

function isUsablePublicationTime(d: Date, now: Date): boolean {
  return d.getTime() <= now.getTime() + WEB_LIST_FUTURE_GRACE_MS;
}

/**
 * 验收：至少 5 条合格标题+链接，且至少同等数量带「过去或现在的发布时间」。
 * 未来日（政策截止日列等）不算有效 publishedAt；中位过旧则 stale。
 */
export function scoreWebListExtraction(
  items: ExtractedWebSourceItem[],
  opts?: { minGood?: number; maxAgeYears?: number; now?: Date },
): WebListExtractScore {
  const minGood = opts?.minGood ?? 5;
  const maxAgeYears = opts?.maxAgeYears ?? 3;
  const now = opts?.now ?? new Date();
  const goodItems = items.filter(isGoodWebListItem);

  const parsedDates = goodItems
    .map((i) => i.publishedAt)
    .filter((d): d is Date => d instanceof Date && !Number.isNaN(d.getTime()));
  const usableDated = parsedDates
    .filter((d) => isUsablePublicationTime(d, now))
    .sort((a, b) => a.getTime() - b.getTime());
  const withTime = usableDated.length;
  const futureCount = parsedDates.length - usableDated.length;

  if (goodItems.length < minGood) {
    return {
      ok: false,
      goodItems,
      withTime,
      error: 'html_list_too_few_items',
    };
  }

  if (withTime < minGood) {
    // 抽得出足够多 Date，但多数落在未来 → 典型是 Deadline/生效日列，不是发布时间
    if (futureCount > 0 && parsedDates.length >= minGood) {
      return {
        ok: false,
        goodItems,
        withTime,
        error: 'html_list_future_or_deadline_dates',
      };
    }
    return {
      ok: false,
      goodItems,
      withTime,
      error: 'html_list_missing_dates',
    };
  }

  if (usableDated.length >= Math.min(3, goodItems.length)) {
    const median = usableDated[Math.floor(usableDated.length / 2)]!;
    const cutoff = now.getTime() - maxAgeYears * 365.25 * 24 * 3600 * 1000;
    if (median.getTime() < cutoff) {
      return { ok: false, goodItems, withTime, error: 'html_list_stale' };
    }
  }

  return { ok: true, goodItems, withTime };
}

export function webListSelectorSystemPrompt(): string {
  return `你是网页列表抽取工程师。给定一个「通知/新闻/公告」列表页的 HTML 片段，输出用于 CSS 选择器抽取的 JSON。
要求：
1. listItemSelector 必须选中「每一条列表项」的重复节点（如 li、tr、.list-item），不要选整个 ul/table。
2. linkSelector / titleSelector / publishedAtSelector 相对 list item。
3. publishedAtSelector 必须指向每条的「发布/公告时间」节点，禁止指向生效日、截止日、Deadline、合规日历列；若页面只有截止/生效日而没有发布时间，publishedAtSelector 必须留空并在 notes 说明（系统会拒收）。
4. 页面有真实发布日期却抽不到时不要空着糊弄。
5. 选择器尽量稳定（class/语义标签优先），避免 html>body>div:nth-child 脆路径。
6. notes 用简短中文说明选择器意图。`;
}

export function webListSelectorUserPrompt(pageUrl: string, compactHtml: string): string {
  return `页面 URL: ${pageUrl}

请为「公告/新闻列表」生成选择器。

HTML:
${compactHtml}`;
}
