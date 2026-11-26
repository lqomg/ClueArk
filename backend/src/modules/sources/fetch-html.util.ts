const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const DEFAULT_TIMEOUT_MS = 20_000;

export type FetchHtmlResult = {
  ok: boolean;
  finalUrl: string;
  html: string;
  status?: number;
  error?: string;
};

/** 跟随重定向拉取列表页 HTML（供 LLM 选器 / 本地验收） */
export async function fetchHtmlPage(
  rawUrl: string,
  opts?: { timeoutMs?: number; userAgent?: string },
): Promise<FetchHtmlResult> {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const userAgent = opts?.userAgent ?? DEFAULT_UA;
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { ok: false, finalUrl: rawUrl, html: '', error: 'invalid_url' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, finalUrl: parsed.toString(), html: '', error: 'invalid_url' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(parsed.toString(), {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': userAgent,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });
    const finalUrl = res.url || parsed.toString();
    if (!res.ok) {
      return { ok: false, finalUrl, html: '', status: res.status, error: `http_${res.status}` };
    }
    const html = await res.text();
    if (!html.trim()) {
      return { ok: false, finalUrl, html: '', status: res.status, error: 'empty_html' };
    }
    return { ok: true, finalUrl, html, status: res.status };
  } catch (err) {
    const aborted = typeof err === 'object' && err !== null && (err as { name?: string }).name === 'AbortError';
    return {
      ok: false,
      finalUrl: parsed.toString(),
      html: '',
      error: aborted ? 'timeout' : err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}
