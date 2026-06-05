import { useEffect, useState } from 'react';
import { ConfigProvider } from 'antd';
import { useTranslation } from 'react-i18next';
import { getAntdLocale } from '@/i18n/antdLocale';
import { normalizeAdminLocale, type AdminSupportedLocale } from '@/i18n/localeStorage';

export function AppLocaleProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const [locale, setLocale] = useState<AdminSupportedLocale>(() =>
    normalizeAdminLocale(i18n.language),
  );

  useEffect(() => {
    const onChange = (lng: string) => setLocale(normalizeAdminLocale(lng));
    i18n.on('languageChanged', onChange);
    return () => {
      i18n.off('languageChanged', onChange);
    };
  }, [i18n]);

  return (
    <ConfigProvider
      locale={getAntdLocale(locale)}
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
