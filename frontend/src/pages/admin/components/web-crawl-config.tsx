import { FormField, Input } from '@/components/ui';
import { cn } from '@/lib/cn';

/** 爬虫：列表页 + 列表解析选择器（与后端 web.crawl* 对齐） */
export type WebCrawlFormValues = {
  crawlListUrl: string;
  item: string;
  link: string;
  title: string;
  summary: string;
  date: string;
};

export const WEB_CRAWL_INITIAL: WebCrawlFormValues = {
  crawlListUrl: '',
  item: '',
  link: '',
  title: '',
  summary: '',
  date: '',
};

/**
 * 组装 PATCH/POST 用的 `web` 对象（不含 url 时由调用方保证传入 url）。
 * 编辑态需传入 had* 以便清空曾保存过的 crawl 字段。
 */
export function buildWebCrawlPayload(
  url: string,
  v: WebCrawlFormValues,
  ctx:
    | { mode: 'create' }
    | { mode: 'edit'; hadCrawlListUrl: boolean; hadCrawlSelectors: boolean },
): Record<string, unknown> {
  const web: Record<string, unknown> = { url: url.trim() };
  const selOk =
    v.item.trim().length > 0 && v.link.trim().length > 0 && v.title.trim().length > 0;

  if (ctx.mode === 'create') {
    if (v.crawlListUrl.trim()) web.crawlListUrl = v.crawlListUrl.trim();
    if (selOk) {
      web.crawlSelectors = {
        item: v.item.trim(),
        link: v.link.trim(),
        title: v.title.trim(),
        ...(v.summary.trim() ? { summary: v.summary.trim() } : {}),
        ...(v.date.trim() ? { date: v.date.trim() } : {}),
      };
    }
    return web;
  }

  if (v.crawlListUrl.trim()) web.crawlListUrl = v.crawlListUrl.trim();
  else if (ctx.hadCrawlListUrl) web.crawlListUrl = '';
  if (selOk) {
    web.crawlSelectors = {
      item: v.item.trim(),
      link: v.link.trim(),
      title: v.title.trim(),
      ...(v.summary.trim() ? { summary: v.summary.trim() } : {}),
      ...(v.date.trim() ? { date: v.date.trim() } : {}),
    };
  } else if (ctx.hadCrawlSelectors) {
    web.crawlSelectors = null;
  }
  return web;
}

function patchField<K extends keyof WebCrawlFormValues>(
  onChange: (patch: Partial<WebCrawlFormValues>) => void,
  key: K,
  value: WebCrawlFormValues[K],
) {
  onChange({ [key]: value } as Partial<WebCrawlFormValues>);
}

/** 表单内区块：低对比边框，避免「发白」描边 */
export const adminFormSectionClass =
  'rounded-xl border border-white/[0.055] bg-slate-950/25 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]';

