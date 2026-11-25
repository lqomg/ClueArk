import { Link } from 'react-router-dom';
import { ArrowUpRight, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ProductMark } from '@/components/brand/ProductMark';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';

type Props = {
  loggedIn: boolean;
  onCreate: () => void;
};

const ANCHORS = [
  { href: '#manifesto', labelKey: 'public.manifestoEyebrow' as const },
  { href: '#how', labelKey: 'public.navMethod' as const },
  { href: '#faq', labelKey: 'public.faqTitle' as const },
];

export function PublicHeader({ loggedIn, onCreate }: Props) {
  const { t } = useTranslation();

  return (
    <header className="public-header sticky top-0 z-20 border-b bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-12 w-full max-w-[1600px] items-center justify-between gap-2 px-4 sm:h-14 sm:gap-4 sm:px-6 lg:px-10">
        <ProductMark variant="compact" to="/" className="public-brand shrink-0 sm:hidden" />
        <ProductMark variant="sidebar" to="/" className="public-brand hidden shrink-0 sm:inline-flex" />
        <nav
          className="hidden items-center gap-6 text-[13px] text-neutral-500 md:flex"
          aria-label={t('public.navLabel')}
        >
          {ANCHORS.map((item) => (
            <a key={item.href} href={item.href} className="transition hover:text-neutral-900">
              {t(item.labelKey)}
            </a>
          ))}
        </nav>
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <LanguageSwitcher variant="public" />
          {loggedIn ? (
            <Link
              to="/app/home"
              className="btn-primary inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium sm:px-3.5"
            >
              <span className="max-w-[7.5rem] truncate sm:max-w-none">{t('public.openWorkspace')}</span>
              <ArrowUpRight className="size-3.5 shrink-0" aria-hidden />
            </Link>
          ) : (
            <button
              type="button"
              onClick={onCreate}
              className="btn-primary inline-flex min-h-8 max-w-[9.5rem] items-center gap-1 rounded-full px-2.5 text-[12px] font-medium sm:max-w-none sm:px-3.5"
            >
              <Plus className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{t('public.startCreate')}</span>
              <ArrowUpRight className="hidden size-3.5 shrink-0 sm:inline" aria-hidden />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
