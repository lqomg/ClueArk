const DEFAULT_UA = 'ClueArkCrawler/1.0';
const DEFAULT_TIMEOUT_MS = 20_000;

export type FetchHtmlOptions = {
  timeoutMs?: number;
  userAgent?: string;
};

export async function fetchHtml(url: string, options: FetchHtmlOptions = {}): Promise<string> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const userAgent = options.userAgent ?? DEFAULT_UA;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': userAgent,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    return html;
  } finally {
    clearTimeout(timer);
  }
}
