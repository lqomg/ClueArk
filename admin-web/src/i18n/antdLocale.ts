import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import jaJP from 'antd/locale/ja_JP';
import koKR from 'antd/locale/ko_KR';
import type { Locale } from 'antd/es/locale';
import type { AdminSupportedLocale } from '@/i18n/localeStorage';

export function getAntdLocale(locale: AdminSupportedLocale): Locale {
  switch (locale) {
    case 'zh-CN':
      return zhCN;
    case 'ja':
      return jaJP;
    case 'ko':
      return koKR;
    default:
      return enUS;
  }
}
