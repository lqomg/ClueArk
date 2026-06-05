import type { SupportedLocale } from '../../common/utils/locale.utils';

export const BRIEF_LLM_SYSTEM_VERSION = 'monitor-brief-v5';

const LOCALE_OUTPUT: Record<SupportedLocale, string> = {
  en: 'English',
  'zh-CN': 'Simplified Chinese',
  ja: 'Japanese',
  ko: 'Korean',
};

export function buildBriefSystemPrompt(locale: SupportedLocale): string {
  const lang = LOCALE_OUTPUT[locale];
  return `You are an intelligence monitoring brief writer. Output valid JSON only, no markdown code fences.
Format: {"paragraphs":["paragraph1","paragraph2",...],"citedItemIds":["itemId",...]}
Requirements:
1. paragraphs: 2–3 paragraphs in ${lang} (intelligence briefing tone), each 30–120 characters, total under 300.
2. Paragraph 1 must focus on substantive clues in evidenceItems. Do NOT repeat dashboard stats. When citing events, use verifiable times with referenceNowIso / referenceNowReadableZh and userTimeZone.
3. Paragraphs 2–3 follow the same time rules; use at most 1–2 aggregate numbers from briefContext.
4. Base narrative on evidenceItems; do not invent facts not in evidence.
5. citedItemIds must be ids from evidenceItems only; may be empty.
6. Inline emphasis: **term** markdown only.`;
}

export function buildBriefEmptyWindowParagraphs(locale: SupportedLocale): string[] {
  switch (locale) {
    case 'en':
      return [
        'No items met the similarity threshold in the current time window.',
        'This is an automated conclusion; the scheduled task will regenerate the brief when new clues enter the window.',
      ];
    case 'ja':
      return [
        '現在の時間窓では類似度閾値を満たす項目がありません。',
        '以上は自動結論です。新しい手がかりが入ると定期タスクが再生成します。',
      ];
    case 'ko':
      return [
        '현재 시간 창에서 유사도 임계값을 충족하는 항목이 없습니다.',
        '위는 자동 결론이며, 새 단서가 들어오면 예약 작업이 다시 생성합니다.',
      ];
    default:
      return [
        '当前时间窗内无达到相似度阈值的条目。',
        '以上为系统自动结论；有新线索进入时间窗后，定时任务将重新生成研判摘要。',
      ];
  }
}

export function buildBriefPendingMessage(locale: SupportedLocale): string {
  switch (locale) {
    case 'en':
      return 'Brief not generated yet. Please wait for the scheduled task (default: hourly).';
    case 'ja':
      return '研判摘要はまだ生成されていません。定期タスク（既定：毎時）をお待ちください。';
    case 'ko':
      return '브리프가 아직 생성되지 않았습니다. 예약 작업(기본: 매시)을 기다려 주세요.';
    default:
      return '研判摘要尚未生成，请等待定时任务（默认每小时）执行后再查看。';
  }
}

export function buildBriefNoVectorMessage(locale: SupportedLocale): string {
  switch (locale) {
    case 'en':
      return 'Cannot generate AI brief: this monitor has no description vector. Recreate the monitor or contact support.';
    case 'ja':
      return 'AI 研判を生成できません：説明ベクトルがありません。監視を再作成するか管理者に連絡してください。';
    case 'ko':
      return 'AI 브리프를 생성할 수 없습니다: 설명 벡터가 없습니다. 모니터를 다시 만들거나 관리자에게 문의하세요.';
    default:
      return '无法生成 AI 研判摘要：该监控缺少描述向量。请重新创建监控或联系管理员。';
  }
}
