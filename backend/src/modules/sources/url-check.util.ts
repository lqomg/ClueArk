const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 3000;

/** RSS 等最终必走 GET 拉取的场景用 get_only；其余 URL 仍优先 HEAD 省流量 */
export type UrlReachProbeMode = 'head_then_get' | 'get_only';

export type UrlReachabilityResult = {
  ok: boolean;
  normalized: string | null;
  finalUrl?: string;
  method?: 'HEAD' | 'GET';
  status?: number;
  headStatus?: number;
  redirectsFollowed?: number;
  elapsedMs?: number;
  error?: { name: string; message: string; code?: string };
  reason?:
    | 'invalid_url'
    | 'timeout'
    | 'network_error'
    | 'http_status'
    | 'head_http_status'
    | 'redirect_missing_location'
    | 'too_many_redirects';
};

function normalizeUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, method: 'HEAD' | 'GET', signal: AbortSignal): Promise<Response> {
  return fetch(url, {
    method,
    redirect: 'manual',
    signal,
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
      accept: '*/*',
    },
  });
}

function toErrorMeta(err: unknown): UrlReachabilityResult['error'] {
  if (!err || typeof err !== 'object') return { name: 'Error', message: String(err) };
  const e = err as { name?: unknown; message?: unknown; code?: unknown };
  return {
    name: typeof e.name === 'string' ? e.name : 'Error',
    message: typeof e.message === 'string' ? e.message : String(err),
    code: typeof e.code === 'string' ? e.code : undefined,
  };
}

async function fetchReachResponse(
  url: string,
  signal: AbortSignal,
  mode: UrlReachProbeMode,
): Promise<{ res: Response | null; method: 'HEAD' | 'GET'; headStatus?: number }> {
  if (mode === 'get_only') {
    const res = await fetchWithTimeout(url, 'GET', signal).catch(() => null);
    return { res, method: 'GET' };
  }

  let method: 'HEAD' | 'GET' = 'HEAD';
  let headStatus: number | undefined;
  let res: Response | null = await fetchWithTimeout(url, 'HEAD', signal).catch(() => null);
  if (!res || res.status === 405 || res.status === 501) {
    method = 'GET';
    res = await fetchWithTimeout(url, 'GET', signal).catch(() => null);
  } else if (res.status >= 400) {
    headStatus = res.status;
    method = 'GET';
    res = await fetchWithTimeout(url, 'GET', signal).catch(() => null);
  }
  return { res, method, headStatus };
}

export async function checkUrlReachable(
  rawUrl: string,
  mode: UrlReachProbeMode = 'head_then_get',
): Promise<UrlReachabilityResult> {
  const parsed = normalizeUrl(rawUrl);
  if (!parsed) {
    return { ok: false, normalized: null, reason: 'invalid_url' };
  }
  const normalized = parsed.toString();
  let current = normalized;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const start = Date.now();
  try {
    for (let i = 0; i < MAX_REDIRECTS; i++) {
      const { res, method, headStatus } = await fetchReachResponse(current, controller.signal, mode);
      if (!res) {
        const aborted = controller.signal.aborted;
        return {
          ok: false,
          normalized: current,
          finalUrl: current,
          method,
          ...(headStatus ? { headStatus } : {}),
          redirectsFollowed: i,
          elapsedMs: Date.now() - start,
          reason: aborted ? 'timeout' : 'network_error',
        };
      }
      if (res.status === 304) {
        return {
          ok: true,
          normalized: current,
          finalUrl: current,
          method,
          status: res.status,
          ...(headStatus ? { headStatus } : {}),
          redirectsFollowed: i,
          elapsedMs: Date.now() - start,
        };
      }
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (!loc) {
          return {
            ok: false,
            normalized: current,
            finalUrl: current,
            method,
            status: res.status,
            ...(headStatus ? { headStatus } : {}),
            redirectsFollowed: i,
            elapsedMs: Date.now() - start,
            reason: 'redirect_missing_location',
          };
        }
        const next = new URL(loc, current).toString();
        current = next;
        continue;
      }
      if (res.status >= 200 && res.status < 300) {
        return {
          ok: true,
          normalized: current,
          finalUrl: current,
          method,
          status: res.status,
          ...(headStatus ? { headStatus } : {}),
          redirectsFollowed: i,
          elapsedMs: Date.now() - start,
        };
      }
      return {
        ok: false,
        normalized: current,
        finalUrl: current,
        method,
        status: res.status,
        ...(headStatus ? { headStatus } : {}),
        redirectsFollowed: i,
        elapsedMs: Date.now() - start,
        reason: 'http_status',
      };
    }
    return {
      ok: false,
      normalized: current,
      finalUrl: current,
      redirectsFollowed: MAX_REDIRECTS,
      elapsedMs: Date.now() - start,
      reason: 'too_many_redirects',
    };
  } catch (err) {
    return {
      ok: false,
      normalized: current,
      finalUrl: current,
      redirectsFollowed: undefined,
      elapsedMs: Date.now() - start,
      reason: controller.signal.aborted ? 'timeout' : 'network_error',
      error: toErrorMeta(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

export function isValidHttpUrl(raw: string): boolean {
  return normalizeUrl(raw) != null;
}
