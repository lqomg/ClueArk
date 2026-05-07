import { Link, type LinkProps } from 'react-router-dom';

/** 与 `public/favicon.png` 同源，避免将大图打入 JS bundle */
const PRODUCT_ICON_SRC = '/favicon.png';

const variants = {
  sidebar: {
    gap: 'gap-1.5',
    text: 'text-xl font-black tracking-tighter',
    imgClass: 'h-5 w-5',
  },
  auth: {
    gap: 'gap-2',
    text: 'text-2xl font-black tracking-tighter',
    imgClass: 'h-7 w-7 shrink-0 md:h-8 md:w-8',
  },
  compact: {
    gap: 'gap-1.5',
    text: 'text-sm font-bold tracking-tight',
    imgClass: 'h-5 w-5 shrink-0',
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
  const v = variants[variant];
  return (
    <Link
      to={to}
      aria-label="ClueArk 线索方舟"
      className={`inline-flex items-center ${v.gap} transition-all hover:opacity-90 ${className ?? ''}`}
    >
      <span className={v.text}>线索</span>
      <img
        src={PRODUCT_ICON_SRC}
        alt=""
        width={variant === 'auth' ? 32 : 20}
        height={variant === 'auth' ? 32 : 20}
        className={`rounded-md ${v.imgClass}`}
        decoding="async"
      />
      <span className={`${v.text} text-ark-accent`}>方舟</span>
    </Link>
  );
}
