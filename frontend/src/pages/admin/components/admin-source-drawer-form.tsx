import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { SourceAvatar } from '@/components/sources/SourceAvatar';
import { createAdminSource, patchAdminSource } from '@/api/admin/sources';
import { getSource, uploadSourceAvatar } from '@/api/sources';
import { Button, Checkbox, Drawer, FormField, Input, Select, Textarea } from '@/components/ui';
import type { SourceKind } from '@/types/models';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, placeholder } from '@codemirror/view';
import {
  WebCrawlConfigFields,
  WebSiteUrlField,
  adminFormSectionClass,
  buildWebCrawlPayload,
  type WebCrawlFormValues,
} from '@/pages/admin/components/web-crawl-config';
import { cn } from '@/lib/cn';

const sectionTitle = 'mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500';

/** 与后端 `url-check.util` 一致：仅允许 http(s) */
function isValidHttpUrl(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  try {
    const u = new URL(t);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export type AdminSourceDrawerMode = 'create' | 'edit';

export function AdminSourceDrawerForm({
  mode,
  editSourceId,
  onClose,
  onSaved,
}: {
  mode: AdminSourceDrawerMode;
  editSourceId: string | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const reactId = useId().replace(/:/g, '');
  const formId = `src-drawer-form-${reactId}`;

  const [kind, setKind] = useState<SourceKind>('web');
  const [displayName, setDisplayName] = useState('');
  const [webUrl, setWebUrl] = useState('');
  const [crawlListUrl, setCrawlListUrl] = useState('');
  const [crawlSelItem, setCrawlSelItem] = useState('');
  const [crawlSelLink, setCrawlSelLink] = useState('');
  const [crawlSelTitle, setCrawlSelTitle] = useState('');
  const [crawlSelSummary, setCrawlSelSummary] = useState('');
  const [crawlSelDate, setCrawlSelDate] = useState('');
  const initialHadCrawlListUrlRef = useRef(false);
  const initialHadCrawlSelectorsRef = useRef(false);
  const [rssFeedUrl, setRssFeedUrl] = useState('');
  const [rssSiteUrl, setRssSiteUrl] = useState('');
  const [rssTitleHint, setRssTitleHint] = useState('');
  const [hotUrl, setHotUrl] = useState('');
  const [hotMapperText, setHotMapperText] = useState('');
  const [note, setNote] = useState('');
  const [cEnabled, setCEnabled] = useState(true);
  const [cSort, setCSort] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingSource, setLoadingSource] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarDragOver, setAvatarDragOver] = useState(false);
  const initialAvatarRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editIdRef = useRef<string | null>(null);

  const isCreate = mode === 'create';

  const hotMapperExtensions = useMemo(
    () => [
      javascript(),
      EditorView.lineWrapping,
      EditorView.theme(
        {
          '&': { backgroundColor: 'transparent' },
          '.cm-scroller': { backgroundColor: 'transparent' },
          '.cm-gutters': { backgroundColor: 'transparent' },
        },
        { dark: true },
      ),
      placeholder(
        `{\n  "itemsPath": "$.items",\n  "titlePath": "$.title",\n  "urlPath": "$.url",\n  "idPath": "$.id",\n  "pubDatePath": "$.pubDate",\n  "summaryPath": "$.extra.info"\n}`,
      ),
    ],
    [],
  );

  const resetCreateDefaults = useCallback(() => {
    setKind('web');
    setDisplayName('');
    setWebUrl('');
    setCrawlListUrl('');
    setCrawlSelItem('');
    setCrawlSelLink('');
    setCrawlSelTitle('');
    setCrawlSelSummary('');
    setCrawlSelDate('');
    initialHadCrawlListUrlRef.current = false;
    initialHadCrawlSelectorsRef.current = false;
    setRssFeedUrl('');
    setRssSiteUrl('');
    setRssTitleHint('');
    setHotUrl('');
    setHotMapperText('');
    setNote('');
    setCEnabled(true);
    setCSort('0');
    setError(null);
    setLoadError(null);
    setAvatarUrl(null);
    initialAvatarRef.current = null;
    editIdRef.current = null;
  }, []);

  useEffect(() => {
    if (mode === 'create') {
      resetCreateDefaults();
      return;
    }
    if (mode !== 'edit' || !editSourceId) return;
    let cancelled = false;
    editIdRef.current = editSourceId;
    setError(null);
    setLoadError(null);
    setLoadingSource(true);
    (async () => {
      try {
        const s = await getSource(editSourceId);
        if (cancelled || editIdRef.current !== editSourceId) return;
        setKind(s.kind);
        setDisplayName(s.displayName);
        setWebUrl(s.web?.url ?? '');
        setCrawlListUrl(s.web?.crawlListUrl ?? '');
        const cs = s.web?.crawlSelectors;
        setCrawlSelItem(cs?.item ?? '');
        setCrawlSelLink(cs?.link ?? '');
        setCrawlSelTitle(cs?.title ?? '');
        setCrawlSelSummary(cs?.summary ?? '');
        setCrawlSelDate(cs?.date ?? '');
        initialHadCrawlListUrlRef.current = Boolean(s.web?.crawlListUrl?.trim());
        initialHadCrawlSelectorsRef.current = Boolean(cs?.item?.trim() && cs?.link?.trim() && cs?.title?.trim());
        setRssFeedUrl(s.rss?.feedUrl ?? '');
        setRssSiteUrl(s.rss?.siteUrl ?? '');
        setRssTitleHint(s.rss?.titleHint ?? '');
        setHotUrl(s.hot?.url ?? '');
        setHotMapperText(s.hot?.mapper ? JSON.stringify(s.hot.mapper, null, 2) : '');
        setNote(s.note ?? '');
        const av = s.avatarUrl ?? null;
        setAvatarUrl(av);
        initialAvatarRef.current = av;
      } catch {
        if (!cancelled) setLoadError('加载信源失败');
      } finally {
        if (!cancelled) setLoadingSource(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, editSourceId, resetCreateDefaults]);

  const crawlFormValues = useMemo(
    () => ({
      crawlListUrl,
      item: crawlSelItem,
      link: crawlSelLink,
      title: crawlSelTitle,
      summary: crawlSelSummary,
      date: crawlSelDate,
    }),
    [crawlListUrl, crawlSelItem, crawlSelLink, crawlSelTitle, crawlSelSummary, crawlSelDate],
  );

  const onCrawlFormChange = useCallback((patch: Partial<WebCrawlFormValues>) => {
    if (patch.crawlListUrl !== undefined) setCrawlListUrl(patch.crawlListUrl);
    if (patch.item !== undefined) setCrawlSelItem(patch.item);
    if (patch.link !== undefined) setCrawlSelLink(patch.link);
    if (patch.title !== undefined) setCrawlSelTitle(patch.title);
    if (patch.summary !== undefined) setCrawlSelSummary(patch.summary);
    if (patch.date !== undefined) setCrawlSelDate(patch.date);
  }, []);

  function validateAll(): string | null {
    if (!displayName.trim()) return '请填写展示名称';
    if (kind === 'web') {
      if (!webUrl.trim()) return '网站信源请填写站点网址';
      if (!isValidHttpUrl(webUrl)) return '站点网址请输入有效的 http(s) 链接';
      if (crawlListUrl.trim() && !isValidHttpUrl(crawlListUrl)) {
        return '列表页地址格式无效，请输入有效的 http(s) 链接';
      }
    }
    if (kind === 'rss') {
      if (!rssFeedUrl.trim()) return 'RSS 请填写 Feed 地址';
      if (!isValidHttpUrl(rssFeedUrl)) return 'Feed 地址请输入有效的 http(s) 链接';
      if (rssSiteUrl.trim() && !isValidHttpUrl(rssSiteUrl)) {
        return '站点地址格式无效，请输入有效的 http(s) 链接';
      }
    }
    if (kind === 'hot_api') {
      if (!hotUrl.trim()) return '热点 API 请填写接口地址（https://…）';
      if (!isValidHttpUrl(hotUrl)) return '接口地址请输入有效的 http(s) 链接';
      const t = hotMapperText.trim();
      if (t) {
        try {
          const parsed = JSON.parse(t) as unknown;
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return 'mapper 必须是 JSON 对象';
          const itemsPath = (parsed as { itemsPath?: unknown }).itemsPath;
          if (typeof itemsPath !== 'string' || !itemsPath.trim()) return 'mapper.itemsPath 必填（例如：$.items）';
        } catch {
          return 'mapper 不是合法 JSON（请检查引号与逗号）';
        }
      }
    }
    return null;
  }

  function buildPatchBody(): Record<string, unknown> {
    let hotMapper: Record<string, unknown> | undefined;
    const base: Record<string, unknown> = {
      displayName: displayName.trim(),
      note: note.trim(),
    };
    if (kind === 'web') {
      base.web = buildWebCrawlPayload(webUrl, crawlFormValues, {
        mode: 'edit',
        hadCrawlListUrl: initialHadCrawlListUrlRef.current,
        hadCrawlSelectors: initialHadCrawlSelectorsRef.current,
      });
    }
    if (kind === 'rss') {
      base.rss = {
        feedUrl: rssFeedUrl.trim(),
        ...(rssSiteUrl.trim() ? { siteUrl: rssSiteUrl.trim() } : {}),
        ...(rssTitleHint.trim() ? { titleHint: rssTitleHint.trim() } : {}),
      };
    }
    if (kind === 'hot_api') {
      const t = hotMapperText.trim();
      if (t) {
        try {
          const parsed = JSON.parse(t) as unknown;
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('invalid');
          }
          hotMapper = parsed as Record<string, unknown>;
        } catch {
          // 交给 submit 的错误提示（避免在 build 中抛出影响 UI）
          hotMapper = undefined;
        }
      }
      base.hot = {
        url: hotUrl.trim(),
        ...(hotMapper ? { mapper: hotMapper } : {}),
      };
    }
    return base;
  }

  function buildCreateBody(): Record<string, unknown> {
    let hotMapper: Record<string, unknown> | undefined;
    const sortOrder = Number.parseInt(cSort, 10) || 0;
    const body: Record<string, unknown> = {
      kind,
      displayName: displayName.trim(),
      note: note.trim(),
      enabled: cEnabled,
      sortOrder,
    };
    if (kind === 'web') {
      body.web = buildWebCrawlPayload(webUrl, crawlFormValues, { mode: 'create' });
    }
    if (kind === 'rss') {
      body.rss = {
        feedUrl: rssFeedUrl.trim(),
        ...(rssSiteUrl.trim() ? { siteUrl: rssSiteUrl.trim() } : {}),
        ...(rssTitleHint.trim() ? { titleHint: rssTitleHint.trim() } : {}),
      };
    }
    if (kind === 'hot_api') {
      const t = hotMapperText.trim();
      if (t) {
        try {
          const parsed = JSON.parse(t) as unknown;
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('invalid');
          }
          hotMapper = parsed as Record<string, unknown>;
        } catch {
          hotMapper = undefined;
        }
      }
      body.hot = {
        url: hotUrl.trim(),
        ...(hotMapper ? { mapper: hotMapper } : {}),
      };
    }
    if (avatarUrl) body.avatarUrl = avatarUrl;
    return body;
  }

  async function uploadAvatar(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      setError('头像请小于 2MB');
      return;
    }
    const okType =
      file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/gif';
    if (!okType) {
      setError('仅支持 JPEG/PNG/WebP/GIF');
      return;
    }
    setAvatarUploading(true);
    setError(null);
    try {
      const { avatarUrl: next } = await uploadSourceAvatar(file);
      setAvatarUrl(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : '头像上传失败');
    } finally {
      setAvatarUploading(false);
    }
  }

  async function onAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await uploadAvatar(file);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const msg = validateAll();
    if (msg) {
      setError(msg);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      if (isCreate) {
        await createAdminSource(buildCreateBody());
      } else if (editSourceId) {
        const body: Record<string, unknown> = { ...buildPatchBody() };
        if (initialAvatarRef.current !== (avatarUrl ?? null)) {
          body.avatarUrl = avatarUrl ?? '';
        }
        await patchAdminSource(editSourceId, body);
      }
      await Promise.resolve(onSaved());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : isCreate ? '创建失败' : '保存失败');
    } finally {
      setSubmitting(false);
    }
  }

  const drawerTitle = isCreate ? '新建信源' : '编辑信源';
  const drawerDesc = isCreate ? '填写基础信息、连接方式与排序；网站信源可配置列表页与 CSS 选择器。' : '修改展示信息、连接与爬虫配置。';

  return (
    <Drawer
      open
      onClose={() => !submitting && onClose()}
      title={drawerTitle}
      description={drawerDesc}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="secondary" size="md" disabled={submitting} onClick={onClose}>
            取消
          </Button>
          <Button type="submit" form={formId} variant="primary" size="md" disabled={submitting || loadingSource}>
            {submitting ? (isCreate ? '创建中…' : '保存中…') : isCreate ? '创建' : '保存'}
          </Button>
        </div>
      }
    >
      {loadError ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{loadError}</div>
      ) : loadingSource && mode === 'edit' ? (
        <div className="py-12 text-center text-sm text-slate-500">加载中…</div>
      ) : (
        <>
          <div className="mb-5 flex items-center gap-3">
            <SourceAvatar
              kind={kind}
              name={displayName.trim() || (isCreate ? '新信源' : '信源')}
              avatarUrl={avatarUrl}
              size="md"
              className="shrink-0"
            />
            <p className="text-[11px] leading-snug text-slate-500">下方可上传头像；JPEG/PNG/WebP/GIF，最大 2MB。</p>
          </div>

          {error ? (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
          ) : null}

          <form id={formId} className="space-y-6 pb-2" onSubmit={(e) => void onSubmit(e)}>
            <div>
              <h3 className={sectionTitle}>基本信息</h3>
              <div className={cn(adminFormSectionClass, 'space-y-4 p-4')}>
                {isCreate ? (
                  <FormField label="类型" id={`${reactId}-kind`}>
                    <Select
                      id={`${reactId}-kind`}
                      className="w-full"
                      value={kind}
                      onChange={(e) => setKind(e.target.value as SourceKind)}
                    >
                      <option value="web">网站</option>
                      <option value="rss">RSS</option>
                      <option value="hot_api">热点 API</option>
                    </Select>
                  </FormField>
                ) : (
                  <FormField label="类型" id={`${reactId}-kind-ro`}>
                    <Select id={`${reactId}-kind-ro`} className="w-full opacity-80" value={kind} disabled>
                      <option value="web">网站</option>
                      <option value="rss">RSS</option>
                      <option value="hot_api">热点 API</option>
                    </Select>
                    <p className="mt-1 text-[11px] text-slate-500">编辑时不支持修改类型</p>
                  </FormField>
                )}
                <FormField label="展示名称" id={`${reactId}-name`}>
                  <Input
                    id={`${reactId}-name`}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="显示名称"
                  />
                </FormField>
                <div>
                  <p className="text-xs text-ark-muted">头像（选填）</p>
                  <div
                    className={cn(
                      'mt-2 rounded-xl border border-dashed px-3 py-3 transition',
                      avatarDragOver
                        ? 'border-ark-accent/70 bg-ark-accent/10'
                        : 'border-white/[0.10] bg-white/[0.02] hover:border-white/[0.16]',
                    )}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!avatarUploading && !submitting) setAvatarDragOver(true);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!avatarUploading && !submitting) setAvatarDragOver(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setAvatarDragOver(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setAvatarDragOver(false);
                      if (avatarUploading || submitting) return;
                      const f = e.dataTransfer.files?.[0];
                      if (!f) return;
                      void uploadAvatar(f);
                    }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="sr-only"
                        onChange={(ev) => void onAvatarFile(ev)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={avatarUploading || submitting}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {avatarUploading ? '上传中…' : avatarUrl ? '更换头像' : '上传头像'}
                      </Button>
                      <span className="text-[11px] text-slate-500">
                        {avatarDragOver ? '松开即可上传' : '支持拖拽图片到此处；JPEG/PNG/WebP/GIF，最大 2MB。'}
                      </span>
                      {avatarUrl ? (
                        <Button
                          type="button"
                          variant="dangerGhost"
                          size="sm"
                          disabled={submitting}
                          className="!text-slate-500 hover:!text-red-300"
                          onClick={() => setAvatarUrl(null)}
                        >
                          移除
                        </Button>
                      ) : null}
                  </div>
                    {avatarUrl ? (
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                        <span className="text-slate-300">已上传并应用到预览头像</span>
                        <a className="underline underline-offset-2 hover:text-slate-200" href={avatarUrl} target="_blank" rel="noreferrer">
                          在新标签页打开
                        </a>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {kind === 'web' ? (
              <div>
                <h3 className={sectionTitle}>网站与爬虫</h3>
                <div className="space-y-4">
                  <WebSiteUrlField value={webUrl} onChange={setWebUrl} required />
                  <WebCrawlConfigFields
                    idPrefix={`${reactId}-crawl`}
                    variant="dialog"
                    values={crawlFormValues}
                    onChange={onCrawlFormChange}
                  />
                </div>
              </div>
            ) : null}

            {kind === 'rss' ? (
              <div>
                <h3 className={sectionTitle}>RSS</h3>
                <div className={cn(adminFormSectionClass, 'space-y-4 p-4')}>
                  <FormField label="Feed 地址" id={`${reactId}-rss-feed`}>
                    <Input
                      id={`${reactId}-rss-feed`}
                      mono
                      value={rssFeedUrl}
                      onChange={(e) => setRssFeedUrl(e.target.value)}
                      placeholder="https://…/feed.xml"
                    />
                  </FormField>
                  <FormField label="站点（选填）" id={`${reactId}-rss-site`}>
                    <Input
                      id={`${reactId}-rss-site`}
                      mono
                      value={rssSiteUrl}
                      onChange={(e) => setRssSiteUrl(e.target.value)}
                      placeholder="https://"
                    />
                  </FormField>
                  <FormField label="标题提示（选填）" id={`${reactId}-rss-hint`}>
                    <Input id={`${reactId}-rss-hint`} value={rssTitleHint} onChange={(e) => setRssTitleHint(e.target.value)} />
                  </FormField>
                </div>
              </div>
            ) : null}

            {kind === 'hot_api' ? (
              <div>
                <h3 className={sectionTitle}>热点 API</h3>
                <div className={cn(adminFormSectionClass, 'space-y-4 p-4')}>
                  <FormField label="接口地址" id={`${reactId}-hot-url`}>
                    <Input
                      id={`${reactId}-hot-url`}
                      mono
                      value={hotUrl}
                      onChange={(e) => setHotUrl(e.target.value)}
                      placeholder="https://your-hot-api.example.com/hot"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">返回 JSON；可通过下方 mapper（声明式）映射为项目规范 items 列表。</p>
                  </FormField>
                  <FormField label="mapper（选填，JSON）" id={`${reactId}-hot-mapper`}>
                    <div className="overflow-hidden rounded-lg border border-ark-border bg-ark-bg">
                      <CodeMirror
                        value={hotMapperText}
                        onChange={(v) => setHotMapperText(v)}
                        extensions={hotMapperExtensions}
                        theme={oneDark}
                        editable={!submitting}
                        basicSetup={{
                          lineNumbers: true,
                          highlightActiveLineGutter: false,
                          foldGutter: false,
                          bracketMatching: true,
                          closeBrackets: true,
                          autocompletion: false,
                          highlightActiveLine: true,
                          searchKeymap: false,
                        }}
                        className="text-[12px]"
                        style={{ minHeight: 120 }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      声明式映射：仅支持简化路径（如 <span className="font-mono">$.items</span>、<span className="font-mono">$.extra.info</span>、<span className="font-mono">$.data[0].title</span>），不会执行任何脚本。
                    </p>
                    <details className="mt-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[12px] text-slate-200">
                      <summary className="cursor-pointer select-none text-slate-300 hover:text-slate-100">
                        完整提示（可展开/收起）
                      </summary>
                      <div className="mt-2 space-y-3 leading-relaxed text-slate-200">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">1) mapper 字段说明</div>
                          <ul className="mt-1 list-inside list-disc text-slate-200/90">
                            <li>
                              <span className="font-mono text-slate-100">itemsPath</span>（必填）：根 JSON 中 items 数组的位置，默认是{' '}
                              <span className="font-mono text-slate-100">$.items</span>
                            </li>
                            <li>
                              <span className="font-mono text-slate-100">titlePath</span> / <span className="font-mono text-slate-100">urlPath</span>（选填）：单条 item
                              的标题/链接路径，默认分别是 <span className="font-mono text-slate-100">$.title</span>、<span className="font-mono text-slate-100">$.url</span>
                            </li>
                            <li>
                              <span className="font-mono text-slate-100">idPath</span>（选填）：单条 item 的唯一标识，默认 <span className="font-mono text-slate-100">$.id</span>
                            </li>
                            <li>
                              <span className="font-mono text-slate-100">pubDatePath</span>（选填）：发布时间，支持数字时间戳或日期字符串，默认{' '}
                              <span className="font-mono text-slate-100">$.pubDate</span>
                            </li>
                            <li>
                              <span className="font-mono text-slate-100">summaryPath</span>（选填）：摘要/描述，默认 <span className="font-mono text-slate-100">$.summary</span>
                            </li>
                          </ul>
                          <p className="mt-2 text-[11px] text-slate-400">
                            说明：除 <span className="font-mono text-slate-200">itemsPath</span> 是对“根 JSON”取值外，其余 *Path 都是对“单个 item 对象”取值。
                          </p>
                        </div>

                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">2) 路径语法（安全 &amp; 不执行脚本）</div>
                          <ul className="mt-1 list-inside list-disc text-slate-200/90">
                            <li>只支持 <span className="font-mono text-slate-100">$.a.b[0].c</span> 这种“点号属性 + 数字下标”</li>
                            <li>不支持过滤、表达式、函数调用等（因此不会执行任何脚本）</li>
                          </ul>
                        </div>

                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">3) 示例</div>
                          <div className="mt-2 grid gap-2 md:grid-cols-2">
                            <div className="rounded-md border border-white/[0.06] bg-black/20 p-2">
                              <div className="text-[11px] text-slate-400">最小配置（你的结构已匹配）</div>
                              <pre className="mt-1 overflow-auto whitespace-pre rounded bg-black/30 p-2 font-mono text-[11px] text-slate-100">
{`{
  "itemsPath": "$.items",
  "titlePath": "$.title",
  "urlPath": "$.url",
  "idPath": "$.id"
}`}
                              </pre>
                            </div>
                            <div className="rounded-md border border-white/[0.06] bg-black/20 p-2">
                              <div className="text-[11px] text-slate-400">把 extra.hover 映射为 summary</div>
                              <pre className="mt-1 overflow-auto whitespace-pre rounded bg-black/30 p-2 font-mono text-[11px] text-slate-100">
{`{
  "itemsPath": "$.items",
  "titlePath": "$.title",
  "urlPath": "$.url",
  "idPath": "$.id",
  "summaryPath": "$.extra.hover"
}`}
                              </pre>
                            </div>
                          </div>
                          <p className="mt-2 text-[11px] text-slate-400">
                            提示：如果你不填 mapper，本项目也会尝试直接读取 <span className="font-mono">items[].title</span> / <span className="font-mono">items[].url</span> /{' '}
                            <span className="font-mono">items[].id</span>。
                          </p>
                        </div>
                      </div>
                    </details>
                  </FormField>
                </div>
              </div>
            ) : null}

            <div>
              <h3 className={sectionTitle}>备注与选项</h3>
              <div className={cn(adminFormSectionClass, 'space-y-4 p-4')}>
                <FormField label="备注（选填）" id={`${reactId}-note`}>
                  <Textarea id={`${reactId}-note`} rows={isCreate ? 2 : 3} value={note} onChange={(e) => setNote(e.target.value)} />
                </FormField>
                {isCreate ? (
                  <div className="flex flex-wrap items-center gap-4 border-t border-white/[0.06] pt-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-ark-text">
                      <Checkbox checked={cEnabled} onChange={(e) => setCEnabled(e.target.checked)} />
                      启用
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ark-muted">排序</span>
                      <Input
                        type="number"
                        className="w-24 px-2 py-1.5"
                        value={cSort}
                        onChange={(e) => setCSort(e.target.value)}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </form>
        </>
      )}
    </Drawer>
  );
}
