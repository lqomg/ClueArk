import { useTranslation } from 'react-i18next';

export function LegalPrivacyPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-sm leading-relaxed text-ark-muted">
      <h1 className="text-xl font-semibold text-ark-text">{t('legal.privacyTitle')}</h1>
      <p className="mt-4">{t('legal.privacyBody')}</p>
    </div>
  );
}
