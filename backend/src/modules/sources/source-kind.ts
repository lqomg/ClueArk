/**
 * 全站信源类型（与 Mongo / API / 内置 catalog 一致，单一真源）
 * 不含 X 账号等已下线类型。
 */
export const SOURCE_KIND = {
  WEB: 'web',
  RSS: 'rss',
  HOT_API: 'hot_api',
} as const;

export type SourceKind = (typeof SOURCE_KIND)[keyof typeof SOURCE_KIND];

export const SOURCE_KINDS = [
  SOURCE_KIND.WEB,
  SOURCE_KIND.RSS,
  SOURCE_KIND.HOT_API,
] as const satisfies readonly SourceKind[];

/** 内置 `built-in-catalog.json` 的 `kind` 与 SourceKind 相同 */
export type CatalogJsonSourceKind = SourceKind;

export function parseCatalogJsonKind(kindRaw: string): CatalogJsonSourceKind {
  const k = kindRaw.trim().toLowerCase();
  if (k === SOURCE_KIND.RSS) return SOURCE_KIND.RSS;
  if (k === SOURCE_KIND.HOT_API) return SOURCE_KIND.HOT_API;
  return SOURCE_KIND.WEB;
}
