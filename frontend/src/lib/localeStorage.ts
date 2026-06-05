const LOCALE_STORAGE_KEY = 'clueark_web_locale';

export type WebSupportedLocale = 'en' | 'zh-CN' | 'ja' | 'ko';

const SUPPORTED: WebSupportedLocale[] = ['en', 'zh-CN', 'ja', 'ko'];

export function normalizeLocale(raw: string | null | undefined): WebSupportedLocale {
  const s = (raw ?? '').trim();
  if (!s) return 'en';
  if (s === 'en' || /^en-/i.test(s)) return 'en';
  if (s === 'zh-CN' || s === 'zh' || /^zh-/i.test(s)) return 'zh-CN';
  if (s === 'ja' || /^ja-/i.test(s)) return 'ja';
  if (s === 'ko' || /^ko-/i.test(s)) return 'ko';
  return 'en';
}

export function getWebLocale(): WebSupportedLocale {
  if (typeof window === 'undefined') return 'en';
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && SUPPORTED.includes(stored as WebSupportedLocale)) {
      return stored as WebSupportedLocale;
    }
  } catch {
    // ignore
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    return normalizeLocale(navigator.language);
  }
  return 'en';
}

export function setWebLocale(locale: WebSupportedLocale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // ignore
  }
}
