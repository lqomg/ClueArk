const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 3000;

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

export async function checkUrlReachable(rawUrl: string): Promise<{ ok: boolean; normalized: string | null }> {
  const parsed = normalizeUrl(rawUrl);
  if (!parsed) {
    return { ok: false, normalized: null };
  }
  const normalized = parsed.toString();
  let current = normalized;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    for (let i = 0; i < MAX_REDIRECTS; i++) {
      let res = await fetchWithTimeout(current, 'HEAD', controller.signal).catch(() => null as unknown as Response);
      if (!res || res.status === 405 || res.status === 501) {
        res = await fetchWithTimeout(current, 'GET', controller.signal);
      }
      if (res.status >= 200 && res.status < 400) {
        return { ok: true, normalized: current };
      }
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (!loc) return { ok: false, normalized: current };
        const next = new URL(loc, current).toString();
        current = next;
        continue;
      }
      return { ok: false, normalized: current };
    }
    return { ok: false, normalized: current };
  } catch {
    return { ok: false, normalized: current };
  } finally {
    clearTimeout(timer);
  }
}

export function isValidHttpUrl(raw: string): boolean {
  return normalizeUrl(raw) != null;
}
