import { ArrowUpRight, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GITHUB_REPO_URL } from '@/constants/site';
import type { WebTranslationKey } from '@/i18n/locales/en';

const FAQS: ReadonlyArray<{ q: WebTranslationKey; a: WebTranslationKey }> = [
  { q: 'public.faqQ1', a: 'public.faqA1' },
  { q: 'public.faqQ2', a: 'public.faqA2' },
  { q: 'public.faqQ3', a: 'public.faqA3' },
];

export function PublicFaq() {
  const { t } = useTranslation();

  return (
    <section id="faq" className="mx-auto mt-10 w-full max-w-[1120px] scroll-mt-28 sm:mt-14">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
        {t('public.faqEyebrow')}
      </p>
      <h2 className="mt-1.5 text-[16px] font-semibold tracking-tight text-neutral-900 sm:text-[17px]">
        {t('public.faqTitle')}
      </h2>

      <div className="mt-4 grid gap-5 sm:mt-6 sm:gap-8 lg:grid-cols-[1fr_20rem]">
        <dl className="divide-y divide-neutral-100 border-y border-neutral-100">
          {FAQS.map((item) => (
            <div key={item.q} className="py-3.5 sm:py-4">
              <dt className="text-[13px] font-semibold leading-6 text-neutral-900 sm:text-[14px]">
                {t(item.q)}
              </dt>
              <dd className="mt-1 text-[12px] leading-6 text-neutral-500 sm:text-[13px]">{t(item.a)}</dd>
            </div>
          ))}
        </dl>

        <aside className="flex h-fit items-start gap-3 rounded-2xl bg-[#F7F7F5] p-4 sm:block sm:rounded-[20px] sm:p-5">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-neutral-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] sm:size-10">
            <Mail className="size-4 sm:size-[18px]" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 sm:mt-4">
            <h3 className="text-[14px] font-semibold text-neutral-950 sm:text-[15px]">
              {t('public.supportTitle')}
            </h3>
            <p className="mt-1 text-[12px] leading-5 text-neutral-500 sm:text-[13px]">
              {t('public.supportBody')}
            </p>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary mt-3 inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full px-3 text-[12px] font-medium sm:mt-4 sm:px-4"
            >
              <span className="truncate">{t('public.openSource')}</span>
              <ArrowUpRight className="size-3.5 shrink-0" aria-hidden />
            </a>
          </div>
        </aside>
      </div>
    </section>
  );
}
