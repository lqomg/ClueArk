import { ChevronDown, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { changeWebLanguage } from '@/i18n';
import { normalizeLocale, type WebSupportedLocale } from '@/lib/localeStorage';

const LOCALE_OPTIONS: ReadonlyArray<{ value: WebSupportedLocale; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'zh-CN', label: '简体中文' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
];

type Props = {
  className?: string;
  variant?: 'public' | 'app';
};

export function LanguageSwitcher({ className = '', variant = 'app' }: Props) {
  const { i18n } = useTranslation();
  const current = normalizeLocale(i18n.language);

  function onChange(next: WebSupportedLocale) {
    changeWebLanguage(next, { persist: variant !== 'public' });
  }

  return (
    <label className={`relative inline-flex items-center ${className}`}>
      <span className="sr-only">Language</span>
      <Globe className="pointer-events-none absolute left-2.5 size-3.5 text-neutral-400" aria-hidden />
      <select
        value={current}
        onChange={(event) => onChange(event.target.value as WebSupportedLocale)}
        className="min-h-8 cursor-pointer appearance-none rounded-full border border-neutral-200 bg-white pl-8 pr-7 text-[12px] font-medium text-neutral-700 outline-none transition hover:border-neutral-400 focus:border-neutral-400"
        aria-label="Language"
      >
        {LOCALE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 size-3.5 text-neutral-400"
        aria-hidden
      />
    </label>
  );
}
