import { SUPPORTED_LOCALES } from '../../common/utils/locale.utils';
import { clipSummaryForLlm } from './feed-llm.constants';

const LOCALE_LABELS: Record<(typeof SUPPORTED_LOCALES)[number], string> = {
  en: 'English',
  'zh-CN': 'Simplified Chinese',
  ja: 'Japanese',
  ko: 'Korean',
};

export function buildFeedEnrichSystemPrompt(): string {
  const localeLines = SUPPORTED_LOCALES.map(
    (loc) =>
      `- locales.${loc}: { tags: string[] (1–6 short tags in ${LOCALE_LABELS[loc]}), recommendReason: string (one sentence in ${LOCALE_LABELS[loc]}, max 120 characters) }`,
  ).join('\n');

  return [
    'You are a news editor assistant for an intelligence platform. Tag a single feed item and write a recommendation.',
    'Tags describe the **single item** topic/type, not the source.',
    'Output one JSON object only, no markdown.',
    'Fields:',
    '- tagKeys: string[], 2–6 stable lowercase kebab-case slugs (English) for cross-language aggregation, e.g. "ai-regulation", "openai"',
    localeLines,
    'All four locale keys (en, zh-CN, ja, ko) are required.',
  ].join('\n');
}

export function buildFeedEnrichUserPayload(input: {
  title: string;
  summary: string;
  sourceDisplayName: string;
}): string {
  return JSON.stringify({
    title: input.title,
    summary: clipSummaryForLlm(input.summary),
    sourceDisplayName: input.sourceDisplayName,
  });
}
