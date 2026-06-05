import type { WebSupportedLocale } from '@/lib/localeStorage';

export interface MeResponse {
  _id: string;
  email: string;
  username: string;
  timeZone: string;
  locale: WebSupportedLocale;
}
