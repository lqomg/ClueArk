import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp, Layers, Search } from 'lucide-react';
import { listSources } from '@/api/sources';
import type { SourceKind, Source } from '@/types/models';
import { useAppTopBar } from '@/components/layout/AppTopBar';
import { TopBarCountPill } from '@/components/layout/TopBarCountPill';
import { useSourceUiStore } from '@/stores/sourceUiStore';
import { SourceAvatar } from '@/components/sources/SourceAvatar';
import { Button, IconButton, Input, Select, Segmented } from '@/components/ui';
import type { ListResponse } from './types';
import { formatShortDateTime, normalizeUserTimeZone } from '@/lib/datetime';
import { useAuthStore } from '@/stores/authStore';
import { scrollSourcesListToTop } from './utils';
import type { WebTranslationKey } from '@/i18n/locales/en';

const KIND_I18N: Record<SourceKind, WebTranslationKey> = {
  web: 'sources.kindWeb',
  rss: 'sources.kindRss',
  hot_api: 'sources.hot',
};

export function SourcesPage() {
  const { t } = useTranslation();
  const viewerTz = useAuthStore((s) => normalizeUserTimeZone(s.user?.timeZone));
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

  const kindLabel = (kind: SourceKind) => t(KIND_I18N[kind]);

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
      setError(e instanceof Error ? e.message : t('common.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [query, t]);

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

  useAppTopBar(
    () => (
      <div className="flex min-w-0 w-full items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="shrink-0 text-lg font-semibold tracking-tight text-ark-text">{t('sources.title')}</h1>
          <TopBarCountPill
            className="sm:hidden"
            compact
            value={list?.total ?? '—'}
            trailing={hasActiveFilters ? <span className="ml-1 font-normal normal-case tracking-normal text-slate-500">·</span> : null}
          />
          <div className="hidden min-h-5 items-center border-l border-ark-border pl-4 sm:flex">
            <TopBarCountPill
              value={list?.total ?? '—'}
              trailing={
                hasActiveFilters ? <span className="ml-1 font-normal normal-case tracking-normal text-slate-500">· {t('sources.filtered')}</span> : null
              }
            />
          </div>
        </div>
        <Segmented
          visual="panel"
          value={poolView}
          onChange={setPoolView}
          size="md"
          className="shrink-0"
          options={[
            { value: 'list', label: t('sources.listView') },
            { value: 'card', label: t('sources.cardView') },
          ]}
        />
      </div>
    ),
    [poolView, setPoolView, list?.total, hasActiveFilters, t],
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-3">
      <div className="shrink-0 rounded-xl border border-ark-border bg-ark-sidebar p-4 sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end md:gap-x-3 md:gap-y-2">
          <div className="group relative min-w-0 flex-1 md:min-w-[10rem]">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-ark-accent"
              strokeWidth={2}
              aria-hidden
            />
            <Input
              aria-label={t('sources.searchLabel')}
              className="h-10 w-full rounded-lg border-ark-border bg-ark-surface py-2 pl-9 pr-3 text-sm text-ark-text placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/25"
              placeholder={t('sources.searchPlaceholder')}
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
          </div>
          <div className="flex w-full min-w-0 flex-col gap-1 sm:max-w-[11rem] md:w-44 md:max-w-none md:shrink-0">
            <span className="text-[10px] font-medium text-slate-600">{t('sources.kindFilter')}</span>
            <Select
              aria-label={t('sources.kindFilter')}
              className="h-10 w-full min-w-0 rounded-lg border-ark-border bg-ark-surface text-sm focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/25"
              value={kindFilter}
              onChange={(e) => {
                setPage(1);
                setKindFilter(e.target.value as SourceKind | '');
              }}
            >
              <option value="">{t('sources.allKinds')}</option>
              <option value="web">{t('sources.kindWeb')}</option>
              <option value="rss">{t('sources.kindRss')}</option>
              <option value="hot_api">{t('sources.hot')}</option>
            </Select>
          </div>
          <div className="flex w-full min-w-0 flex-col gap-1 sm:max-w-[14rem] md:w-56 md:max-w-none md:shrink-0">
            <span className="text-[10px] font-medium text-slate-600">{t('sources.sortLabel')}</span>
            <Select
              aria-label={t('sources.sortLabel')}
              className="h-10 w-full min-w-0 rounded-lg border-ark-border bg-ark-surface text-sm focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/25"
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split(':') as ['createdAt' | 'displayName', 'asc' | 'desc'];
                setSortBy(sb);
                setSortOrder(so);
                setPage(1);
              }}
            >
              <option value="createdAt:desc">{t('sources.sortNewOld')}</option>
              <option value="createdAt:asc">{t('sources.sortOldNew')}</option>
              <option value="displayName:asc">{t('sources.sortNameAz')}</option>
              <option value="displayName:desc">{t('sources.sortNameZa')}</option>
            </Select>
          </div>
        </div>
      </div>

      {error ? (
        <div className="shrink-0 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}
      {loading ? <div className="shrink-0 text-xs text-slate-500">{t('common.refreshing')}</div> : null}

      <div
        id="sources-list-scroll"
        className="scrollbar-hide min-h-0 flex-1 overflow-y-auto overscroll-y-contain pb-16"
      >
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-ark-border bg-white/[0.03] py-24 text-slate-500">
            <Layers className="mb-4 size-14 opacity-20" strokeWidth={1.25} />
            <p className="text-lg font-semibold text-slate-400">{t('sources.empty')}</p>
            <p className="mt-2 max-w-sm text-center text-sm text-slate-600">
              {hasActiveFilters ? t('sources.emptyFiltered') : t('sources.emptyDefault')}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {hasActiveFilters ? (
                <Button type="button" variant="secondary" size="lg" className="px-6 py-2.5 font-semibold" onClick={clearFilters}>
                  {t('sources.clearFilters')}
                </Button>
              ) : null}
            </div>
          </div>
        ) : poolView === 'list' ? (
          <div className="overflow-hidden rounded-2xl border border-ark-border shadow-xl shadow-black/30">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-ark-surface text-left text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2">{t('sources.colKind')}</th>
                  <th className="px-3 py-2">{t('sources.colName')}</th>
                  <th className="px-3 py-2">{t('sources.colOwner')}</th>
                  <th className="px-3 py-2">{t('sources.colEntry')}</th>
                  <th className="px-3 py-2">{t('sources.colTime')}</th>
                  <th className="px-3 py-2">{t('sources.colOpen')}</th>
                </tr>
              </thead>
              <tbody>
                {(list?.items ?? []).map((s) => {
                  return (
                    <tr key={s.id} className="border-t border-ark-border bg-ark-bg/20">
                      <td className="px-3 py-2 text-slate-500">{kindLabel(s.kind)}</td>
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
                      <td className="px-3 py-2 text-slate-500">{s.isOfficial ? t('sources.official') : t('sources.unofficial')}</td>
                      <td className="max-w-[180px] truncate px-3 py-2 text-slate-500" title={s.openUrl}>
                        {s.openUrl || '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-500">{formatShortDateTime(s.createdAt, viewerTz)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <button type="button" className="text-ark-accent hover:underline" onClick={() => openSource(s)}>
                          {t('sources.open')}
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
                  <p className="mt-1 text-xs text-slate-500">{kindLabel(s.kind)}</p>
                  <p className="mt-2 line-clamp-2 text-xs text-slate-500">{s.note || s.openUrl}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <button type="button" className="text-ark-accent hover:underline" onClick={() => openSource(s)}>
                      {t('sources.open')}
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
              {t('sources.pagination', { total: list?.total ?? 0, page: list?.page ?? page })}
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
                {t('sources.prevPage')}
              </Button>
              <Button
                type="button"
                variant="outlineSoft"
                size="md"
                className="px-4 py-1.5"
                disabled={list ? page * list.pageSize >= list.total : true}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('sources.nextPage')}
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
          aria-label={t('sources.backToTop')}
        >
          <ArrowUp size={20} strokeWidth={2} />
        </IconButton>
      ) : null}
    </div>
  );
}
