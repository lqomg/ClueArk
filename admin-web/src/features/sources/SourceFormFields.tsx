import { Form, Input, InputNumber, Select, Switch, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import { useTranslation } from 'react-i18next';
import type { AdminSource } from '@/shared/types';
import { SOURCE_KINDS } from '@/shared/constants';
import { uploadSourceAvatar } from '@/features/sources/api';

const DEFAULT_HOT_MAPPER = {
  itemsPath: '$.items',
  titlePath: '$.title',
  urlPath: '$.url',
};

export function SourceFormFields() {
  const { t } = useTranslation();
  const form = Form.useFormInstance();
  const kind = Form.useWatch('kind', form) ?? 'rss';

  const kindLabel = (k: string) => {
    if (k === 'web') return t('source.form.kindWeb');
    if (k === 'rss') return t('source.form.kindRss');
    if (k === 'hot_api') return t('source.form.kindHotApi');
    return k;
  };

  const uploadProps: UploadProps = {
    showUploadList: false,
    beforeUpload: async (file) => {
      try {
        const res = await uploadSourceAvatar(file);
        form.setFieldValue('avatarUrl', res.avatarUrl);
        message.success(t('source.form.avatarUploaded'));
      } catch {
        message.error(t('source.form.uploadFailed'));
      }
      return false;
    },
  };

  return (
    <>
      <Form.Item name="kind" label={t('source.form.kind')} rules={[{ required: true }]}>
        <Select options={SOURCE_KINDS.map((k) => ({ value: k, label: kindLabel(k) }))} />
      </Form.Item>
      <Form.Item name="displayName" label={t('source.form.displayName')} rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="avatarUrl" label={t('source.form.avatarUrl')}>
        <Input addonAfter={<Upload {...uploadProps}>{t('source.form.upload')}</Upload>} />
      </Form.Item>
      <Form.Item name="note" label={t('source.form.note')}>
        <Input.TextArea rows={2} />
      </Form.Item>
      <Form.Item name="pollIntervalSec" label={t('source.form.pollIntervalSec')}>
        <InputNumber min={30} style={{ width: '100%' }} placeholder={t('source.form.pollIntervalPlaceholder')} />
      </Form.Item>
      <Form.Item name="enabled" label={t('source.form.enabled')} valuePropName="checked">
        <Switch />
      </Form.Item>
      <Form.Item name="sortOrder" label={t('source.form.sortOrder')}>
        <InputNumber style={{ width: '100%' }} />
      </Form.Item>

      {kind === 'web' ? (
        <>
          <Form.Item name={['web', 'url']} label={t('source.form.siteUrl')} rules={[{ required: true }]}>
            <Input placeholder="https://example.com/" />
          </Form.Item>
          <Form.Item name={['web', 'crawlListUrl']} label={t('source.form.listUrl')}>
            <Input placeholder={t('source.form.listUrlPlaceholder')} />
          </Form.Item>
          <Form.Item
            name={['web', 'crawlSelectors', 'item']}
            label={t('source.form.selectorItem')}
            rules={[{ required: true }]}
          >
            <Input placeholder="article.item" />
          </Form.Item>
          <Form.Item
            name={['web', 'crawlSelectors', 'link']}
            label={t('source.form.selectorLink')}
            rules={[{ required: true }]}
          >
            <Input placeholder="a@href" />
          </Form.Item>
          <Form.Item
            name={['web', 'crawlSelectors', 'title']}
            label={t('source.form.selectorTitle')}
            rules={[{ required: true }]}
          >
            <Input placeholder=".title" />
          </Form.Item>
          <Form.Item name={['web', 'crawlSelectors', 'summary']} label={t('source.form.selectorSummary')}>
            <Input />
          </Form.Item>
          <Form.Item name={['web', 'crawlSelectors', 'date']} label={t('source.form.selectorDate')}>
            <Input />
          </Form.Item>
        </>
      ) : null}

      {kind === 'rss' ? (
        <Form.Item name={['rss', 'feedUrl']} label={t('source.form.feedUrl')} rules={[{ required: true }]}>
          <Input />
        </Form.Item>
      ) : null}

      {kind === 'hot_api' ? (
        <>
          <Form.Item name={['hot', 'url']} label={t('source.form.apiUrl')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name={['hot', 'mapper', 'itemsPath']} label="itemsPath" rules={[{ required: true }]}>
            <Input placeholder="$.items" />
          </Form.Item>
          <Form.Item name={['hot', 'mapper', 'titlePath']} label="titlePath">
            <Input placeholder="$.title" />
          </Form.Item>
          <Form.Item name={['hot', 'mapper', 'urlPath']} label="urlPath">
            <Input placeholder="$.url" />
          </Form.Item>
          <Form.Item name={['hot', 'mapper', 'idPath']} label="idPath">
            <Input placeholder="$.id" />
          </Form.Item>
          <Form.Item name={['hot', 'mapper', 'pubDatePath']} label="pubDatePath">
            <Input placeholder="$.pubDate" />
          </Form.Item>
          <Form.Item name={['hot', 'mapper', 'summaryPath']} label="summaryPath">
            <Input placeholder="$.summary" />
          </Form.Item>
        </>
      ) : null}
    </>
  );
}

function trimOrUndef(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function buildWebPayload(raw: unknown): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const w = raw as Record<string, unknown>;
  const url = trimOrUndef(w.url);
  if (!url) return undefined;
  const crawlListUrl = trimOrUndef(w.crawlListUrl);
  const sel = w.crawlSelectors as Record<string, unknown> | undefined;
  const item = trimOrUndef(sel?.item);
  const link = trimOrUndef(sel?.link);
  const title = trimOrUndef(sel?.title);
  const out: Record<string, unknown> = { url };
  if (crawlListUrl) out.crawlListUrl = crawlListUrl;
  if (item && link && title) {
    out.crawlSelectors = {
      item,
      link,
      title,
      ...(trimOrUndef(sel?.summary) ? { summary: trimOrUndef(sel?.summary) } : {}),
      ...(trimOrUndef(sel?.date) ? { date: trimOrUndef(sel?.date) } : {}),
    };
  }
  return out;
}

function buildHotPayload(raw: unknown): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const h = raw as Record<string, unknown>;
  const url = trimOrUndef(h.url);
  if (!url) return undefined;
  const mapperRaw = h.mapper as Record<string, unknown> | undefined;
  const itemsPath = trimOrUndef(mapperRaw?.itemsPath);
  const out: Record<string, unknown> = { url };
  if (itemsPath) {
    const mapper: Record<string, string> = { itemsPath };
    for (const key of ['titlePath', 'urlPath', 'idPath', 'pubDatePath', 'summaryPath'] as const) {
      const v = trimOrUndef(mapperRaw?.[key]);
      if (v) mapper[key] = v;
    }
    out.mapper = mapper;
  }
  return out;
}

export function buildSourcePayload(values: Record<string, unknown>, isCreate: boolean): Record<string, unknown> {
  const kind = values.kind as string;
  const body: Record<string, unknown> = {
    kind,
    displayName: values.displayName,
    note: values.note,
    avatarUrl: values.avatarUrl,
  };
  if (values.pollIntervalSec != null && values.pollIntervalSec !== '') {
    body.pollIntervalSec = values.pollIntervalSec;
  }
  if (isCreate) {
    body.enabled = values.enabled ?? true;
    body.sortOrder = values.sortOrder ?? 0;
  } else {
    if (values.enabled !== undefined) body.enabled = values.enabled;
    if (values.sortOrder !== undefined) body.sortOrder = values.sortOrder;
  }
  if (kind === 'web') {
    const web = buildWebPayload(values.web);
    if (web) body.web = web;
  } else if (kind === 'rss') {
    const feedUrl = trimOrUndef((values.rss as Record<string, unknown> | undefined)?.feedUrl);
    if (feedUrl) body.rss = { feedUrl };
  } else if (kind === 'hot_api') {
    const hot = buildHotPayload(values.hot);
    if (hot) body.hot = hot;
  }
  return body;
}

export function sourceToFormValues(source: AdminSource): Record<string, unknown> {
  const web = source.web as Record<string, unknown> | null | undefined;
  const hot = source.hot as { url?: string; mapper?: Record<string, string> | null } | null | undefined;
  const rss = source.rss as { feedUrl?: string } | null | undefined;
  return {
    kind: source.kind,
    displayName: source.displayName,
    avatarUrl: source.avatarUrl ?? '',
    note: source.note ?? '',
    pollIntervalSec: source.pollIntervalSec ?? undefined,
    enabled: source.enabled,
    sortOrder: source.sortOrder ?? 0,
    web: web
      ? {
          url: web.url ?? '',
          crawlListUrl: web.crawlListUrl ?? '',
          crawlSelectors: web.crawlSelectors ?? {},
        }
      : {},
    rss: rss ? { feedUrl: rss.feedUrl ?? '' } : {},
    hot: hot
      ? {
          url: hot.url ?? '',
          mapper: hot.mapper ?? DEFAULT_HOT_MAPPER,
        }
      : { url: '', mapper: DEFAULT_HOT_MAPPER },
  };
}

export function defaultCreateFormValues(): Record<string, unknown> {
  return {
    kind: 'rss',
    enabled: true,
    sortOrder: 0,
    hot: { url: '', mapper: DEFAULT_HOT_MAPPER },
  };
}
