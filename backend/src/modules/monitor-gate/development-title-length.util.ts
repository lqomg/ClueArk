import type { SupportedLocale } from '../../common/utils/locale.utils';

/**
 * 进展 title 写作约束（authorDevelopment 与基线整理共用）。
 * Soft 目标按语言；硬上限仍由落库 slice / schema 兜底，prompt 禁止用省略号凑满。
 */
export function developmentTitleLengthRule(locale: SupportedLocale): string {
  switch (locale) {
    case 'zh-CN':
      return 'title 是一句短主张（目标 36–56 字，硬上限 80 字）。禁止堆引语或复述全文；写不下就删修饰，禁止用…/省略号收尾。引语与细节只放 summary。';
    case 'ja':
      return 'title は短い状態変化の主張（目標 36–56 字、上限 80 字）。引用の詰め込みや全文要約は禁止。収まらなければ修飾を削り、…で埋めない。引用と詳細は summary のみ。';
    case 'ko':
      return 'title은 짧은 상태 변화 주장(목표 40–70자, 상한 100자). 인용 나열·전문 요약 금지. 길이 부족 시 수식어를 줄이고 …로 채우지 말 것. 인용과 세부사항은 summary에만.';
    case 'en':
    default:
      return 'title is one short claim (target 70–110 characters / ~12–18 words; hard cap 140 characters). Do not stuff quotes or retell the whole post; cut modifiers instead of ending with …/ellipsis. Put quotes and detail only in summary.';
  }
}
