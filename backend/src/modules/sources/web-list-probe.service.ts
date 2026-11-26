import { Inject, Injectable } from '@nestjs/common';
import { LLM_CHAT } from '../llm/llm.tokens';
import type { LlmChatPort } from '../llm/llm.types';
import { LoggerService } from '../logger';
import {
  extractWebSourceItems,
  type ExtractedWebSourceItem,
} from '../feed-items/web-source-extract.util';
import { fetchHtmlPage } from './fetch-html.util';
import {
  compactHtmlForWebListLlm,
  normalizeWebListSelectors,
  scoreWebListExtraction,
  webListSelectorSystemPrompt,
  webListSelectorUserPrompt,
  type WebListSelectors,
} from './web-list-accept.util';

export type CrawlSelectorsShape = {
  item: string;
  link: string;
  title: string;
  summary?: string;
  date?: string;
};

export type WebListProbeSample = {
  title: string;
  link: string;
  publishedAt: string | null;
};

export type WebListProbeResult = {
  ok: boolean;
  pageUrl: string;
  /** 开源 crawler / Source.web.crawlSelectors 形状 */
  crawlSelectors: CrawlSelectorsShape | null;
  /** 闭源 LLM 字段形状（便于对照） */
  selectors: WebListSelectors | null;
  score: {
    goodCount: number;
    withTime: number;
    error?: string;
  };
  samples: WebListProbeSample[];
  notes?: string;
  error?: string;
  retried?: boolean;
};

function toCrawlSelectors(sel: WebListSelectors): CrawlSelectorsShape {
  return {
    item: sel.listItemSelector,
    link: sel.linkSelector,
    title: sel.titleSelector,
    ...(sel.publishedAtSelector ? { date: sel.publishedAtSelector } : {}),
  };
}

function fromCrawlSelectors(cs: {
  item?: string;
  link?: string;
  title?: string;
  summary?: string;
  date?: string;
}): WebListSelectors {
  return normalizeWebListSelectors({
    listItemSelector: cs.item,
    linkSelector: cs.link,
    titleSelector: cs.title,
    publishedAtSelector: cs.date,
    notes: '',
  });
}

function toSamples(items: ExtractedWebSourceItem[], limit = 8): WebListProbeSample[] {
  return items.slice(0, limit).map((it) => ({
    title: String(it.title ?? '').slice(0, 200),
    link: String(it.link ?? '').slice(0, 2048),
    publishedAt:
      it.publishedAt instanceof Date && !Number.isNaN(it.publishedAt.getTime())
        ? it.publishedAt.toISOString()
        : null,
  }));
}

function extractWithSelectors(
  html: string,
  pageUrl: string,
  sel: WebListSelectors,
): ExtractedWebSourceItem[] {
  return extractWebSourceItems({
    html,
    baseUrl: pageUrl,
    mode: 'list',
    listItemSelector: sel.listItemSelector,
    linkSelector: sel.linkSelector || undefined,
    titleSelector: sel.titleSelector || undefined,
    publishedAtSelector: sel.publishedAtSelector || undefined,
    maxItems: 80,
  });
}

@Injectable()
export class WebListProbeService {
  private readonly logger: LoggerService;

  constructor(
    @Inject(LLM_CHAT) private readonly llm: LlmChatPort,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService.createLogger(WebListProbeService.name);
  }

  private async proposeSelectors(
    pageUrl: string,
    html: string,
  ): Promise<{ ok: true; selectors: WebListSelectors } | { ok: false; error: string }> {
    const compact = compactHtmlForWebListLlm(html);
    try {
      const data = await this.llm.completeJson<Partial<WebListSelectors>>(
        webListSelectorSystemPrompt(),
        webListSelectorUserPrompt(pageUrl, compact),
      );
      const selectors = normalizeWebListSelectors(data);
      if (!selectors.listItemSelector) {
        return { ok: false, error: 'html_list_selector_failed' };
      }
      return { ok: true, selectors };
    } catch (e) {
      this.logger.warn({
        message: 'web_list_selector_llm_failed',
        pageUrl,
        err: e instanceof Error ? e.message : String(e),
      });
      return { ok: false, error: 'html_list_selector_failed' };
    }
  }

  /**
   * 拉取列表页 → LLM 提议选择器（或使用传入选择器）→ 抽取并验收。
   * 验收失败时会再请 LLM 一次。
   */
  async probe(input: {
    url: string;
    crawlSelectors?: Partial<CrawlSelectorsShape> | null;
  }): Promise<WebListProbeResult> {
    const fetched = await fetchHtmlPage(input.url);
    if (!fetched.ok) {
      return {
        ok: false,
        pageUrl: fetched.finalUrl || input.url,
        crawlSelectors: null,
        selectors: null,
        score: { goodCount: 0, withTime: 0, error: fetched.error || 'fetch_failed' },
        samples: [],
        error: fetched.error || 'fetch_failed',
      };
    }

    const pageUrl = fetched.finalUrl;
    const provided = input.crawlSelectors;
    const hasProvided =
      Boolean(provided?.item?.trim()) &&
      Boolean(provided?.link?.trim()) &&
      Boolean(provided?.title?.trim());

    let selectors: WebListSelectors;
    let retried = false;

    if (hasProvided) {
      selectors = fromCrawlSelectors({
        item: provided!.item!,
        link: provided!.link!,
        title: provided!.title!,
        summary: provided?.summary,
        date: provided?.date,
      });
    } else {
      const proposed = await this.proposeSelectors(pageUrl, fetched.html);
      if (proposed.ok === false) {
        return {
          ok: false,
          pageUrl,
          crawlSelectors: null,
          selectors: null,
          score: { goodCount: 0, withTime: 0, error: proposed.error },
          samples: [],
          error: proposed.error,
        };
      }
      selectors = proposed.selectors;
    }

    let items = extractWithSelectors(fetched.html, pageUrl, selectors);
    let scored = scoreWebListExtraction(items);

    if (!scored.ok && !hasProvided) {
      retried = true;
      const retry = await this.proposeSelectors(pageUrl, fetched.html);
      if (retry.ok) {
        items = extractWithSelectors(fetched.html, pageUrl, retry.selectors);
        scored = scoreWebListExtraction(items);
        if (scored.ok) selectors = retry.selectors;
      }
    }

    const crawlSelectors = toCrawlSelectors(selectors);
    return {
      ok: scored.ok,
      pageUrl,
      crawlSelectors,
      selectors,
      score: {
        goodCount: scored.goodItems.length,
        withTime: scored.withTime,
        ...(scored.error ? { error: scored.error } : {}),
      },
      samples: toSamples(scored.goodItems.length ? scored.goodItems : items),
      notes: selectors.notes || undefined,
      ...(scored.ok ? {} : { error: scored.error || 'html_list_too_few_items' }),
      retried,
    };
  }
}
