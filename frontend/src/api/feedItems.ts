import { http } from './http';
import { getWebLocale } from '@/lib/localeStorage';

export interface FeedItemTranslationResponse {
  feedItemId: string;
  locale: string;
  title: string;
  summary: string;
  cached: boolean;
}

export async function getFeedItemTranslation(
  feedItemId: string,
  locale = getWebLocale(),
): Promise<FeedItemTranslationResponse> {
  const { data } = await http.get<FeedItemTranslationResponse>(
    `/feed-items/${encodeURIComponent(feedItemId)}/translation`,
    { params: { locale } },
  );
  return data;
}
