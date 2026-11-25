export const SUPPORTED_LOCALES = ['en', 'zh-CN', 'ja', 'ko'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const FALLBACK_APP_LOCALE: SupportedLocale = 'en';

/** LLM prompt 中的目标语言名称 */
export const LOCALE_OUTPUT_LABEL: Record<SupportedLocale, string> = {
  en: 'English',
  'zh-CN': 'Simplified Chinese',
  ja: 'Japanese',
  ko: 'Korean',
};

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

type ScriptCounts = {
  cjk: number;
  kana: number;
  hangul: number;
  latin: number;
  scored: number;
};

function countScripts(text: string): ScriptCounts {
  const letters = text.replace(/\s+/g, '');
  const cjk = (letters.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const kana = (letters.match(/[\u3040-\u30ff]/g) ?? []).length;
  const hangul = (letters.match(/[\uac00-\ud7af]/g) ?? []).length;
  const latin = (letters.match(/[A-Za-z]/g) ?? []).length;
  return { cjk, kana, hangul, latin, scored: cjk + kana + hangul + latin };
}

/**
 * 启发式：正文是否已像目标语言（跳过空翻 / 译后验收 / 短文本缓存门禁共用）。
 */
export function textLooksLikeLocale(text: string, locale: SupportedLocale): boolean {
  const s = text.trim();
  if (!s) return true;
  const { cjk, kana, hangul, latin, scored } = countScripts(s);
  if (scored < 8) return true;
  const asian = cjk + kana + hangul;

  switch (locale) {
    case 'zh-CN':
      if (cjk === 0) return false;
      if (asian > 0) return kana === 0 && hangul / asian < 0.1 && cjk / asian >= 0.7;
      return false;
    case 'ja':
      return kana > 0 && asian > 0 && (cjk + kana) / asian >= 0.35;
    case 'ko':
      return hangul > 0 && asian > 0 && hangul / asian >= 0.35;
    case 'en':
    default:
      return latin / scored >= 0.55 && cjk / scored < 0.2 && hangul / scored < 0.2;
  }
}

export function detectTextLocale(text: string): SupportedLocale {
  const s = text.trim();
  if (!s) return FALLBACK_APP_LOCALE;
  const { cjk, kana, hangul, latin, scored } = countScripts(s);
  if (scored < 8) return FALLBACK_APP_LOCALE;

  const koShare = hangul / scored;
  const jaShare = (cjk + kana) / scored;
  const zhShare = cjk / scored;
  const enShare = latin / scored;

  if (koShare >= 0.35) return 'ko';
  if (kana > 0 && jaShare >= 0.35) return 'ja';
  if (zhShare >= 0.35 && kana === 0 && hangul / scored < 0.1) return 'zh-CN';
  if (enShare >= 0.55 && zhShare < 0.2 && hangul / scored < 0.2) return 'en';
  return FALLBACK_APP_LOCALE;
}

/**
 * 落库 locale：优先采用请求语，但正文脚本不像该语时改用脚本检测。
 */
export function resolvePersistLocale(
  title: string,
  summary: string,
  requestedRaw?: string | null,
): SupportedLocale {
  const raw = String(requestedRaw ?? '').trim();
  const requested = raw ? normalizeLocale(raw) : FALLBACK_APP_LOCALE;
  const t = String(title ?? '').trim();
  const s = String(summary ?? '').trim();
  if (
    (!t || textLooksLikeLocale(t, requested)) &&
    (!s || textLooksLikeLocale(s, requested))
  ) {
    return requested;
  }
  return detectTextLocale(`${t}\n${s}`);
}
