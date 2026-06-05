const LOCALE_STORAGE_KEY = 'clueark_admin_locale';

export type AdminSupportedLocale = 'en' | 'zh-CN' | 'ja' | 'ko';

const SUPPORTED: AdminSupportedLocale[] = ['en', 'zh-CN', 'ja', 'ko'];

export function normalizeAdminLocale(raw: string | null | undefined): AdminSupportedLocale {
  const s = (raw ?? '').trim();
  if (!s) return 'en';
  if (s === 'en' || /^en-/i.test(s)) return 'en';
  if (s === 'zh-CN' || s === 'zh' || /^zh-/i.test(s)) return 'zh-CN';
  if (s === 'ja' || /^ja-/i.test(s)) return 'ja';
  if (s === 'ko' || /^ko-/i.test(s)) return 'ko';
  return 'en';
}

export function getAdminLocale(): AdminSupportedLocale {
  if (typeof window === 'undefined') return 'en';
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && SUPPORTED.includes(stored as AdminSupportedLocale)) {
      return stored as AdminSupportedLocale;
    }
  } catch {
    // ignore
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    return normalizeAdminLocale(navigator.language);
  }
  return 'en';
}

export function setAdminLocale(locale: AdminSupportedLocale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // ignore
  }
}

export function adminLocaleToAcceptLanguage(locale: AdminSupportedLocale): string {
  return locale;
}
