import { useEffect, useState } from 'react';
import { Flame, Globe, Rss } from 'lucide-react';
import type { SourceKind } from '@/types/models';

const SIZE_BOX: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-8 w-8 min-h-8 min-w-8 text-[11px]',
  md: 'h-10 w-10 min-h-10 min-w-10 text-sm',
  lg: 'h-12 w-12 min-h-12 min-w-12 text-base',
};

const SIZE_BADGE: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-4 w-4 [&_svg]:size-2.5',
  md: 'h-[18px] w-[18px] [&_svg]:size-2.5',
  lg: 'h-5 w-5 [&_svg]:size-3',
};

function firstGlyph(name: string): string {
  const t = name.trim();
  if (!t) return '?';
  const ch = [...t][0]!;
  return /[a-z]/i.test(ch) ? ch.toUpperCase() : ch;
}

function KindIcon({ kind, size }: { kind: SourceKind; size: number }) {
  const stroke = 2.4;
  if (kind === 'web') return <Globe size={size} strokeWidth={stroke} className="text-ark-accent" aria-hidden />;
  if (kind === 'rss') return <Rss size={size} strokeWidth={stroke} className="text-ark-accent" aria-hidden />;
  if (kind === 'hot_api') return <Flame size={size} strokeWidth={stroke} className="text-orange-400" aria-hidden />;
  return <Globe size={size} strokeWidth={stroke} className="text-ark-accent" aria-hidden />;
}

const KIND_TITLE: Record<SourceKind, string> = {
  web: '网站',
  rss: 'RSS',
  hot_api: '热点',
};

export function SourceAvatar({
  kind,
  name,
  avatarUrl,
  size = 'md',
  className = '',
}: {
  kind: SourceKind;
  name: string;
  /** 站内相对路径；加载失败时回退为首字头像 */
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const [imgBroken, setImgBroken] = useState(false);
  const url = (avatarUrl ?? '').trim();

  useEffect(() => {
    setImgBroken(false);
  }, [url]);

  const letter = firstGlyph(name);
  const iconPx = size === 'lg' ? 12 : size === 'md' ? 10 : 9;
  const title = `${KIND_TITLE[kind]} · ${name.trim() || '信源'}`;

  const shell = `relative inline-flex shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-ark-accent/25 via-white/10 to-ark-sidebar ring-1 ring-ark-accent/40 ${SIZE_BOX[size]} items-center justify-center font-black tracking-tight ${className}`;

  if (url && !imgBroken) {
    return (
      <div className={shell} title={title} role="img" aria-label={title}>
        <img
          src={url}
          alt=""
          className="absolute inset-0 size-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setImgBroken(true)}
        />
        <span
          className={`absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full border border-ark-border bg-ark-sidebar shadow-md ${SIZE_BADGE[size]}`}
          aria-hidden
        >
          <KindIcon kind={kind} size={iconPx} />
        </span>
      </div>
    );
  }

  return (
    <div className={shell} title={title} role="img" aria-label={title}>
      <span
        aria-hidden
        className="select-none bg-gradient-to-br from-cyan-100 via-ark-accent to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(0,242,255,0.35)]"
      >
        {letter}
      </span>
      <span
        className={`absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full border border-ark-border bg-ark-sidebar shadow-md ${SIZE_BADGE[size]}`}
        aria-hidden
      >
        <KindIcon kind={kind} size={iconPx} />
      </span>
    </div>
  );
}
