import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUp, Layers, Search } from 'lucide-react';
import { listSources } from '@/api/sources';
import type { SourceKind, Source } from '@/types/models';
import { useSourceUiStore } from '@/stores/sourceUiStore';
import { SourceAvatar } from '@/components/sources/SourceAvatar';
import { Button, IconButton, Input, Select, Segmented } from '@/components/ui';
import type { ListResponse } from './types';
import { KIND_LABEL, scrollSourcesListToTop } from './utils';

export function SourcesPage() {
  const poolView = useSourceUiStore((s) => s.poolView);
  const setPoolView = useSourceUiStore((s) => s.setPoolView);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<SourceKind | ''>('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'displayName'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [list, setList] = useState<ListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBackTop, setShowBackTop] = useState(false);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('pageSize', '20');
    p.set('sortBy', sortBy);
    p.set('sortOrder', sortOrder);
    if (search.trim()) p.set('search', search.trim());
    if (kindFilter) p.set('kind', kindFilter);
    return `?${p.toString()}`;
  }, [page, search, sortBy, sortOrder, kindFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const l = await listSources(query);
      setList(l);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void load();
    }, 250);
    return () => window.clearTimeout(handle);
  }, [load]);

  useEffect(() => {
    const main = document.getElementById('sources-list-scroll');
    if (!main) return;
    const onScroll = () => setShowBackTop(main.scrollTop > 320);
    onScroll();
    main.addEventListener('scroll', onScroll, { passive: true });
    return () => main.removeEventListener('scroll', onScroll);
  }, []);

  const hasActiveFilters = Boolean(search.trim() || kindFilter);

  function clearFilters() {
    setSearch('');
    setKindFilter('');
    setPage(1);
  }

  function openSource(s: Source) {
    const target = s.openUrl || '';
    if (target) window.open(target, '_blank', 'noopener,noreferrer');
  }

  const isEmpty = !loading && list && list.items.length === 0;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-4">
      <div className="shrink-0 space-y-3 border-b border-ark-border bg-ark-bg pb-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 sm:gap-x-3">
          <h1 className="shrink-0 text-2xl font-black leading-none tracking-tight text-white sm:text-3xl md:text-4xl">
            信源
          </h1>
          <span className="inline-flex h-7 shrink-0 items-center rounded-md border border-white/10 bg-white/[0.04] px-2.5 text-[11px] text-slate-400">
            共 <span className="font-bold text-ark-accent">{list?.total ?? '—'}</span> 条
            {hasActiveFilters ? <span className="text-slate-500"> · 已筛选</span> : null}
          </span>
          <Segmented
            value={poolView}
            onChange={setPoolView}
            size="md"
            options={[
              { value: 'list', label: '列表' },
              { value: 'card', label: '卡片' },
            ]}
          />
        </div>

        <div className="rounded-2xl border border-ark-border bg-ark-surface p-3 shadow-inner shadow-black/30 sm:p-4">
          <p className="mb-3 text-[11px] leading-snug text-slate-500 sm:mb-3.5 sm:text-xs">
            浏览全站信源池并直达入口；新增与编辑由管理员在「管理后台 → 信源管理」维护。
          </p>
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end md:gap-x-3 md:gap-y-2">
            <div className="flex min-w-0 flex-1 flex-col gap-1 md:min-w-[10rem]">
              <span className="text-[10px] font-medium text-slate-600">搜索</span>
              <div className="group relative min-w-0">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-ark-accent"
                  strokeWidth={2}
                  aria-hidden
                />
                <Input
                  aria-label="搜索展示名或备注"
                  className="h-10 w-full rounded-lg border-ark-border bg-ark-bg py-2 pl-9 pr-3"
                  placeholder="展示名 / 备注…"
                  value={search}
                  onChange={(e) => {
                    setPage(1);
                    setSearch(e.target.value);
                  }}
                />
              </div>
            </div>
            <div className="flex w-full min-w-0 flex-col gap-1 sm:max-w-[11rem] md:w-44 md:max-w-none md:shrink-0">
              <span className="text-[10px] font-medium text-slate-600">类型</span>
              <Select
                aria-label="按类型筛选"
                className="h-10 w-full min-w-0"
                value={kindFilter}
                onChange={(e) => {
                  setPage(1);
                  setKindFilter(e.target.value as SourceKind | '');
                }}
              >
                <option value="">全部类型</option>
                <option value="web">网站</option>
                <option value="rss">RSS</option>
                <option value="hot_api">热点</option>
              </Select>
            </div>
            <div className="flex w-full min-w-0 flex-col gap-1 sm:max-w-[14rem] md:w-56 md:max-w-none md:shrink-0">
              <span className="text-[10px] font-medium text-slate-600">排序</span>
              <Select
                aria-label="排序方式"
                className="h-10 w-full min-w-0"
                value={`${sortBy}:${sortOrder}`}
                onChange={(e) => {
                  const [sb, so] = e.target.value.split(':') as ['createdAt' | 'displayName', 'asc' | 'desc'];
                  setSortBy(sb);
                  setSortOrder(so);
                  setPage(1);
                }}
              >
                <option value="createdAt:desc">时间 · 新→旧</option>
                <option value="createdAt:asc">时间 · 旧→新</option>
                <option value="displayName:asc">名称 · A→Z</option>
                <option value="displayName:desc">名称 · Z→A</option>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="shrink-0 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}
      {loading ? <div className="shrink-0 text-xs text-slate-500">刷新中…</div> : null}

      <div
        id="sources-list-scroll"
        className="scrollbar-hide min-h-0 flex-1 overflow-y-auto overscroll-y-contain pb-16"
      >
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-ark-border bg-white/[0.03] py-24 text-slate-500">
            <Layers className="mb-4 size-14 opacity-20" strokeWidth={1.25} />
            <p className="text-lg font-semibold text-slate-400">暂无信源</p>
            <p className="mt-2 max-w-sm text-center text-sm text-slate-600">
              {hasActiveFilters ? '当前筛选条件下没有结果，可尝试清空筛选。' : '信源池由管理员统一维护，后续可在监控中从池内多选组成子集。'}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {hasActiveFilters ? (
                <Button type="button" variant="secondary" size="lg" className="px-6 py-2.5 font-semibold" onClick={clearFilters}>
                  清空筛选
                </Button>
              ) : null}
            </div>
          </div>
        ) : poolView === 'list' ? (
          <div className="overflow-hidden rounded-2xl border border-ark-border shadow-xl shadow-black/30">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-ark-surface text-left text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2">类型</th>
                  <th className="px-3 py-2">展示名</th>
                  <th className="px-3 py-2">归属</th>
                  <th className="px-3 py-2">入口</th>
                  <th className="px-3 py-2">时间</th>
                  <th className="px-3 py-2">直达</th>
                </tr>
              </thead>
              <tbody>
                {(list?.items ?? []).map((s) => {
                  return (
                    <tr key={s.id} className="border-t border-ark-border bg-ark-bg/20">
                      <td className="px-3 py-2 text-slate-500">{KIND_LABEL[s.kind]}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="flex max-w-[min(100%,240px)] items-center gap-2 text-left font-medium text-ark-text hover:underline"
                          onClick={() => openSource(s)}
                        >
                          <SourceAvatar kind={s.kind} name={s.displayName} avatarUrl={s.avatarUrl} size="sm" />
                          <span className="min-w-0 truncate">{s.displayName}</span>
                        </button>
                      </td>
                      <td className="px-3 py-2 text-slate-500">{s.isOfficial ? '官方' : '非官方'}</td>
                      <td className="max-w-[180px] truncate px-3 py-2 text-slate-500" title={s.openUrl}>
                        {s.openUrl || '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-500">{new Date(s.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <button type="button" className="text-ark-accent hover:underline" onClick={() => openSource(s)}>
                          直达
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(list?.items ?? []).map((s) => {
              return (
                <div
                  key={s.id}
                  className="rounded-3xl border border-ark-border bg-ark-surface p-5 shadow-xl shadow-black/25 transition-all hover:border-ark-accent/25"
                >
                  <button
                    type="button"
                    className="flex w-full min-w-0 items-start gap-3 text-left text-base font-bold text-ark-text transition hover:text-ark-accent"
                    onClick={() => openSource(s)}
                  >
                    <SourceAvatar kind={s.kind} name={s.displayName} avatarUrl={s.avatarUrl} size="md" className="mt-0.5" />
                    <span className="min-w-0 pt-0.5">{s.displayName}</span>
                  </button>
                  <p className="mt-1 text-xs text-slate-500">{KIND_LABEL[s.kind]}</p>
                  <p className="mt-2 line-clamp-2 text-xs text-slate-500">{s.note || s.openUrl}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <button type="button" className="text-ark-accent hover:underline" onClick={() => openSource(s)}>
                      直达
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isEmpty ? (
          <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
            <div>
              共 {list?.total ?? 0} 条 · 第 {list?.page ?? page} 页
            </div>
            <div className="space-x-2">
              <Button
                type="button"
                variant="outlineSoft"
                size="md"
                className="px-4 py-1.5"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                上一页
              </Button>
              <Button
                type="button"
                variant="outlineSoft"
                size="md"
                className="px-4 py-1.5"
                disabled={list ? page * list.pageSize >= list.total : true}
                onClick={() => setPage((p) => p + 1)}
              >
                下一页
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {showBackTop ? (
        <IconButton
          type="button"
          className="fixed bottom-8 right-6 z-50 size-12 border border-ark-border bg-ark-bg/90 p-0 text-slate-400 shadow-2xl backdrop-blur-md hover:border-ark-accent/40 hover:bg-white/10 hover:text-ark-accent md:bottom-10 md:right-10"
          onClick={scrollSourcesListToTop}
          aria-label="回到顶部"
        >
          <ArrowUp size={20} strokeWidth={2} />
        </IconButton>
      ) : null}
    </div>
  );
}
