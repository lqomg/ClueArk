import { Building2, Cpu, Landmark, UserRound, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { WebTranslationKey } from '@/i18n/locales/en';

const EXAMPLES: ReadonlyArray<{
  category: WebTranslationKey;
  title: WebTranslationKey;
  desc: WebTranslationKey;
  prompt: WebTranslationKey;
  icon: LucideIcon;
}> = [
  {
    category: 'public.example1Category',
    title: 'public.example1Title',
    desc: 'public.example1Desc',
    prompt: 'public.example1Prompt',
    icon: UserRound,
  },
  {
    category: 'public.example2Category',
    title: 'public.example2Title',
    desc: 'public.example2Desc',
    prompt: 'public.example2Prompt',
    icon: Cpu,
  },
  {
    category: 'public.example3Category',
    title: 'public.example3Title',
    desc: 'public.example3Desc',
    prompt: 'public.example3Prompt',
    icon: Building2,
  },
  {
    category: 'public.example4Category',
    title: 'public.example4Title',
    desc: 'public.example4Desc',
    prompt: 'public.example4Prompt',
    icon: Landmark,
  },
];

type Props = {
  onSelect?: (prompt: string) => void;
};

export function PublicExamples({ onSelect }: Props) {
  const { t } = useTranslation();

  return (
    <section id="examples" className="mx-auto w-full max-w-[1120px] scroll-mt-28">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
          {t('public.examplesEyebrow')}
        </p>
        <h2 className="mt-1.5 text-[16px] font-semibold tracking-tight text-neutral-900 sm:text-[17px]">
          {t('public.examplesTitle')}
        </h2>
      </div>

      <ul className="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-4">
        {EXAMPLES.map((example) => {
          const Icon = example.icon;
          return (
            <li key={example.title}>
              <button
                type="button"
                onClick={() => onSelect?.(t(example.prompt))}
                className="flex h-full w-full items-start gap-3 rounded-2xl border border-neutral-100 bg-white p-4 text-left transition hover:border-neutral-300 hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)] sm:gap-3.5 sm:p-5"
              >
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-neutral-50 text-neutral-500">
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-neutral-400">{t(example.category)}</p>
                  <p className="mt-0.5 text-[14px] font-medium leading-5 tracking-[-0.01em] text-neutral-900">
                    {t(example.title)}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">{t(example.desc)}</p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
