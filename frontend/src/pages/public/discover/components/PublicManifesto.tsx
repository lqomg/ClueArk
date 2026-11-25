import { useTranslation } from 'react-i18next';
import type { WebTranslationKey } from '@/i18n/locales/en';

export function PublicManifesto() {
  const { t } = useTranslation();
  const steps = [
    ['1', 'public.howStepOne', 'public.howStepOneBody'],
    ['2', 'public.howStepTwo', 'public.howStepTwoBody'],
    ['3', 'public.howStepThree', 'public.howStepThreeBody'],
  ] as const;

  return (
    <div id="channels" className="grid scroll-mt-28 gap-3 sm:gap-4 lg:grid-cols-2">
      <section id="manifesto" className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
          {t('public.manifestoEyebrow')}
        </p>
        <h2 className="mt-1.5 text-[16px] font-semibold tracking-tight text-neutral-900 sm:text-[17px]">
          {t('public.manifestoTitle')}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">{t('public.manifestoBody')}</p>
      </section>
      <section id="how" className="rounded-2xl border border-neutral-100 bg-white p-4 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
          {t('public.howEyebrow')}
        </p>
        <h2 className="mt-1.5 text-[16px] font-semibold tracking-tight text-neutral-900 sm:text-[17px]">
          {t('public.howTitle')}
        </h2>
        <p className="mt-1 text-[13px] text-neutral-500">{t('public.howBody')}</p>
        <div className="mt-4 grid gap-3 sm:mt-5 sm:gap-4">
          {steps.map(([number, title, body]) => (
            <div key={number} className="grid grid-cols-[1.5rem_1fr] gap-2">
              <span className="text-[12px] font-medium text-neutral-400">{number}</span>
              <span>
                <strong className="block text-[13px] font-medium text-neutral-800">
                  {t(title as WebTranslationKey)}
                </strong>
                <span className="mt-0.5 block text-[12px] leading-relaxed text-neutral-500">
                  {t(body as WebTranslationKey)}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
