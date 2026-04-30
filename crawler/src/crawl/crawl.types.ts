export type CrawlResultEntry = {
  link: string;
  title: string;
  summary: string;
  publishedAt: string | null;
  guid: string;
};

export type CrawlResult = {
  sourceId: string;
  crawlRunId: string;
  crawledAt: string;
  items: CrawlResultEntry[];
  errors?: string[];
};

export type SelectorProfile = {
  item: string;
  link: string;
  title: string;
  summary?: string;
  date?: string;
};
