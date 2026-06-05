import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getWebLocale, setWebLocale, type WebSupportedLocale } from '@/lib/localeStorage';
import { en } from './locales/en';
import { zhCN } from './locales/zh-CN';
import { ja } from './locales/ja';
import { ko } from './locales/ko';

const resources = {
  en: { translation: en },
  'zh-CN': { translation: zhCN },
  ja: { translation: ja },
  ko: { translation: ko },
};

const initialLocale = getWebLocale();

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLocale,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export function changeWebLanguage(locale: WebSupportedLocale): void {
  setWebLocale(locale);
  void i18n.changeLanguage(locale);
}

export default i18n;
