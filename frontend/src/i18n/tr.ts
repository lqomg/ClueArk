import i18n from '@/i18n';
import type { WebTranslationKey } from '@/i18n/locales/en';

export function tr(key: WebTranslationKey, params?: Record<string, string | number>): string {
  return i18n.t(key, params);
}

export function intlLocaleTag(): string {
  return i18n.language || 'en';
}
