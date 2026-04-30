import type { SourceKind } from '@/types/models';

export const KIND_LABEL: Record<SourceKind, string> = {
  web: '网站',
  rss: 'RSS',
  hot_api: '热点',
};

export function scrollSourcesListToTop() {
  document.getElementById('sources-list-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
}
