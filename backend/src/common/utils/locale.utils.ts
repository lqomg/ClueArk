export const SUPPORTED_LOCALES = ['en', 'zh-CN', 'ja', 'ko'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const FALLBACK_APP_LOCALE: SupportedLocale = 'en';

export function normalizeLocale(raw: string | null | undefined): SupportedLocale {
  const s = (raw ?? '').trim();
  if (!s) return FALLBACK_APP_LOCALE;
  if (s === 'en' || /^en-/i.test(s)) return 'en';
  if (s === 'zh-CN' || s === 'zh' || /^zh-/i.test(s)) return 'zh-CN';
  if (s === 'ja' || /^ja-/i.test(s)) return 'ja';
  if (s === 'ko' || /^ko-/i.test(s)) return 'ko';
  return FALLBACK_APP_LOCALE;
}

export function isSupportedLocale(raw: string): raw is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(raw);
}

export function resolveAppDefaultLocale(fromEnv: string | undefined): SupportedLocale {
  const trimmed = fromEnv?.trim();
  if (trimmed && isSupportedLocale(trimmed)) return trimmed;
  return FALLBACK_APP_LOCALE;
}
