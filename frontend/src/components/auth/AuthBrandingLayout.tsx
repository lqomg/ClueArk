import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { GithubRepoLink } from '@/components/GithubRepoLink';
import { ProductMark } from '@/components/brand/ProductMark';
import { EnvironmentNoticeInline } from '@/components/layout/EnvironmentNotice';

/** 全页（忘记密码等）米色品牌页 */
const brandTone = {
  inputClass:
    'w-full rounded-none px-3 py-3 bg-[#f3ead8] border border-[#3a2416] text-[#2b1810] placeholder:text-[#2b1810]/40 focus:outline-none focus:ring-1 focus:ring-[#3a2416]/25 transition text-sm',
  primaryBtnClass:
    'relative w-full py-3 bg-[#3a2416] text-[#f1e7cf] font-semibold text-sm tracking-wide hover:brightness-110 active:brightness-95 transition disabled:opacity-50',
  outlineBtnClass:
    'relative w-full py-3 border border-[#3a2416] bg-[#f7f0e2] text-[#2b1810] font-semibold text-sm tracking-wide transition hover:bg-[#f3ead8] active:opacity-90 disabled:opacity-50',
  sendCodeBtnClass:
    'inline-flex shrink-0 select-none items-center justify-center self-stretch border border-[#3a2416] bg-[#f3ead8] px-2.5 text-[11px] font-semibold text-[#2b1810] transition hover:bg-[#f7f0e2] active:opacity-90 disabled:pointer-events-none disabled:opacity-40 sm:px-3 sm:text-xs',
  fieldLabelClass: 'block text-sm font-medium text-[#2b1810]',
  dividerBgClass: 'bg-[#f7f0e2]',
  dividerLineClass: 'border-[#3a2416]/20',
  linkClass:
    'font-medium text-[#3a2416] underline underline-offset-[3px] decoration-[#3a2416]/45 transition-opacity hover:decoration-[#3a2416] hover:opacity-80',
  navMutedClass: 'text-[rgba(43,24,16,0.52)]',
  tabActiveClass:
    'text-[#2b1810] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#3a2416]',
  tabInactiveClass: 'text-[rgba(43,24,16,0.45)] hover:text-[#2b1810]',
} as const;

/** 产品内弹层：白底中性 */
const appTone = {
  inputClass:
    'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-900/10 disabled:opacity-50',
  primaryBtnClass:
    'btn-primary relative w-full rounded-lg py-2.5 text-sm font-medium tracking-wide disabled:opacity-50',
  outlineBtnClass:
    'relative w-full rounded-lg border border-neutral-200 bg-white py-2.5 text-sm font-medium tracking-wide text-neutral-800 transition hover:bg-neutral-50 active:bg-neutral-100 disabled:opacity-50',
  sendCodeBtnClass:
    'inline-flex shrink-0 select-none items-center justify-center self-stretch rounded-lg border border-neutral-200 bg-white px-2.5 text-[11px] font-medium text-neutral-700 transition hover:bg-neutral-50 active:bg-neutral-100 disabled:pointer-events-none disabled:opacity-40 sm:px-3 sm:text-xs',
  fieldLabelClass: 'block text-[13px] font-medium text-neutral-700',
  dividerBgClass: 'bg-white',
  dividerLineClass: 'border-neutral-200',
  linkClass:
    'font-medium text-neutral-700 underline underline-offset-[3px] decoration-neutral-300 transition hover:text-neutral-950 hover:decoration-neutral-600',
  navMutedClass: 'text-neutral-400',
  tabActiveClass:
    'text-neutral-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-neutral-900',
  tabInactiveClass: 'text-neutral-400 hover:text-neutral-700',
} as const;

export type AuthFormTone = 'brand' | 'app';

export function getAuthFormTone(tone: AuthFormTone = 'brand') {
  return tone === 'app' ? appTone : brandTone;
}

const inputClass = brandTone.inputClass;
const primaryBtnClass = brandTone.primaryBtnClass;
const outlineBtnClass = brandTone.outlineBtnClass;
const sendCodeBtnClass = brandTone.sendCodeBtnClass;
const inputFlexClass = `${brandTone.inputClass} min-w-0 flex-1`;
const fieldLabelClass = brandTone.fieldLabelClass;

export {
  fieldLabelClass,
  inputClass,
  inputFlexClass,
  outlineBtnClass,
  primaryBtnClass,
  sendCodeBtnClass,
  brandTone,
  appTone,
};

export function AuthBrandingLayout({
  title,
  subtitle,
  children,
  showLegalFooter = true,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  showLegalFooter?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="grid min-h-dvh bg-[#f7f0e2] font-sans text-[#2b1810] md:grid-cols-2">
      <aside className="hidden min-h-full flex-col justify-between bg-[#3a2416] p-10 text-[#f1e7cf] md:flex">
        <ProductMark variant="auth" to="/" className="text-[#f1e7cf]" />
        <div>
          <p className="font-serif text-[34px] font-semibold leading-[1.25] tracking-wide whitespace-pre-line">
            {t('auth.heroTitle')}
          </p>
          <div className="mt-5 h-0.5 w-12 bg-[#f1e7cf]" />
          <p className="mt-5 max-w-[18rem] text-[15px] leading-relaxed whitespace-pre-line text-[#f1e7cf]/90">
            {t('auth.heroSub')}
          </p>
        </div>
        <p className="text-[13px] font-semibold tracking-wide">clueark.com</p>
      </aside>

      <div className="flex min-h-dvh flex-col justify-center px-6 py-10 md:px-8">
        <div className="mx-auto w-full max-w-[24rem]">
          <div className="mb-4 md:hidden">
            <ProductMark variant="compact" to="/" className="text-[#2b1810]" />
          </div>
          <div className="mb-5 space-y-1.5">
            <h1 className="font-serif text-3xl font-semibold tracking-wide text-[#2b1810] md:text-[32px]">
              {title}
            </h1>
            <p className="text-[13px] leading-relaxed text-[rgba(43,24,16,0.62)]">{subtitle}</p>
          </div>
          {children}
          {showLegalFooter ? (
            <div className="mt-6 space-y-3">
              <EnvironmentNoticeInline />
              <div className="flex justify-center">
                <GithubRepoLink className="text-[#3a2416]/55 hover:text-[#3a2416] [&_span]:text-[#3a2416]/45" />
              </div>
            </div>
          ) : (
            <div className="mt-6 flex justify-center">
              <GithubRepoLink className="text-[#3a2416]/55 hover:text-[#3a2416] [&_span]:text-[#3a2416]/45" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