export function WebCrawlConfigFields({
  values,
  onChange,
  variant,
  idPrefix = 'crawl',
  className,
}: {
  values: WebCrawlFormValues;
  onChange: (patch: Partial<WebCrawlFormValues>) => void;
  /** dialog：抽屉/弹窗内更紧凑 */
  variant: 'page' | 'dialog';
  /** 避免同页多实例 id 冲突 */
  idPrefix?: string;
  className?: string;
}) {
  const compact = variant === 'dialog';
  const inputCls = compact ? 'py-1.5 text-xs' : '';
  const pad = compact ? 'p-3 sm:p-4' : 'p-4 sm:p-5';

  return (
    <section className={cn(adminFormSectionClass, pad, className)} aria-labelledby={`${idPrefix}-heading`}>
      <div className="border-b border-white/[0.06] pb-3">
        <h2 id={`${idPrefix}-heading`} className="text-sm font-semibold text-white">
          Web 爬虫
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          独立爬虫服务按「列表页」拉 HTML；<span className="text-ark-muted">item / link / title</span> 三项都填才会把选择器下发给爬虫，否则使用内置弱默认。
        </p>
      </div>

      <div className={compact ? 'mt-3 space-y-3' : 'mt-5 space-y-5'}>
        <FormField label="列表页 URL（选填）" id={`${idPrefix}-list`}>
          <Input
            id={`${idPrefix}-list`}
            mono
            className={inputCls}
            value={values.crawlListUrl}
            onChange={(e) => patchField(onChange, 'crawlListUrl', e.target.value)}
            placeholder="留空则与站点网址相同"
          />
          <p className="text-[11px] leading-snug text-slate-500">与「站点网址」可不同，例如频道列表页。</p>
        </FormField>

        <details className="group rounded-lg border border-white/[0.05] bg-slate-950/20 open:border-white/[0.08]">
          <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-medium text-ark-text transition marker:content-none hover:bg-white/[0.03] sm:px-4 sm:py-3 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-2">
              <span>列表解析 · CSS 选择器（选填）</span>
              <span className="shrink-0 text-[10px] font-normal text-slate-500 group-open:hidden">展开</span>
              <span className="hidden shrink-0 text-[10px] font-normal text-slate-500 group-open:inline">收起</span>
            </span>
          </summary>
          <div className={`border-t border-white/[0.05] px-3 pb-3 sm:px-4 sm:pb-4 ${compact ? 'pt-2' : 'pt-3'}`}>
            <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
              选择器均相对于每条 <code className="text-ark-muted">item</code> 根节点。摘要、日期可不填。
            </p>
            <div className={`grid gap-3 ${compact ? '' : 'sm:gap-4'}`}>
              <FormField label="item（每条列表根）" id={`${idPrefix}-item`}>
                <Input
                  id={`${idPrefix}-item`}
                  mono
                  className={inputCls}
                  value={values.item}
                  onChange={(e) => patchField(onChange, 'item', e.target.value)}
                  placeholder=".article_list > .picture_text"
                />
              </FormField>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="link" id={`${idPrefix}-link`}>
                  <Input
                    id={`${idPrefix}-link`}
                    mono
                    className={inputCls}
                    value={values.link}
                    onChange={(e) => patchField(onChange, 'link', e.target.value)}
                    placeholder="h4 a"
                  />
                </FormField>
                <FormField label="title" id={`${idPrefix}-title`}>
                  <Input
                    id={`${idPrefix}-title`}
                    mono
                    className={inputCls}
                    value={values.title}
                    onChange={(e) => patchField(onChange, 'title', e.target.value)}
                    placeholder="h4 a"
                  />
                </FormField>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="summary（选填）" id={`${idPrefix}-summary`}>
                  <Input
                    id={`${idPrefix}-summary`}
                    mono
                    className={inputCls}
                    value={values.summary}
                    onChange={(e) => patchField(onChange, 'summary', e.target.value)}
                    placeholder=".text_box > p"
                  />
                </FormField>
                <FormField label="date（选填）" id={`${idPrefix}-date`}>
                  <Input
                    id={`${idPrefix}-date`}
                    mono
                    className={inputCls}
                    value={values.date}
                    onChange={(e) => patchField(onChange, 'date', e.target.value)}
                    placeholder="span.time"
                  />
                </FormField>
              </div>
            </div>
          </div>
        </details>
      </div>
    </section>
  );
}

/** 站点网址（提交时由表单做 http(s) 格式校验） */
export function WebSiteUrlField({
  value,
  onChange,
  urlHint,
  urlOk,
  required,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  urlHint?: string | null;
  urlOk?: boolean | null;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(adminFormSectionClass, 'p-4 sm:p-5', className)}>
      <h2 className="text-sm font-semibold text-white">站点</h2>
      <p className="mt-1 text-xs text-slate-500">用于打开站点、条目链接归一化与去重（itemKey）；可与列表页 URL 不同。</p>
      <div className="mt-4">
        <FormField label={required ? '站点网址（必填）' : '站点网址'} id="web-site-url">
          <Input
            id="web-site-url"
            mono
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={Boolean(required)}
            placeholder="https://"
          />
          {urlHint ? (
            <p className={`mt-1.5 text-xs ${urlOk ? 'text-emerald-400' : 'text-red-400'}`}>{urlHint}</p>
          ) : null}
        </FormField>
      </div>
    </div>
  );
}
