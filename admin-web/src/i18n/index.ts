import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getAdminLocale, setAdminLocale, type AdminSupportedLocale } from '@/i18n/localeStorage';
import { en } from '@/i18n/locales/en';
import { zhCN } from '@/i18n/locales/zh-CN';
import { ja } from '@/i18n/locales/ja';
import { ko } from '@/i18n/locales/ko';

const resources = {
  en: { translation: en },
  'zh-CN': { translation: zhCN },
  ja: { translation: ja },
  ko: { translation: ko },
};

void i18n.use(initReactI18next).init({
  resources,
  lng: getAdminLocale(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export function changeAdminLanguage(locale: AdminSupportedLocale): void {
  setAdminLocale(locale);
  void i18n.changeLanguage(locale);
}

export default i18n;
