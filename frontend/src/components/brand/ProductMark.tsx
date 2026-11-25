import { useTranslation } from 'react-i18next';
import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '@/lib/cn';

/** 浅底用带深色底板的完整标；勿用 /clueark-mark.svg（奶油色透明底，白底上几乎看不见）。 */
const BRAND_ICON = '/clueark-icon.svg';

const variants = {
  sidebar: {
    gap: 'gap-1.5',
    text: 'brand-lockup whitespace-nowrap text-[1.02rem] font-semibold tracking-[0.03em]',
    imgClass: 'h-6 w-6 rounded-[6px]',
  },
  auth: {
    gap: 'gap-2.5',
    text: 'brand-lockup text-[22px] font-semibold tracking-wide',
    imgClass: 'h-9 w-9 shrink-0 rounded-[10px]',
  },
  compact: {
    gap: 'gap-1.5',
    text: 'brand-lockup text-sm font-semibold tracking-wide',
    imgClass: 'h-6 w-6 shrink-0 rounded-[6px]',
  },
} as const;

export type ProductMarkVariant = keyof typeof variants;

export function ProductMark({
  variant,
  to,
  className,
}: {
  variant: ProductMarkVariant;
  to: LinkProps['to'];
  className?: string;
}) {
  const { t } = useTranslation();
  const v = variants[variant];
  const imgSize = variant === 'auth' ? 36 : 24;
  return (
    <Link
      to={to}
      aria-label={t('brand.ariaLabel')}
      title={t('brand.ariaLabel')}
      className={cn('inline-flex items-center transition-all hover:opacity-90', v.gap, className)}
    >
      <img
        src={BRAND_ICON}
        alt=""
        width={imgSize}
        height={imgSize}
        className={v.imgClass}
        decoding="async"
      />
      <span className={v.text}>
        {t('brand.nameLeading')}
        {t('brand.nameAccent')}
      </span>
    </Link>
  );
}
